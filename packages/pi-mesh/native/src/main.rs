//! pi-mesh sidecar — singleton daemon with unix socket multiplexing.
//!
//! One sidecar per machine, shared by all pi sessions.
//! Listens on ~/.pi/mesh.sock for JSON-line connections.
//! Each connection gets its own subscriptions multiplexed
//! through a single Zenoh session.
//!
//! Lifecycle:
//!   - First pi session spawns the sidecar (if not running)
//!   - All sessions connect via unix socket
//!   - Sidecar is independent of client lifetime: it keeps serving with
//!     zero connected clients and stops only on an explicit shutdown (SIGTERM)
//!
//! Single instance (kal-kbu1f9xy): the bind phase is serialized by a
//! process-shared advisory OS lock (flock) on ~/.pi/mesh.start.lock. The
//! kernel releases the lock when the holder dies, so there is no stale-lock
//! state to resolve, no timeout, and no elapsed-time winner. A candidate
//! re-checks whether the socket is served only AFTER acquiring the lock and
//! pidfile/socket BEFORE releasing it.

use std::{collections::HashMap, os::fd::AsRawFd, path::PathBuf, sync::Arc};

use serde::{Deserialize, Serialize};
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    net::{UnixListener, UnixStream},
    sync::mpsc,
};

// ── Protocol types ───────────────────────────────────────────────────────────

#[derive(Deserialize)]
#[serde(tag = "cmd", rename_all = "snake_case")]
enum Command {
    Publish { topic: String, payload: String },
    Subscribe { topic: String },
    Unsubscribe { id: i32 },
    Close,
}

#[derive(Serialize, Clone)]
#[serde(tag = "ev", rename_all = "snake_case")]
enum Event {
    Ready { zid: String, client_id: String },
    Subscribed { id: i32 },
    Msg { topic: String, payload: String },
    Error { msg: String },
}

// ── Per-client and internal types ────────────────────────────────────────────

struct ClientCommand {
    client_id: u64,
    cmd: Command,
}

enum InternalEvent {
    SubMsg {
        client_id: u64,
        topic: String,
        payload: String,
    },
}

// ── Socket path ──────────────────────────────────────────────────────────────

fn socket_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    PathBuf::from(home).join(".pi").join("mesh.sock")
}

fn pid_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    PathBuf::from(home).join(".pi").join("mesh.pid")
}

fn lock_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    PathBuf::from(home).join(".pi").join("mesh.start.lock")
}

/// The pid recorded in the pidfile, if the file exists and parses.
fn read_pidfile_holder() -> Option<i32> {
    let contents = std::fs::read_to_string(pid_path()).ok()?;
    contents.trim().parse::<i32>().ok()
}

/// Authoritative serving check: the socket accepts a connection. The
/// pidfile is deliberately NOT part of this predicate — it is one mutable
/// record that an operator tool or a repair path can delete or rewrite at
/// any moment, and requiring it to name a live pid made a genuinely
/// serving daemon read as "down". The next candidate then unlinked that
/// daemon's socket and bound a parallel one: two sidecars, each with its
/// own client set (observed live 2026-09-25). A stale socket left by a
/// SIGKILLed sidecar still reads correctly — connect() fails with
/// ECONNREFUSED (kal-0suu3dur).
fn sidecar_is_serving() -> bool {
    std::os::unix::net::UnixStream::connect(socket_path()).is_ok()
}

/// Inode currently named by `path`, if it exists. The path inode is the
/// daemon's singleton identity: fstat() on a bound Unix socket reports a
/// kernel socket inode on macOS, not the file's (verified 2026-09-25).
fn socket_inode(path: &std::path::Path) -> Option<u64> {
    use std::os::unix::fs::MetadataExt;
    std::fs::metadata(path).ok().map(|meta| meta.ino())
}

/// OS advisory lock guarding the bind phase (kal-kbu1f9xy). Held across
/// [re-check -> bind -> publish]; dropped explicitly at the publish boundary.
/// The kernel releases it if the holder dies — waiting candidates block on a
/// kernel event, never on a clock.
struct StartLock {
    file: std::fs::File,
}

fn acquire_start_lock() -> StartLock {
    std::fs::create_dir_all(lock_path().parent().unwrap()).ok();
    let file = std::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .open(&lock_path())
        .unwrap_or_else(|e| {
            eprintln!(
                "pi-mesh: cannot open start lock {}: {e}",
                lock_path().display()
            );
            std::process::exit(1);
        });
    // Blocking flock: waits on the kernel until a prior candidate's bind
    // phase completes. No timeout, no elapsed-time winner.
    let rc = unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_EX) };
    if rc != 0 {
        eprintln!(
            "pi-mesh: flock on {}: {}",
            lock_path().display(),
            std::io::Error::last_os_error()
        );
        std::process::exit(1);
    }
    StartLock { file }
}

