//! pi-mesh sidecar — singleton daemon with unix socket multiplexing.
//!
//! One sidecar per machine, shared by all pi sessions.
//! Listens on ~/.pi/mesh.sock for JSON-line connections.
//! Each connection gets its own subscriptions/queryables multiplexed
//! through a single Zenoh session.
//!
//! Lifecycle:
//!   - First pi session spawns the sidecar (if not running)
//!   - All sessions connect via unix socket
//!   - Sidecar stays alive until last client disconnects (+ grace period)
//!   - Or until explicit shutdown

use std::{
    collections::HashMap,
    path::PathBuf,
    sync::Arc,
    time::{Duration, Instant},
};

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
    Get { topic: String, payload: String, timeout_ms: Option<u32>, req_id: String },
    Serve { topic: String },
    Unserve { id: i32 },
    Reply { query_id: u64, payload: String },
    Close,
}

#[derive(Serialize, Clone)]
#[serde(tag = "ev", rename_all = "snake_case")]
enum Event {
    Ready { zid: String, client_id: String },
    Subscribed { id: i32 },
    Served { id: i32 },
    Msg { topic: String, payload: String },
    Query { query_id: u64, topic: String, payload: String },
    Reply { req_id: String, payload: String },
    Error { msg: String },
}

// ── Per-client and internal types ────────────────────────────────────────────

struct ClientCommand {
    client_id: u64,
    cmd: Command,
}