impl Drop for StartLock {
    fn drop(&mut self) {
        // Explicit unlock; the kernel would release it on fd close anyway.
        // Holding the File is what keeps the lock held.
        unsafe { libc::flock(self.file.as_raw_fd(), libc::LOCK_UN) };
    }
}

fn write_pidfile() {
    let _ = std::fs::create_dir_all(pid_path().parent().unwrap());
    let _ = std::fs::write(pid_path(), std::process::id().to_string());
}

/// Remove only the files this process still owns. A candidate that bailed
/// before binding owns nothing; a served daemon owns the socket path only
/// while it still resolves to the inode it bound, and the pidfile only
/// while it still names this pid. Unconditional removal is how a FAILED
/// candidate once deleted a healthy daemon's socket — every client then
/// read "down", spawned another candidate, and the repair path fed a
/// self-sustaining spawn storm (observed live 2026-09-25).
fn cleanup_files(bound_ino: Option<u64>, pid: i32) {
    if let Some(ino) = bound_ino {
        if socket_inode(&socket_path()) == Some(ino) {
            let _ = std::fs::remove_file(socket_path());
        }
    }
    if read_pidfile_holder() == Some(pid) {
        let _ = std::fs::remove_file(pid_path());
    }
}

// ── Main ─────────────────────────────────────────────────────────────────────

/// What happened to this startup candidate — decides whether main may touch
/// the socket/pidfile (only a candidate that published owns them).
#[derive(PartialEq)]
enum CandidateOutcome {
    /// Another sidecar is already serving — left its files alone.
    ServingElsewhere,
    /// We published and served until graceful shutdown — clean up our files.
    Served,
    /// We bailed before publishing — stale state is ours to clean.
    Failed,
}

fn main() {
    // Fast path: a sidecar is already serving — exit without touching the lock.
    if sidecar_is_serving() {
        std::process::exit(0);
    }

    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .worker_threads(2)
        .build()
        .expect("tokio runtime");

    // Inode of the socket this process bound, captured at publish time and
    // used by cleanup_files to verify ownership before removing anything.
    let mut bound_ino: Option<u64> = None;

    let outcome = rt.block_on(async {
        // Parse config from argv[1] if provided, otherwise default.
        let config_str = std::env::args().nth(1).unwrap_or_default();
        let config = if config_str.is_empty() {
            zenoh::Config::default()
        } else {
            zenoh::Config::from_json5(&config_str).unwrap_or_else(|e| {
                eprintln!("pi-mesh: bad config: {e}");
                zenoh::Config::default()
            })
        };

        // Serialize startup across concurrent candidates (kal-kbu1f9xy):
        // one candidate at a time, blocking on the kernel until the previous
        // candidate publishes (or dies — the kernel releases the lock).
        let lock = acquire_start_lock();

        // Authoritative re-check UNDER the lock: a candidate that blocked
        // here may now be looking at a freshly published sidecar.
        if sidecar_is_serving() {
            drop(lock);
            return CandidateOutcome::ServingElsewhere;
        }

        // Broken recorded holder: the pidfile's process is alive but not
        // serving (a stale orphan or a crashed-in-flight singleton instance).
        // The nuke directive applies (kal-0suu3dur): kill the recorded holder,
        // then re-publish. This fires against a daemon orphaned by path
        // removal too, which is deliberate: its clients see the same thing
        // its own watchdog would produce a moment later, and only the nuke
        // resolves a serve loop wedged so hard that its tick can never run.
        if let Some(holder) = read_pidfile_holder() {
            if unsafe { libc::kill(holder, 0) == 0 } {
                unsafe { libc::kill(holder, libc::SIGKILL) };
                eprintln!("pi-mesh: killed broken singleton holder pid {holder} before rebind");
            }
        }

        // Publish this candidate's pid BEFORE the slow zenoh open: while it
        // is starting, the pidfile announces the candidate's existence, so
        // concurrent sessions' repair paths wait on it instead of publishing
        // over it. (cleanup_files removes it only while this pid owns it.)
        write_pidfile();

        let session = match zenoh::open(config).await {
            Ok(s) => Arc::new(s),
            Err(e) => {
                eprintln!("pi-mesh: zenoh open failed: {e}");
                return CandidateOutcome::Failed;
            }
        };
        let zid = session.zid().to_string();

        // Publish phase under the lock: stale socket removed, socket bound —
        // while the lock is held no other candidate can unlink/rebind.
        let sock_path = socket_path();
        let _ = std::fs::remove_file(&sock_path);
        let _ = std::fs::create_dir_all(sock_path.parent().unwrap());

        let listener = match UnixListener::bind(&sock_path) {
            Ok(l) => l,
            Err(e) => {
                eprintln!("pi-mesh: bind {}: {e}", sock_path.display());
                return CandidateOutcome::Failed;
            }
        };

        // Identity of the socket this process published: the filesystem
        // inode of the path, captured while the start lock is still held so
        // no other candidate can rebind it in between. fstat() on a bound
        // Unix socket is NOT usable on macOS — it reports a kernel socket
        // inode (fd 78019 vs path 912455546, verified 2026-09-25), so the
        // path inode is the only identity that can be compared later.
        let Some(ino) = socket_inode(&sock_path) else {
            eprintln!(
                "pi-mesh: {} vanished during publish — exiting",
                sock_path.display()
            );
            return CandidateOutcome::Failed;
        };
        bound_ino = Some(ino);
        eprintln!(
            "pi-mesh: listening on {} (zid={})",
            sock_path.display(),
            zid
        );
        // Publish complete — release the lock. Late candidates now see a
        // connectable socket and exit.
        drop(lock);

        run_serve(listener, zid, session, ino).await;
        CandidateOutcome::Served
    });

    if outcome != CandidateOutcome::ServingElsewhere {
        cleanup_files(bound_ino, std::process::id() as i32);
    }
}

async fn run_serve(
    listener: UnixListener,
    zid: String,
    session: Arc<zenoh::Session>,
    bound_ino: u64,
) {
    // Internal channels
    let (ev_tx, mut ev_rx) = mpsc::unbounded_channel::<InternalEvent>();
    let (cmd_tx, mut cmd_rx) = mpsc::unbounded_channel::<ClientCommand>();

    // Per-client output channels: client_id → sender
    let mut client_senders: HashMap<u64, mpsc::UnboundedSender<Event>> = HashMap::new();
    let mut next_client_id: u64 = 1;

    // Per-client resource tracking
    let mut client_sub_aborts: HashMap<u64, HashMap<i32, tokio::task::AbortHandle>> =
        HashMap::new();

    // Global counters
    let mut sub_counter: i32 = 0;

    // Singleton identity is the socket PATH: while we serve, the path must
    // keep naming the inode we published. If it stops — an operator removed it
    // and a candidate republished — this
    // path (an operator removed it and a candidate republished), this
    // process is an unreachable ghost holding clients that can never reach
    // the mesh — exit so they rejoin the current owner. This is ownership
    // liveness, not client-bound lifetime: it never fires while we own the
    // path, no matter how many clients are connected (2026-09-25).
    let mut ownership = tokio::time::interval(std::time::Duration::from_secs(5));

    loop {
        tokio::select! {
            _ = ownership.tick() => {
                if socket_inode(&socket_path()) != Some(bound_ino) {
                    eprintln!("pi-mesh: lost {} — exiting", socket_path().display());
                    break;
                }
                // Keep the holder record pointing at the daemon that owns the
                // path: an operator tool or a bailing candidate can remove or
                // overwrite it, and a missing record is what makes the next
                // candidate unable to recognise a broken holder.
                if read_pidfile_holder() != Some(std::process::id() as i32) {
                    write_pidfile();
                }
            }
            // Accept new client connections
            accepted = listener.accept() => {
                match accepted {
                    Ok((stream, _addr)) => {
                        let client_id = next_client_id;
                        next_client_id += 1;

                        let mesh_client_id = uuid::Uuid::new_v4().to_string();

                        let (client_ev_tx, client_ev_rx) = mpsc::unbounded_channel();
                        client_senders.insert(client_id, client_ev_tx.clone());
                        client_sub_aborts.insert(client_id, HashMap::new());

                        // Send ready event with unique client identity
                        let _ = client_ev_tx.send(Event::Ready { zid: zid.clone(), client_id: mesh_client_id.clone() });

                        let cmd_tx2 = cmd_tx.clone();
                        tokio::spawn(handle_client(client_id, stream, cmd_tx2, client_ev_rx));

                        eprintln!("pi-mesh: client {client_id} connected (mesh_id={mesh_client_id})");
                    }
                    Err(e) => eprintln!("pi-mesh: accept error: {e}"),
                }
            }

            // Process commands from clients
            cmd = cmd_rx.recv() => {
                let Some(ClientCommand { client_id, cmd }) = cmd else { break };
                match cmd {
                    Command::Publish { topic, payload } => {
                        if let Err(e) = session.put(&topic, payload.into_bytes()).await {
                            send_to_client(&client_senders, client_id,
                                Event::Error { msg: format!("publish: {e}") });
                        }
                    }

                    Command::Subscribe { topic } => {
                        match session.declare_subscriber(&topic).await {
                            Ok(subscriber) => {
                                sub_counter += 1;
                                let id = sub_counter;
                                let ev_tx2 = ev_tx.clone();
                                let cid = client_id;
                                let task = tokio::spawn(async move {
                                    while let Ok(sample) = subscriber.recv_async().await {
                                        let t = sample.key_expr().as_str().to_string();
                                        let p = String::from_utf8_lossy(
                                            &sample.payload().to_bytes()
                                        ).into_owned();
                                        let _ = ev_tx2.send(InternalEvent::SubMsg {
                                            client_id: cid, topic: t, payload: p,
                                        });
                                    }
                                });
                                if let Some(subs) = client_sub_aborts.get_mut(&client_id) {
                                    subs.insert(id, task.abort_handle());
                                }
                                send_to_client(&client_senders, client_id,
                                    Event::Subscribed { id });
                            }
                            Err(e) => send_to_client(&client_senders, client_id,
                                Event::Error { msg: format!("subscribe: {e}") }),
                        }
                    }

                    Command::Unsubscribe { id } => {
                        if let Some(subs) = client_sub_aborts.get_mut(&client_id) {
                            if let Some(abort) = subs.remove(&id) {
                                abort.abort();
                            }
                        }
                    }

                    Command::Close => {
                        // Client disconnecting — clean up its resources
                        cleanup_client(client_id, &mut client_senders, &mut client_sub_aborts);

                        eprintln!("pi-mesh: client {client_id} closed");
                    }
                }
            }

            // Route internal events to the correct client
            ev = ev_rx.recv() => {
                let Some(ev) = ev else { continue };
                match ev {
                    InternalEvent::SubMsg { client_id, topic, payload } => {
                        send_to_client(&client_senders, client_id,
                            Event::Msg { topic, payload });
                    }
                }
            }

        }
    }

    // Cleanup all clients
    for (cid, subs) in &client_sub_aborts {
        for (_, abort) in subs {
            abort.abort();
        }
        let _ = cid;
    }
}