enum InternalEvent {
    SubMsg { client_id: u64, topic: String, payload: String },
    QueryIn { client_id: u64, query_id: u64, topic: String, payload: String, query: zenoh::query::Query },
    GetReply { client_id: u64, req_id: String, payload: String },
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

fn is_sidecar_running() -> bool {
    let pid_file = pid_path();
    if let Ok(contents) = std::fs::read_to_string(&pid_file) {
        if let Ok(pid) = contents.trim().parse::<i32>() {
            // Check if process is alive
            unsafe { libc::kill(pid, 0) == 0 }
        } else {
            false
        }
    } else {
        false
    }
}

fn write_pidfile() {
    let _ = std::fs::create_dir_all(pid_path().parent().unwrap());
    let _ = std::fs::write(pid_path(), std::process::id().to_string());
}

fn cleanup_files() {
    let _ = std::fs::remove_file(socket_path());
    let _ = std::fs::remove_file(pid_path());
}

// ── Main ─────────────────────────────────────────────────────────────────────

fn main() {
    // If sidecar is already running, just exit silently
    if is_sidecar_running() {
        // Verify the socket is actually connectable
        if socket_path().exists() {
            std::process::exit(0);
        }
        // Socket gone but pid alive — stale state, clean up and continue
    }

    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .worker_threads(2)
        .build()
        .expect("tokio runtime");

    rt.block_on(run());
    cleanup_files();
}

async fn run() {
    // Parse config from argv[1] if provided, otherwise default
    let config_str = std::env::args().nth(1).unwrap_or_default();
    let config = if config_str.is_empty() {
        zenoh::Config::default()
    } else {
        zenoh::Config::from_json5(&config_str).unwrap_or_else(|e| {
            eprintln!("pi-mesh: bad config: {e}");
            zenoh::Config::default()
        })
    };

    let session = match zenoh::open(config).await {
        Ok(s) => Arc::new(s),
        Err(e) => {
            eprintln!("pi-mesh: zenoh open failed: {e}");
            return;
        }
    };

    let zid = session.zid().to_string();

    // Clean up stale socket
    let sock_path = socket_path();
    let _ = std::fs::remove_file(&sock_path);
    let _ = std::fs::create_dir_all(sock_path.parent().unwrap());

    let listener = match UnixListener::bind(&sock_path) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("pi-mesh: bind {}: {e}", sock_path.display());
            return;
        }
    };

    write_pidfile();
    eprintln!("pi-mesh: listening on {} (zid={})", sock_path.display(), zid);

    // Internal channels
    let (ev_tx, mut ev_rx) = mpsc::unbounded_channel::<InternalEvent>();
    let (cmd_tx, mut cmd_rx) = mpsc::unbounded_channel::<ClientCommand>();

    // Per-client output channels: client_id → sender
    let mut client_senders: HashMap<u64, mpsc::UnboundedSender<Event>> = HashMap::new();
    let mut next_client_id: u64 = 1;

    // Per-client resource tracking
    let mut client_sub_aborts: HashMap<u64, HashMap<i32, tokio::task::AbortHandle>> = HashMap::new();
    let mut client_serve_aborts: HashMap<u64, HashMap<i32, tokio::task::AbortHandle>> = HashMap::new();

    // Global counters
    let mut sub_counter: i32 = 0;
    let mut serve_counter: i32 = 0;
    let query_counter = Arc::new(std::sync::atomic::AtomicU64::new(1));

    // Shared query storage (query_id → Query, keyed globally)
    let mut pending_queries: HashMap<u64, (zenoh::query::Query, Instant)> = HashMap::new();

    // Grace period: shut down after no clients for this long
    let mut last_client_disconnect: Option<Instant> = None;
    let grace_period = Duration::from_secs(60);

    loop {
        // Check grace period
        if client_senders.is_empty() {
            if let Some(t) = last_client_disconnect {
                if t.elapsed() > grace_period {
                    eprintln!("pi-mesh: no clients for {}s, shutting down", grace_period.as_secs());
                    break;
                }
            }
        }

        tokio::select! {
            // Accept new client connections
            accepted = listener.accept() => {
                match accepted {
                    Ok((stream, _addr)) => {
                        let client_id = next_client_id;
                        next_client_id += 1;
                        last_client_disconnect = None;

                        let mesh_client_id = uuid::Uuid::new_v4().to_string();

                        let (client_ev_tx, client_ev_rx) = mpsc::unbounded_channel();
                        client_senders.insert(client_id, client_ev_tx.clone());
                        client_sub_aborts.insert(client_id, HashMap::new());
                        client_serve_aborts.insert(client_id, HashMap::new());

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

                    Command::Get { topic, payload, timeout_ms, req_id } => {
                        let dur = Duration::from_millis(timeout_ms.unwrap_or(30_000) as u64);
                        let session2 = Arc::clone(&session);
                        let ev_tx2 = ev_tx.clone();
                        let cid = client_id;
                        tokio::spawn(async move {
                            match session2.get(&topic)
                                .payload(payload.into_bytes())
                                .timeout(dur)
                                .await
                            {
                                Ok(receiver) => {
                                    while let Ok(reply) = receiver.recv_async().await {
                                        if let Ok(sample) = reply.result() {
                                            let p = String::from_utf8_lossy(
                                                &sample.payload().to_bytes()
                                            ).into_owned();
                                            let _ = ev_tx2.send(InternalEvent::GetReply {
                                                client_id: cid, req_id: req_id.clone(), payload: p,
                                            });
                                        }
                                    }
                                }
                                Err(e) => {
                                    let _ = ev_tx2.send(InternalEvent::GetReply {
                                        client_id: cid,
                                        req_id,
                                        payload: format!("{{\"error\":\"{e}\"}}"),
                                    });
                                }
                            }
                        });
                    }

                    Command::Serve { topic } => {
                        match session.declare_queryable(&topic).await {
                            Ok(queryable) => {
                                serve_counter += 1;
                                let id = serve_counter;
                                let ev_tx2 = ev_tx.clone();
                                let cid = client_id;
                                let qc = query_counter.clone();
                                let task = tokio::spawn(async move {
                                    while let Ok(query) = queryable.recv_async().await {
                                        let qid = qc.fetch_add(
                                            1, std::sync::atomic::Ordering::Relaxed
                                        );
                                        let t = query.key_expr().as_str().to_string();
                                        let p = query.payload()
                                            .map(|p| String::from_utf8_lossy(
                                                &p.to_bytes()
                                            ).into_owned())
                                            .unwrap_or_default();
                                        let _ = ev_tx2.send(InternalEvent::QueryIn {
                                            client_id: cid, query_id: qid,
                                            topic: t, payload: p, query,
                                        });
                                    }
                                });
                                if let Some(serves) = client_serve_aborts.get_mut(&client_id) {
                                    serves.insert(id, task.abort_handle());
                                }
                                send_to_client(&client_senders, client_id,
                                    Event::Served { id });
                            }
                            Err(e) => send_to_client(&client_senders, client_id,
                                Event::Error { msg: format!("serve: {e}") }),
                        }
                    }

                    Command::Unserve { id } => {
                        if let Some(serves) = client_serve_aborts.get_mut(&client_id) {
                            if let Some(abort) = serves.remove(&id) {
                                abort.abort();
                            }
                        }
                    }

                    Command::Reply { query_id, payload } => {
                        if let Some((query, _)) = pending_queries.remove(&query_id) {
                            let key = query.key_expr().to_string();
                            if let Err(e) = query.reply(key, payload.into_bytes()).await {
                                send_to_client(&client_senders, client_id,
                                    Event::Error { msg: format!("reply: {e}") });
                            }
                        }
                    }

                    Command::Close => {
                        // Client disconnecting — clean up its resources
                        cleanup_client(client_id, &mut client_senders,
                            &mut client_sub_aborts, &mut client_serve_aborts);
                        if client_senders.is_empty() {
                            last_client_disconnect = Some(Instant::now());
                        }
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
                    InternalEvent::QueryIn { client_id, query_id, topic, payload, query } => {
                        pending_queries.retain(|_, (_, ts)| ts.elapsed() < Duration::from_secs(30));
                        pending_queries.insert(query_id, (query, Instant::now()));
                        send_to_client(&client_senders, client_id,
                            Event::Query { query_id, topic, payload });
                    }
                    InternalEvent::GetReply { client_id, req_id, payload } => {
                        send_to_client(&client_senders, client_id,
                            Event::Reply { req_id, payload });
                    }
                }
            }

            // Grace period tick
            _ = tokio::time::sleep(Duration::from_secs(5)) => {
                // Just re-enter the loop to check grace period
            }
        }
    }

    // Cleanup all clients
    for (cid, subs) in &client_sub_aborts {
        for (_, abort) in subs { abort.abort(); }
        let _ = cid;
    }
    for (_, serves) in &client_serve_aborts {
        for (_, abort) in serves { abort.abort(); }
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
                let Some(ev) = ev else { break };
                let mut buf = serde_json::to_vec(&ev).unwrap_or_default();
                buf.push(b'\n');
                if writer.write_all(&buf).await.is_err() {
                    break; // write failed — client gone
                }
            }
        }
    }

    // Notify main loop this client is gone
    let _ = cmd_tx.send(ClientCommand { client_id, cmd: Command::Close });
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
    serve_aborts: &mut HashMap<u64, HashMap<i32, tokio::task::AbortHandle>>,
) {
    senders.remove(&client_id);
    if let Some(subs) = sub_aborts.remove(&client_id) {
        for (_, abort) in subs { abort.abort(); }
    }
    if let Some(serves) = serve_aborts.remove(&client_id) {
        for (_, abort) in serves { abort.abort(); }
    }
}