// ── Client connection handler ────────────────────────────────────────────────

async fn handle_client(
    client_id: u64,
    stream: UnixStream,
    cmd_tx: mpsc::UnboundedSender<ClientCommand>,
    mut ev_rx: mpsc::UnboundedReceiver<Event>,
) {
    let (reader, mut writer) = stream.into_split();
    let mut lines = BufReader::new(reader).lines();

    loop {
        tokio::select! {
            // Read commands from client
            line = lines.next_line() => {
                match line {
                    Ok(Some(line)) => {
                        if line.trim().is_empty() { continue; }
                        match serde_json::from_str::<Command>(&line) {
                            Ok(cmd) => {
                                let is_close = matches!(cmd, Command::Close);
                                let _ = cmd_tx.send(ClientCommand { client_id, cmd });
                                if is_close { break; }
                            }
                            Err(e) => {
                                eprintln!("pi-mesh: client {client_id} bad command: {e}");
                            }
                        }
                    }
                    Ok(None) => break, // EOF — client disconnected
                    Err(_) => break,
                }
            }

            // Write events to client
            ev = ev_rx.recv() => {
                let Some(ev) = ev else { break; };
                let mut buf = serde_json::to_vec(&ev).unwrap_or_default();
                buf.push(b'\n');
                if writer.write_all(&buf).await.is_err() {
                    break; // write failed — client gone
                }
            }
        }
    }

    // Notify main loop this client is gone
    let _ = cmd_tx.send(ClientCommand {
        client_id,
        cmd: Command::Close,
    });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn send_to_client(
    senders: &HashMap<u64, mpsc::UnboundedSender<Event>>,
    client_id: u64,
    event: Event,
) {
    if let Some(tx) = senders.get(&client_id) {
        let _ = tx.send(event);
    }
}

fn cleanup_client(
    client_id: u64,
    senders: &mut HashMap<u64, mpsc::UnboundedSender<Event>>,
    sub_aborts: &mut HashMap<u64, HashMap<i32, tokio::task::AbortHandle>>,
) {
    senders.remove(&client_id);
    if let Some(subs) = sub_aborts.remove(&client_id) {
        for (_, abort) in subs {
            abort.abort();
        }
    }
}
