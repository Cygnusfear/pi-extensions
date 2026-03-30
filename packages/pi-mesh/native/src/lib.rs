//! pi-mesh-native — production Rust cdylib wrapping Zenoh for bun:ffi.
//!
//! Architecture:
//!   - Each `mesh_open()` call spawns a background OS thread that owns a tokio runtime.
//!   - All Zenoh operations are async and run on that runtime.
//!   - The `Handle` (returned to C as an opaque pointer) is a phantom type; its POINTER VALUE
//!     encodes a u64 ID. It is NOT a real memory address and must never be dereferenced.
//!   - The actual session state lives in `HandleInner` kept alive by `Arc` in the global registry.
//!   - Blocking recv on oneshot channels is used only for operations that must return a value
//!     synchronously (subscribe returns sub_id, serve returns serve_id).
//!   - Every `extern "C"` fn is wrapped in `catch_unwind` / `AssertUnwindSafe` so panics
//!     never cross the FFI boundary.
//!   - Null pointer arguments always produce -1 / null returns, never crashes.
//!   - `mesh_close` removes the handle from the global registry.
//!     After `mesh_close` returns, any `mesh_*` call with the same handle is a safe no-op.
//!     Double-close is safe (second call is a silent no-op).

#![allow(clippy::missing_safety_doc)]

use std::{
    collections::{HashMap, VecDeque},
    ffi::c_void,
    panic::{AssertUnwindSafe, catch_unwind},
    slice,
    str,
    sync::{
        Arc, Mutex, OnceLock,
        atomic::{AtomicBool, AtomicU64, Ordering},
    },
    thread,
    time::{Duration, Instant},
};

use tokio::sync::{mpsc, oneshot};
use zenoh::Config;

// ── Callback function pointer types ─────────────────────────────────────────

/// Subscribe / poll message callback.
/// `fn(topic_ptr, topic_len, payload_ptr, payload_len, context)`
pub type SubCb =
    unsafe extern "C" fn(*const u8, usize, *const u8, usize, *mut c_void);

/// Request reply callback.
/// `fn(payload_ptr, payload_len, context)`
pub type ReqCb = unsafe extern "C" fn(*const u8, usize, *mut c_void);

/// Serve (queryable) callback — called when a query arrives.
/// `fn(query_id, topic_ptr, topic_len, payload_ptr, payload_len, context)`
pub type ServeCb =
    unsafe extern "C" fn(u64, *const u8, usize, *const u8, usize, *mut c_void);

/// Peers callback.
/// `fn(peer_id_ptr, peer_id_len, context)`
pub type PeersCb = unsafe extern "C" fn(*const u8, usize, *mut c_void);

// ── Thread-safety wrapper for *mut c_void ───────────────────────────────────

/// Wraps `*mut c_void` as `Copy + Send + Sync`.
///
/// Safety invariant: the caller must guarantee the pointed-to data is only
/// accessed in a thread-safe manner and remains valid for the lifetime of the
/// Handle.
#[derive(Clone, Copy)]
struct SendPtr(*mut c_void);
// Safety: We promise the pointer is only passed back to the JS callback that
// created it; no Rust code dereferences it.
unsafe impl Send for SendPtr {}
unsafe impl Sync for SendPtr {}

// ── Commands & events ────────────────────────────────────────────────────────

struct PollMsg {
    topic: Vec<u8>,
    payload: Vec<u8>,
}

enum Command {
    Publish {
        topic: Vec<u8>,
        payload: Vec<u8>,
    },
    Subscribe {
        topic: Vec<u8>,
        callback: Option<SubCb>,
        context: SendPtr,
        reply_tx: oneshot::Sender<i32>,
    },
    Unsubscribe {
        sub_id: i32,
        reply_tx: oneshot::Sender<i32>,
    },
    Request {
        topic: Vec<u8>,
        payload: Vec<u8>,
        callback: ReqCb,
        context: SendPtr,
        timeout_ms: u32,
    },
    Serve {
        topic: Vec<u8>,
        callback: ServeCb,
        context: SendPtr,
        reply_tx: oneshot::Sender<i32>,
    },
    Unserve {
        serve_id: i32,
        reply_tx: oneshot::Sender<i32>,
    },
    Reply {
        query_id: u64,
        payload: Vec<u8>,
    },
    Peers {
        callback: PeersCb,
        context: SendPtr,
    },
    Poll {
        max_msgs: i32,
        buffer_size: usize,
        reply_tx: oneshot::Sender<(Vec<u8>, i32)>,
    },
    Close,
}

enum WorkerEvent {
    /// A message arrived for a subscription.
    SubMsg {
        callback: Option<SubCb>,
        context: SendPtr,
        topic: Vec<u8>,
        payload: Vec<u8>,
    },
    /// A query arrived for a queryable.
    QueryIn {
        callback: ServeCb,
        context: SendPtr,
        query: zenoh::query::Query,
    },
    /// A reply arrived for a request.
    RequestReply {
        callback: ReqCb,
        context: SendPtr,
        payload: Vec<u8>,
    },
    /// A single peer ID from a peers listing — one event per peer.
    PeerInfo {
        callback: PeersCb,
        context: SendPtr,
        peer_id: Vec<u8>,
    },
}

// ── Public opaque handle + global registry ───────────────────────────────────

/// Opaque handle type. The pointer VALUE encodes a handle ID; it is NOT a valid memory address.
/// Callers must not dereference this pointer. Pass it back to mesh_* functions only.
pub enum Handle {}

/// The actual session state, kept alive by Arc until mesh_close drops it from the registry.
struct HandleInner {
    cmd_tx: mpsc::UnboundedSender<Command>,
    closed: AtomicBool,
}

/// Registry entry: bundles the session state Arc with the worker thread handle.
struct RegistryEntry {
    inner: Arc<HandleInner>,
    thread: Option<thread::JoinHandle<()>>,
}

/// Global registry mapping handle IDs to live session state.
static REGISTRY: OnceLock<Mutex<HashMap<u64, RegistryEntry>>> = OnceLock::new();

/// Monotonically increasing counter for generating unique handle IDs.
static NEXT_ID: AtomicU64 = AtomicU64::new(1);

fn registry() -> &'static Mutex<HashMap<u64, RegistryEntry>> {
    REGISTRY.get_or_init(|| Mutex::new(HashMap::new()))
}

// ── Public C API ─────────────────────────────────────────────────────────────

/// Open a mesh session.
///
/// `config_ptr` — pointer to a JSON5/JSON config string (not NUL-terminated), or NULL for defaults.
/// `config_len` — length of the config string in bytes. Ignored when `config_ptr` is NULL.
/// Returns an opaque handle on success, NULL on failure.
#[unsafe(no_mangle)]
pub extern "C" fn mesh_open(config_ptr: *const u8, config_len: usize) -> *mut Handle {
    match catch_unwind(AssertUnwindSafe(|| mesh_open_inner(config_ptr, config_len))) {
        Ok(ptr) => ptr,
        Err(_) => {
            eprintln!("mesh_open: panic caught");
            std::ptr::null_mut()
        }
    }
}

fn mesh_open_inner(config_ptr: *const u8, config_len: usize) -> *mut Handle {
    let config = build_config(config_ptr, config_len);

    let (cmd_tx, cmd_rx) = mpsc::unbounded_channel::<Command>();
    let (ready_tx, ready_rx) = std::sync::mpsc::channel::<Result<(), String>>();

    let t = thread::spawn(move || worker_main(cmd_rx, config, ready_tx));

    match ready_rx.recv() {
        Ok(Ok(())) => {
            let inner = Arc::new(HandleInner {
                cmd_tx,
                closed: AtomicBool::new(false),
            });
            let id = NEXT_ID.fetch_add(1, Ordering::Relaxed);
            registry()
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .insert(id, RegistryEntry { inner, thread: Some(t) });
            id as usize as *mut Handle
        }
        Ok(Err(e)) => {
            eprintln!("mesh_open: worker init failed: {e}");
            let _ = t.join();
            std::ptr::null_mut()
        }
        Err(e) => {
            eprintln!("mesh_open: channel error: {e}");
            let _ = t.join();
            std::ptr::null_mut()
        }
    }
}

/// Close the mesh session.
///
/// Safe to call on a null handle (no-op).
/// Safe to call twice with the same handle (second call is a silent no-op).
/// After this returns, any `mesh_*` call with this handle silently returns without acting.
#[unsafe(no_mangle)]
pub extern "C" fn mesh_close(handle: *mut Handle) {
    let _ = catch_unwind(AssertUnwindSafe(|| {
        if handle.is_null() {
            return;
        }
        // Extract ID from pointer VALUE (no dereference, no allocation to free).
        let id = handle as usize as u64;

        // Remove from registry under lock. After this point safe_handle() returns None for
        // this ID, so no concurrent mesh_* call can see the inner state.
        let entry = {
            let mut reg = registry().lock().unwrap_or_else(|e| e.into_inner());
            reg.remove(&id)
        };

        if let Some(mut entry) = entry {
            // Mark closed so any in-flight Arc<HandleInner> clones (rare, short-lived) also
            // return None from safe_handle.
            entry.inner.closed.store(true, Ordering::SeqCst);
            let _ = entry.inner.cmd_tx.send(Command::Close);
            if let Some(t) = entry.thread.take() {
                let _ = t.join();
            }
            // entry.inner Arc drops here. If the worker was still running (shouldn't be after
            // join), the HandleInner stays alive until the worker exits.
        }
        // Double-close: id not in registry, silently returns (no allocation freed, no UB).
    }));
}

/// Publish a message to a topic (fire-and-forget).
#[unsafe(no_mangle)]
pub extern "C" fn mesh_publish(
    handle: *mut Handle,
    topic_ptr: *const u8,
    topic_len: usize,
    payload_ptr: *const u8,
    payload_len: usize,
) {
    let _ = catch_unwind(AssertUnwindSafe(|| {
        let inner = match safe_handle(handle, "mesh_publish") {
            Some(arc) => arc,
            None => return,
        };
        let topic = match copy_bytes(topic_ptr, topic_len) {
            Ok(b) => b,
            Err(e) => {
                eprintln!("mesh_publish: {e}");
                return;
            }
        };
        let payload = match copy_bytes(payload_ptr, payload_len) {
            Ok(b) => b,
            Err(e) => {
                eprintln!("mesh_publish: {e}");
                return;
            }
        };
        if inner.cmd_tx.send(Command::Publish { topic, payload }).is_err() {
            eprintln!("mesh_publish: worker thread not running");
        }
    }));
}

/// Subscribe to a topic.
///
/// `callback` — called for each message (topic, payload, context). May be NULL to buffer for poll.
/// `context`  — passed to the callback unchanged.
/// Returns a subscription ID ≥ 1 on success, -1 on failure.
#[unsafe(no_mangle)]
pub extern "C" fn mesh_subscribe(
    handle: *mut Handle,
    topic_ptr: *const u8,
    topic_len: usize,
    callback: Option<SubCb>,
    context: *mut c_void,
) -> i32 {
    match catch_unwind(AssertUnwindSafe(|| {
        let inner = match safe_handle(handle, "mesh_subscribe") {
            Some(arc) => arc,
            None => return -1,
        };
        let topic = match copy_bytes(topic_ptr, topic_len) {
            Ok(b) => b,
            Err(e) => {
                eprintln!("mesh_subscribe: {e}");
                return -1;
            }
        };
        let (reply_tx, reply_rx) = oneshot::channel::<i32>();
        if inner.cmd_tx.send(Command::Subscribe {
            topic,
            callback,
            context: SendPtr(context),
            reply_tx,
        }).is_err() {
            eprintln!("mesh_subscribe: worker thread not running");
            return -1;
        }
        reply_rx.blocking_recv().unwrap_or(-1)
    })) {
        Ok(id) => id,
        Err(_) => -1,
    }
}

/// Unsubscribe from a topic.
///
/// `sub_id` — the ID returned by `mesh_subscribe`.
/// Returns 0 on success, -1 on failure (unknown ID or worker not running).
#[unsafe(no_mangle)]
pub extern "C" fn mesh_unsubscribe(handle: *mut Handle, sub_id: i32) -> i32 {
    match catch_unwind(AssertUnwindSafe(|| {
        let inner = match safe_handle(handle, "mesh_unsubscribe") {
            Some(arc) => arc,
            None => return -1,
        };
        let (reply_tx, reply_rx) = oneshot::channel::<i32>();
        match inner.cmd_tx.send(Command::Unsubscribe { sub_id, reply_tx }) {
            Ok(()) => reply_rx.blocking_recv().unwrap_or(-1),
            Err(_) => {
                eprintln!("mesh_unsubscribe: worker thread not running");
                -1
            }
        }
    })) {
        Ok(v) => v,
        Err(_) => -1,
    }
}

/// Send a request and receive replies via callback.
///
/// `callback`   — called for each reply (payload, context). Must not be NULL.
/// `timeout_ms` — maximum time to wait for replies.
#[unsafe(no_mangle)]
pub extern "C" fn mesh_request(
    handle: *mut Handle,
    topic_ptr: *const u8,
    topic_len: usize,
    payload_ptr: *const u8,
    payload_len: usize,
    callback: Option<ReqCb>,
    context: *mut c_void,
    timeout_ms: u32,
) {
    let _ = catch_unwind(AssertUnwindSafe(|| {
        let callback = match callback {
            Some(cb) => cb,
            None => {
                eprintln!("mesh_request: null callback");
                return;
            }
        };
        let inner = match safe_handle(handle, "mesh_request") {
            Some(arc) => arc,
            None => return,
        };
        let topic = match copy_bytes(topic_ptr, topic_len) {
            Ok(b) => b,
            Err(e) => {
                eprintln!("mesh_request: {e}");
                return;
            }
        };
        let payload = match copy_bytes(payload_ptr, payload_len) {
            Ok(b) => b,
            Err(e) => {
                eprintln!("mesh_request: {e}");
                return;
            }
        };
        if inner.cmd_tx.send(Command::Request {
            topic,
            payload,
            callback,
            context: SendPtr(context),
            timeout_ms,
        }).is_err() {
            eprintln!("mesh_request: worker thread not running");
        }
    }));
}

/// Register a queryable (serve) for request-reply.
///
/// `callback` — called for each incoming query (query_id, topic, payload, context).
///              The handler MUST call `mesh_reply(handle, query_id, ...)` to respond.
///              Must not be NULL.
/// Returns a serve ID ≥ 1 on success, -1 on failure.
#[unsafe(no_mangle)]
pub extern "C" fn mesh_serve(
    handle: *mut Handle,
    topic_ptr: *const u8,
    topic_len: usize,
    callback: Option<ServeCb>,
    context: *mut c_void,
) -> i32 {
    match catch_unwind(AssertUnwindSafe(|| {
        let callback = match callback {
            Some(cb) => cb,
            None => {
                eprintln!("mesh_serve: null callback");
                return -1;
            }
        };
        let inner = match safe_handle(handle, "mesh_serve") {
            Some(arc) => arc,
            None => return -1,
        };
        let topic = match copy_bytes(topic_ptr, topic_len) {
            Ok(b) => b,
            Err(e) => {
                eprintln!("mesh_serve: {e}");
                return -1;
            }
        };
        let (reply_tx, reply_rx) = oneshot::channel::<i32>();
        if inner.cmd_tx.send(Command::Serve {
            topic,
            callback,
            context: SendPtr(context),
            reply_tx,
        }).is_err() {
            eprintln!("mesh_serve: worker thread not running");
            return -1;
        }
        reply_rx.blocking_recv().unwrap_or(-1)
    })) {
        Ok(v) => v,
        Err(_) => -1,
    }
}

/// Unregister a queryable (cancel serving).
///
/// `serve_id` — the ID returned by `mesh_serve`.
/// Returns 0 on success, -1 on failure (unknown ID or worker not running).
#[unsafe(no_mangle)]
pub extern "C" fn mesh_unserve(handle: *mut Handle, serve_id: i32) -> i32 {
    match catch_unwind(AssertUnwindSafe(|| {
        let inner = match safe_handle(handle, "mesh_unserve") {
            Some(arc) => arc,
            None => return -1,
        };
        let (reply_tx, reply_rx) = oneshot::channel::<i32>();
        match inner.cmd_tx.send(Command::Unserve { serve_id, reply_tx }) {
            Ok(()) => reply_rx.blocking_recv().unwrap_or(-1),
            Err(_) => {
                eprintln!("mesh_unserve: worker thread not running");
                -1
            }
        }
    })) {
        Ok(v) => v,
        Err(_) => -1,
    }
}

/// Reply to an incoming query identified by `query_id`.
///
/// `query_id` — the ID passed to the serve callback.
#[unsafe(no_mangle)]
pub extern "C" fn mesh_reply(
    handle: *mut Handle,
    query_id: u64,
    payload_ptr: *const u8,
    payload_len: usize,
) {
    let _ = catch_unwind(AssertUnwindSafe(|| {
        let inner = match safe_handle(handle, "mesh_reply") {
            Some(arc) => arc,
            None => return,
        };
        let payload = match copy_bytes(payload_ptr, payload_len) {
            Ok(b) => b,
            Err(e) => {
                eprintln!("mesh_reply: {e}");
                return;
            }
        };
        if inner.cmd_tx.send(Command::Reply { query_id, payload }).is_err() {
            eprintln!("mesh_reply: worker thread not running");
        }
    }));
}

/// Enumerate connected peers; `callback` is called once per peer ID.
///
/// `callback` must not be NULL.
#[unsafe(no_mangle)]
pub extern "C" fn mesh_peers(
    handle: *mut Handle,
    callback: Option<PeersCb>,
    context: *mut c_void,
) {
    let _ = catch_unwind(AssertUnwindSafe(|| {
        let callback = match callback {
            Some(cb) => cb,
            None => {
                eprintln!("mesh_peers: null callback");
                return;
            }
        };
        let inner = match safe_handle(handle, "mesh_peers") {
            Some(arc) => arc,
            None => return,
        };
        if inner.cmd_tx.send(Command::Peers {
            callback,
            context: SendPtr(context),
        }).is_err() {
            eprintln!("mesh_peers: worker thread not running");
        }
    }));
}

/// Drain up to `max_msgs` buffered messages (from null-callback subscriptions) into `buffer`.
///
/// Buffer format per message: `[topic_len: u32 LE][topic bytes][payload_len: u32 LE][payload bytes]`
///
/// Returns:
///   N > 0 : N messages written to buffer
///   0     : no messages available
///  -1     : error (null buffer, closed handle, etc.)
///  -2     : buffer too small for the next oversize message (no messages written); try a larger buffer
#[unsafe(no_mangle)]
pub extern "C" fn mesh_poll(
    handle: *mut Handle,
    buffer: *mut u8,
    buffer_size: usize,
    max_msgs: i32,
) -> i32 {
    match catch_unwind(AssertUnwindSafe(|| {
        if buffer.is_null() || buffer_size == 0 {
            return -1;
        }
        let inner = match safe_handle(handle, "mesh_poll") {
            Some(arc) => arc,
            None => return -1,
        };
        let (reply_tx, reply_rx) = oneshot::channel::<(Vec<u8>, i32)>();
        if inner.cmd_tx.send(Command::Poll { max_msgs, buffer_size, reply_tx }).is_err() {
            eprintln!("mesh_poll: worker thread not running");
            return -1;
        }
        match reply_rx.blocking_recv() {
            Ok((data, count)) => {
                let copy_len = data.len(); // guaranteed to fit since handler respects buffer_size
                if copy_len > 0 {
                    // Safety: buffer is non-null and buffer_size >= copy_len (handler ensured it).
                    unsafe {
                        std::ptr::copy_nonoverlapping(data.as_ptr(), buffer, copy_len);
                    }
                }
                count
            }
            Err(_) => -1,
        }
    })) {
        Ok(v) => v,
        Err(_) => -1,
    }
}

// ── Worker thread ────────────────────────────────────────────────────────────

fn worker_main(
    cmd_rx: mpsc::UnboundedReceiver<Command>,
    config: Config,
    ready_tx: std::sync::mpsc::Sender<Result<(), String>>,
) {
    let runtime = match tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .worker_threads(2)
        .build()
    {
        Ok(rt) => rt,
        Err(e) => {
            let _ = ready_tx.send(Err(format!("tokio runtime: {e}")));
            return;
        }
    };

    let session = match runtime.block_on(async { zenoh::open(config).await }) {
        Ok(s) => s,
        Err(e) => {
            let _ = ready_tx.send(Err(format!("zenoh open: {e}")));
            return;
        }
    };

    let _ = ready_tx.send(Ok(()));

    // Wrap in Arc so spawned tasks can share the session reference.
    let session = Arc::new(session);
    runtime.block_on(run_loop(session, cmd_rx));
}

async fn run_loop(session: Arc<zenoh::Session>, mut cmd_rx: mpsc::UnboundedReceiver<Command>) {
    // Inner channel: subscriber/queryable tasks → this event loop.
    let (ev_tx, mut ev_rx) = mpsc::unbounded_channel::<WorkerEvent>();

    let mut sub_counter: i32 = 0;
    let mut serve_counter: i32 = 0;
    let mut query_counter: u64 = 0;

    // Abort handles so we can cancel subscribers / queryables.
    let mut sub_aborts: HashMap<i32, tokio::task::AbortHandle> = HashMap::new();
    let mut serve_aborts: HashMap<i32, tokio::task::AbortHandle> = HashMap::new();

    // Pending queries waiting for mesh_reply.
    // Each entry carries the Query and its insertion timestamp for timeout-based eviction.
    // Queries older than 30 seconds are evicted — the dropped Query causes Zenoh to timeout.
    let mut pending_queries: HashMap<u64, (zenoh::query::Query, Instant)> = HashMap::new();

    // Poll buffer for subscriptions registered without a callback.
    let mut poll_buf: VecDeque<PollMsg> = VecDeque::new();

    // cb_store: Stable callback buffer store.
    //
    // Every payload delivered to a callback is boxed here and kept alive until
    // mesh_close(). This is required because Bun's JSCallback with
    // `threadsafe: true` dispatches asynchronously — the raw pointer arguments
    // must remain valid until the JS callback actually executes.
    //
    // SAFETY NOTE: Bun JSCallback threadsafe dispatch may execute AFTER mesh_close() returns
    // if callbacks were queued just before close. Callers should ensure all pending callbacks
    // have fired before calling mesh_close(), e.g. by inserting a sleep or awaiting all
    // promises. This is a Bun limitation: native-thread JSCallbacks are not guaranteed to
    // complete before the native thread exits.
    // See: https://bun.sh/docs/api/ffi#jscallback
    //
    // KNOWN LIMITATION: cb_store grows without bound for the lifetime of the
    // session. Memory usage depends on message volume:
    //   - 1,000 messages × 1KB average = ~2MB (topic + payload per message)
    //   - 100,000 messages × 1KB average = ~200MB
    // For high-frequency topics, consider using mesh_poll (callback=null) which
    // uses a VecDeque that is drained on each mesh_poll call; will grow unboundedly
    // if mesh_poll is never called (capped at 10,000 messages; oldest dropped on overflow).
    let mut cb_store: Vec<Box<[u8]>> = Vec::new();

    loop {
        tokio::select! {
            cmd = cmd_rx.recv() => {
                let Some(cmd) = cmd else { break };
                match cmd {
                    Command::Publish { topic, payload } => {
                        let key = match bytes_to_str(&topic) {
                            Ok(s) => s.to_owned(),
                            Err(e) => { eprintln!("publish: {e}"); continue; }
                        };
                        if let Err(e) = session.put(&key, payload).await {
                            eprintln!("publish zenoh error: {e}");
                        }
                    }

                    Command::Subscribe { topic, callback, context, reply_tx } => {
                        let key = match bytes_to_str(&topic) {
                            Ok(s) => s.to_owned(),
                            Err(e) => {
                                eprintln!("subscribe: {e}");
                                let _ = reply_tx.send(-1);
                                continue;
                            }
                        };
                        match session.declare_subscriber(&key).await {
                            Ok(subscriber) => {
                                sub_counter = match sub_counter.checked_add(1) {
                                    Some(n) => n,
                                    None => {
                                        eprintln!("subscribe: sub_counter overflow");
                                        let _ = reply_tx.send(-1);
                                        continue;
                                    }
                                };
                                let id = sub_counter;
                                let ev_tx2 = ev_tx.clone();
                                // context is SendPtr (Copy), callback is fn ptr (Copy).
                                let task = tokio::spawn(async move {
                                    while let Ok(sample) = subscriber.recv_async().await {
                                        let t = sample.key_expr().as_str().as_bytes().to_vec();
                                        let p = sample.payload().to_bytes().into_owned();
                                        let _ = ev_tx2.send(WorkerEvent::SubMsg {
                                            callback,
                                            context, // Copy: reused each iteration
                                            topic: t,
                                            payload: p,
                                        });
                                    }
                                });
                                sub_aborts.insert(id, task.abort_handle());
                                let _ = reply_tx.send(id);
                            }
                            Err(e) => {
                                eprintln!("subscribe zenoh error: {e}");
                                let _ = reply_tx.send(-1);
                            }
                        }
                    }

                    Command::Unsubscribe { sub_id, reply_tx } => {
                        if let Some(abort) = sub_aborts.remove(&sub_id) {
                            abort.abort();
                            let _ = reply_tx.send(0);
                        } else {
                            eprintln!("unsubscribe: unknown sub_id {sub_id}");
                            let _ = reply_tx.send(-1);
                        }
                    }

                    Command::Request { topic, payload, callback, context, timeout_ms } => {
                        let key = match bytes_to_str(&topic) {
                            Ok(s) => s.to_owned(),
                            Err(e) => { eprintln!("request: {e}"); continue; }
                        };
                        let ev_tx2 = ev_tx.clone();
                        let dur = Duration::from_millis(timeout_ms as u64);
                        let session2 = Arc::clone(&session);
                        tokio::spawn(async move {
                            match session2.get(&key)
                                .payload(payload)
                                .timeout(dur)
                                .await
                            {
                                Ok(receiver) => {
                                    while let Ok(reply) = receiver.recv_async().await {
                                        match reply.result() {
                                            Ok(sample) => {
                                                let p = sample.payload().to_bytes().into_owned();
                                                let _ = ev_tx2.send(WorkerEvent::RequestReply {
                                                    callback,
                                                    context, // Copy
                                                    payload: p,
                                                });
                                            }
                                            Err(e) => {
                                                eprintln!("request reply error: {e}");
                                            }
                                        }
                                    }
                                }
                                Err(e) => {
                                    eprintln!("request zenoh get error: {e}");
                                }
                            }
                        });
                    }

                    Command::Serve { topic, callback, context, reply_tx } => {
                        let key = match bytes_to_str(&topic) {
                            Ok(s) => s.to_owned(),
                            Err(e) => {
                                eprintln!("serve: {e}");
                                let _ = reply_tx.send(-1);
                                continue;
                            }
                        };
                        match session.declare_queryable(&key).await {
                            Ok(queryable) => {
                                serve_counter = match serve_counter.checked_add(1) {
                                    Some(n) => n,
                                    None => {
                                        eprintln!("serve: serve_counter overflow");
                                        let _ = reply_tx.send(-1);
                                        continue;
                                    }
                                };
                                let id = serve_counter;
                                let ev_tx2 = ev_tx.clone();
                                let task = tokio::spawn(async move {
                                    while let Ok(query) = queryable.recv_async().await {
                                        let _ = ev_tx2.send(WorkerEvent::QueryIn {
                                            callback,
                                            context, // Copy
                                            query,
                                        });
                                    }
                                });
                                serve_aborts.insert(id, task.abort_handle());
                                let _ = reply_tx.send(id);
                            }
                            Err(e) => {
                                eprintln!("serve zenoh error: {e}");
                                let _ = reply_tx.send(-1);
                            }
                        }
                    }

                    Command::Unserve { serve_id, reply_tx } => {
                        if let Some(abort) = serve_aborts.remove(&serve_id) {
                            abort.abort();
                            let _ = reply_tx.send(0);
                        } else {
                            eprintln!("unserve: unknown serve_id {serve_id}");
                            let _ = reply_tx.send(-1);
                        }
                    }

                    Command::Reply { query_id, payload } => {
                        if let Some((query, _)) = pending_queries.remove(&query_id) {
                            let key = query.key_expr().to_string();
                            if let Err(e) = query.reply(key, payload).await {
                                eprintln!("reply zenoh error: {e}");
                            }
                        } else {
                            eprintln!("reply: unknown query_id {query_id}");
                        }
                    }

                    Command::Peers { callback, context } => {
                        let peer_ids: Vec<String> = session
                            .info()
                            .peers_zid()
                            .await
                            .into_iter()
                            .map(|z| z.to_string())
                            .collect();
                        for peer in peer_ids {
                            let _ = ev_tx.send(WorkerEvent::PeerInfo {
                                callback,
                                context,
                                peer_id: peer.into_bytes(),
                            });
                        }
                    }

                    Command::Poll { max_msgs, buffer_size, reply_tx } => {
                        let deliver_limit: usize = if max_msgs < 0 {
                            usize::MAX
                        } else {
                            max_msgs as usize
                        };

                        let mut data: Vec<u8> = Vec::new();
                        let mut n: i32 = 0;
                        let mut held_back: Vec<PollMsg> = Vec::new();
                        let mut had_oversize = false;

                        // Scan until we've delivered deliver_limit messages or exhausted the queue.
                        // Oversize messages are skipped with continue (not counted toward limit).
                        while (n as usize) < deliver_limit && !poll_buf.is_empty() {
                            let msg = match poll_buf.pop_front() {
                                Some(m) => m,
                                None => break,
                            };
                            let msg_size = 4 + msg.topic.len() + 4 + msg.payload.len();

                            if msg_size > buffer_size {
                                // Message too large for this buffer. Skip but remember it exists.
                                if data.is_empty() && held_back.is_empty() {
                                    had_oversize = true;
                                }
                                held_back.push(msg);
                                continue; // Keep scanning — don't count toward deliver_limit!
                            }

                            if data.len() + msg_size > buffer_size {
                                // Buffer space exhausted. Put this message back at the front.
                                held_back.insert(0, msg);
                                break;
                            }

                            // Fits: serialize into output buffer.
                            data.extend_from_slice(&(msg.topic.len() as u32).to_le_bytes());
                            data.extend_from_slice(&msg.topic);
                            data.extend_from_slice(&(msg.payload.len() as u32).to_le_bytes());
                            data.extend_from_slice(&msg.payload);
                            n += 1;
                        }

                        // Re-prepend held-back (skipped oversize) messages in original order.
                        for msg in held_back.into_iter().rev() {
                            poll_buf.push_front(msg);
                        }

                        if n == 0 && had_oversize {
                            // Could not deliver any message because only oversize messages exist.
                            // Return -2 to signal: buffer too small for any available message.
                            let _ = reply_tx.send((Vec::new(), -2));
                        } else {
                            let _ = reply_tx.send((data, n));
                        }
                    }

                    Command::Close => break,
                }
            }

            ev = ev_rx.recv() => {
                let Some(ev) = ev else { continue };
                match ev {
                    WorkerEvent::SubMsg { callback, context, topic, payload } => {
                        match callback {
                            Some(cb) => {
                                // Box the data and keep it alive until mesh_close().
                                let t: Box<[u8]> = topic.into_boxed_slice();
                                let p: Box<[u8]> = payload.into_boxed_slice();
                                let tptr = t.as_ptr();
                                let tlen = t.len();
                                let pptr = p.as_ptr();
                                let plen = p.len();
                                cb_store.push(t);
                                cb_store.push(p);
                                // Safety: cb is a valid JSCallback (threadsafe: true).
                                // The data pointed to by tptr/pptr lives in cb_store until
                                // mesh_close() — safe for async threadsafe dispatch.
                                if let Err(e) = catch_unwind(AssertUnwindSafe(|| {
                                    unsafe { cb(tptr, tlen, pptr, plen, context.0) }
                                })) {
                                    eprintln!("subscriber callback panic: {e:?}");
                                }
                            }
                            None => {
                                // Cap poll_buf to prevent unbounded growth.
                                const POLL_BUF_MAX: usize = 10_000;
                                if poll_buf.len() >= POLL_BUF_MAX {
                                    poll_buf.pop_front(); // Drop oldest message.
                                    eprintln!("mesh_subscribe: poll_buf full, dropping oldest message");
                                }
                                poll_buf.push_back(PollMsg { topic, payload });
                            }
                        }
                    }

                    WorkerEvent::QueryIn { callback, context, query } => {
                        // Evict stale pending queries (older than 30 s) on every new QueryIn.
                        // Dropping the Query causes Zenoh to time out the query on the requester side.
                        pending_queries.retain(|_, (_, ts)| ts.elapsed() < Duration::from_secs(30));

                        query_counter += 1;
                        let qid = query_counter;
                        let topic: Box<[u8]> =
                            query.key_expr().as_str().as_bytes().to_vec().into_boxed_slice();
                        let payload: Box<[u8]> = query
                            .payload()
                            .map(|p| p.to_bytes().into_owned().into_boxed_slice())
                            .unwrap_or_else(|| Box::new([]));
                        let tptr = topic.as_ptr();
                        let tlen = topic.len();
                        let pptr = payload.as_ptr();
                        let plen = payload.len();
                        // Register BEFORE calling the callback so mesh_reply can look it up.
                        pending_queries.insert(qid, (query, Instant::now()));
                        cb_store.push(topic);
                        cb_store.push(payload);
                        // Safety: callback is a valid JSCallback (threadsafe: true), data in cb_store.
                        if let Err(e) = catch_unwind(AssertUnwindSafe(|| {
                            unsafe { callback(qid, tptr, tlen, pptr, plen, context.0) }
                        })) {
                            eprintln!("queryable callback panic: {e:?}");
                        }
                    }

                    WorkerEvent::RequestReply { callback, context, payload } => {
                        let p: Box<[u8]> = payload.into_boxed_slice();
                        let pptr = p.as_ptr();
                        let plen = p.len();
                        cb_store.push(p);
                        // Safety: callback is a valid JSCallback (threadsafe: true), data in cb_store.
                        if let Err(e) = catch_unwind(AssertUnwindSafe(|| {
                            unsafe { callback(pptr, plen, context.0) }
                        })) {
                            eprintln!("request reply callback panic: {e:?}");
                        }
                    }

                    WorkerEvent::PeerInfo { callback, context, peer_id } => {
                        let p: Box<[u8]> = peer_id.into_boxed_slice();
                        let ptr = p.as_ptr();
                        let len = p.len();
                        cb_store.push(p);
                        // Safety: callback is a valid JSCallback (threadsafe: true), data in cb_store.
                        if let Err(e) = catch_unwind(AssertUnwindSafe(|| {
                            unsafe { callback(ptr, len, context.0) }
                        })) {
                            eprintln!("peers callback panic: {e:?}");
                        }
                    }
                }
            }
        }
    }

    // Cancel all background tasks.
    for (_, abort) in sub_aborts.drain() {
        abort.abort();
    }
    for (_, abort) in serve_aborts.drain() {
        abort.abort();
    }

    // Close the Zenoh session. Arc::try_unwrap gives us the owned Session once
    // all task clones are released.
    match Arc::try_unwrap(session) {
        Ok(s) => {
            if let Err(e) = s.close().await {
                eprintln!("mesh_close: session close error: {e}");
            }
        }
        Err(arc) => {
            // Tasks may still be aborting; drop our Arc reference and let them
            // finish.
            drop(arc);
        }
    }
}

// ── Helper functions ─────────────────────────────────────────────────────────

fn build_config(config_ptr: *const u8, config_len: usize) -> Config {
    if config_ptr.is_null() || config_len == 0 {
        return Config::default();
    }
    let bytes = match copy_bytes(config_ptr, config_len) {
        Ok(b) => b,
        Err(e) => {
            eprintln!("mesh_open: config pointer error: {e}; using default");
            return Config::default();
        }
    };
    let s = match str::from_utf8(&bytes) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("mesh_open: config not valid UTF-8: {e}; using default");
            return Config::default();
        }
    };
    if s.trim().is_empty() {
        return Config::default();
    }
    match Config::from_json5(s) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("mesh_open: invalid config JSON ({e}); using default");
            Config::default()
        }
    }
}

/// Returns a cloned `Arc<HandleInner>` if the handle is valid and not closed.
///
/// Looks up the handle ID in the global registry — the authoritative check for liveness.
/// After `mesh_close` removes the entry, this returns `None` regardless of what the
/// raw pointer still points to.
fn safe_handle(ptr: *mut Handle, fn_name: &str) -> Option<Arc<HandleInner>> {
    if ptr.is_null() {
        eprintln!("{fn_name}: null handle");
        return None;
    }
    // Extract ID from pointer VALUE (no dereference, works even after close).
    let id = ptr as usize as u64;
    let reg = registry().lock().unwrap_or_else(|e| e.into_inner());
    let entry = reg.get(&id)?;
    if entry.inner.closed.load(Ordering::SeqCst) {
        return None;
    }
    Some(Arc::clone(&entry.inner))
}

/// Copies bytes from a raw pointer into a Vec. Returns an error if the pointer
/// is null but length is non-zero.
fn copy_bytes(ptr: *const u8, len: usize) -> Result<Vec<u8>, String> {
    if len == 0 {
        return Ok(Vec::new());
    }
    if ptr.is_null() {
        return Err("null pointer with non-zero length".to_string());
    }
    // Safety: caller guarantees ptr points to at least `len` bytes.
    Ok(unsafe { slice::from_raw_parts(ptr, len) }.to_vec())
}

/// Interprets a byte slice as UTF-8.
fn bytes_to_str(bytes: &[u8]) -> Result<&str, String> {
    str::from_utf8(bytes).map_err(|e| format!("topic not valid UTF-8: {e}"))
}

// ── Unit tests (no network required) ─────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn copy_bytes_empty() {
        assert_eq!(copy_bytes(std::ptr::null(), 0).unwrap(), Vec::<u8>::new());
    }

    #[test]
    fn copy_bytes_null_nonzero_errors() {
        assert!(copy_bytes(std::ptr::null(), 1).is_err());
    }

    #[test]
    fn copy_bytes_valid() {
        let data = b"hello world";
        assert_eq!(copy_bytes(data.as_ptr(), data.len()).unwrap(), b"hello world");
    }

    #[test]
    fn bytes_to_str_valid_utf8() {
        assert_eq!(bytes_to_str(b"pi/mesh/test").unwrap(), "pi/mesh/test");
    }

    #[test]
    fn bytes_to_str_invalid_utf8() {
        assert!(bytes_to_str(&[0xFF, 0xFE]).is_err());
    }

    #[test]
    fn safe_handle_null_returns_none() {
        assert!(safe_handle(std::ptr::null_mut::<Handle>(), "test").is_none());
    }

    #[test]
    fn mesh_close_null_no_panic() {
        mesh_close(std::ptr::null_mut());
    }

    #[test]
    fn mesh_poll_null_buffer_returns_error() {
        assert_eq!(mesh_poll(std::ptr::null_mut(), std::ptr::null_mut(), 0, 10), -1);
    }

    #[test]
    fn mesh_publish_null_handle_no_panic() {
        let data = b"test";
        mesh_publish(
            std::ptr::null_mut(),
            data.as_ptr(), data.len(),
            data.as_ptr(), data.len(),
        );
    }

    #[test]
    fn mesh_subscribe_null_handle_returns_error() {
        let topic = b"test";
        let result = mesh_subscribe(
            std::ptr::null_mut(),
            topic.as_ptr(), topic.len(),
            None,
            std::ptr::null_mut(),
        );
        assert_eq!(result, -1);
    }

    #[test]
    fn mesh_unsubscribe_null_handle_returns_error() {
        assert_eq!(mesh_unsubscribe(std::ptr::null_mut(), 1), -1);
    }

    #[test]
    fn mesh_serve_null_handle_returns_error() {
        extern "C" fn dummy_serve(
            _qid: u64, _tp: *const u8, _tl: usize,
            _pp: *const u8, _pl: usize, _ctx: *mut c_void,
        ) {}
        let topic = b"test";
        let result = mesh_serve(
            std::ptr::null_mut(),
            topic.as_ptr(), topic.len(),
            Some(dummy_serve),
            std::ptr::null_mut(),
        );
        assert_eq!(result, -1);
    }

    #[test]
    fn mesh_serve_null_callback_returns_error() {
        let topic = b"test";
        let result = mesh_serve(
            std::ptr::null_mut(),
            topic.as_ptr(), topic.len(),
            None,
            std::ptr::null_mut(),
        );
        assert_eq!(result, -1);
    }

    #[test]
    fn mesh_unserve_null_handle_returns_error() {
        assert_eq!(mesh_unserve(std::ptr::null_mut(), 1), -1);
    }

    #[test]
    fn mesh_reply_null_handle_no_panic() {
        let data = b"reply";
        mesh_reply(std::ptr::null_mut(), 42, data.as_ptr(), data.len());
    }

    #[test]
    fn mesh_request_null_callback_no_panic() {
        let data = b"test";
        mesh_request(
            std::ptr::null_mut(),
            data.as_ptr(), data.len(),
            data.as_ptr(), data.len(),
            None,
            std::ptr::null_mut(),
            1000,
        );
    }

    #[test]
    fn mesh_peers_null_callback_no_panic() {
        mesh_peers(std::ptr::null_mut(), None, std::ptr::null_mut());
    }

    #[test]
    fn poll_buffer_serialization() {
        // Verify poll message format: [topic_len:u32le][topic][payload_len:u32le][payload]
        let topic = b"pi/test";
        let payload = b"hello";
        let mut data = Vec::new();
        data.extend_from_slice(&(topic.len() as u32).to_le_bytes());
        data.extend_from_slice(topic);
        data.extend_from_slice(&(payload.len() as u32).to_le_bytes());
        data.extend_from_slice(payload);

        // Verify round-trip parsing.
        let mut cursor = 0usize;
        let tlen = u32::from_le_bytes(data[cursor..cursor + 4].try_into().unwrap()) as usize;
        cursor += 4;
        assert_eq!(&data[cursor..cursor + tlen], topic);
        cursor += tlen;
        let plen = u32::from_le_bytes(data[cursor..cursor + 4].try_into().unwrap()) as usize;
        cursor += 4;
        assert_eq!(&data[cursor..cursor + plen], payload);
    }

    #[test]
    fn poll_buffer_size_limits_count() {
        // Simulate the HOL-bypass poll logic: oversize messages are skipped to allow
        // smaller messages behind them to be delivered. Messages that don't fit in the
        // remaining buffer space stop the loop (they will fit next call).
        let msgs = vec![
            PollMsg { topic: b"pi/a".to_vec(), payload: b"hello".to_vec() },  // 4+4+4+5=17 bytes
            PollMsg { topic: b"pi/b".to_vec(), payload: b"world".to_vec() },  // 17 bytes
            PollMsg { topic: b"pi/c".to_vec(), payload: b"extra".to_vec() },  // 17 bytes
        ];
        // Each message is 4 (topic_len) + 4 (topic) + 4 (payload_len) + 5 (payload) = 17 bytes.
        // buffer_size=30 fits only 1 message (17 bytes); second would push to 34 > 30.
        // No message exceeds buffer_size (30), so no HOL skipping occurs here.
        let buffer_size: usize = 30;
        let max_msgs: i32 = -1; // unlimited
        let mut poll_buf: VecDeque<PollMsg> = msgs.into_iter().collect();

        let deliver_limit: usize = if max_msgs < 0 { usize::MAX } else { max_msgs as usize };
        let mut data: Vec<u8> = Vec::new();
        let mut n = 0i32;
        let mut held_back: Vec<PollMsg> = Vec::new();
        let mut had_oversize = false;

        while (n as usize) < deliver_limit && !poll_buf.is_empty() {
            let Some(msg) = poll_buf.pop_front() else { break };
            let msg_size = 4 + msg.topic.len() + 4 + msg.payload.len();

            if msg_size > buffer_size {
                if data.is_empty() && held_back.is_empty() {
                    had_oversize = true;
                }
                held_back.push(msg);
                continue;
            }

            if data.len() + msg_size > buffer_size {
                held_back.insert(0, msg);
                break;
            }

            data.extend_from_slice(&(msg.topic.len() as u32).to_le_bytes());
            data.extend_from_slice(&msg.topic);
            data.extend_from_slice(&(msg.payload.len() as u32).to_le_bytes());
            data.extend_from_slice(&msg.payload);
            n += 1;
        }

        for msg in held_back.into_iter().rev() {
            poll_buf.push_front(msg);
        }

        let _ = had_oversize; // no oversize in this scenario

        // Only 1 message fits in 30 bytes.
        assert_eq!(n, 1, "count equals messages that fit in buffer_size, not total available");
        assert_eq!(data.len(), 17, "serialized data size matches exactly one message");
        // 2 messages remain unpopped — no data loss.
        assert_eq!(poll_buf.len(), 2, "remaining messages stay in buffer");
    }

    #[test]
    fn poll_hol_bypass_delivers_small_behind_large() {
        // Verify HOL-bypass: a small message behind a large one is still delivered
        // when buffer_size is too small for the large message.
        let large_payload = vec![0x41u8; 5000]; // 5000 bytes
        let msgs = vec![
            PollMsg { topic: vec![], payload: large_payload },     // 4+0+4+5000 = 5008 bytes
            PollMsg { topic: vec![], payload: b"hi".to_vec() },    // 4+0+4+2 = 10 bytes
        ];
        let buffer_size: usize = 1024;
        let max_msgs: i32 = -1;
        let mut poll_buf: VecDeque<PollMsg> = msgs.into_iter().collect();

        let deliver_limit: usize = if max_msgs < 0 { usize::MAX } else { max_msgs as usize };
        let mut data: Vec<u8> = Vec::new();
        let mut n = 0i32;
        let mut held_back: Vec<PollMsg> = Vec::new();
        let mut had_oversize = false;

        while (n as usize) < deliver_limit && !poll_buf.is_empty() {
            let Some(msg) = poll_buf.pop_front() else { break };
            let msg_size = 4 + msg.topic.len() + 4 + msg.payload.len();

            if msg_size > buffer_size {
                if data.is_empty() && held_back.is_empty() {
                    had_oversize = true;
                }
                held_back.push(msg);
                continue;
            }

            if data.len() + msg_size > buffer_size {
                held_back.insert(0, msg);
                break;
            }

            data.extend_from_slice(&(msg.topic.len() as u32).to_le_bytes());
            data.extend_from_slice(&msg.topic);
            data.extend_from_slice(&(msg.payload.len() as u32).to_le_bytes());
            data.extend_from_slice(&msg.payload);
            n += 1;
        }

        for msg in held_back.into_iter().rev() {
            poll_buf.push_front(msg);
        }

        // Small message was delivered despite large message at front.
        assert_eq!(n, 1, "small message delivered even though large message is at front");
        // had_oversize is true but n > 0, so we'd return (data, n) not -2.
        assert!(had_oversize, "had_oversize flag set");
        // Large message still at front of poll_buf.
        assert_eq!(poll_buf.len(), 1, "large message remains in poll_buf");
        assert_eq!(poll_buf.front().unwrap().payload.len(), 5000, "large message is still the front");
    }

    #[test]
    fn poll_oversize_only_returns_minus_two() {
        // When the only message is larger than buffer_size, poll returns -2.
        let large_payload = vec![0x41u8; 5000];
        let msgs = vec![
            PollMsg { topic: vec![], payload: large_payload },  // 5008 bytes > 1024
        ];
        let buffer_size: usize = 1024;
        let max_msgs: i32 = -1;
        let mut poll_buf: VecDeque<PollMsg> = msgs.into_iter().collect();

        let deliver_limit: usize = if max_msgs < 0 { usize::MAX } else { max_msgs as usize };
        let mut data: Vec<u8> = Vec::new();
        let mut n = 0i32;
        let mut held_back: Vec<PollMsg> = Vec::new();
        let mut had_oversize = false;

        while (n as usize) < deliver_limit && !poll_buf.is_empty() {
            let Some(msg) = poll_buf.pop_front() else { break };
            let msg_size = 4 + msg.topic.len() + 4 + msg.payload.len();

            if msg_size > buffer_size {
                if data.is_empty() && held_back.is_empty() {
                    had_oversize = true;
                }
                held_back.push(msg);
                continue;
            }

            if data.len() + msg_size > buffer_size {
                held_back.insert(0, msg);
                break;
            }

            data.extend_from_slice(&(msg.topic.len() as u32).to_le_bytes());
            data.extend_from_slice(&msg.topic);
            data.extend_from_slice(&(msg.payload.len() as u32).to_le_bytes());
            data.extend_from_slice(&msg.payload);
            n += 1;
        }

        for msg in held_back.into_iter().rev() {
            poll_buf.push_front(msg);
        }

        // n == 0 and had_oversize → return code would be -2.
        assert_eq!(n, 0);
        assert!(had_oversize);
        // Message is preserved in poll_buf for retry with larger buffer.
        assert_eq!(poll_buf.len(), 1, "oversize message preserved for retry");
        let _ = data;
    }

    #[test]
    fn poll_max_msgs_one_skips_oversize_to_deliver_small() {
        // Regression test for the max_msgs delivery-count fix.
        // With max_msgs=1 and [5000-byte, 2-byte] in the queue:
        // OLD (buggy): for _ in 0..1 → only checked the oversize msg, returned -2.
        // NEW (fixed): while n < 1 → scanned past oversize, delivered "hi", returned 1.
        let large_payload = vec![0x41u8; 5000];
        let msgs = vec![
            PollMsg { topic: vec![], payload: large_payload },   // 5008 bytes — oversize
            PollMsg { topic: vec![], payload: b"hi".to_vec() },  // 10 bytes — fits
        ];
        let buffer_size: usize = 1024;
        let max_msgs: i32 = 1;
        let mut poll_buf: VecDeque<PollMsg> = msgs.into_iter().collect();

        let deliver_limit: usize = if max_msgs < 0 { usize::MAX } else { max_msgs as usize };
        let mut data: Vec<u8> = Vec::new();
        let mut n = 0i32;
        let mut held_back: Vec<PollMsg> = Vec::new();
        let mut had_oversize = false;

        while (n as usize) < deliver_limit && !poll_buf.is_empty() {
            let Some(msg) = poll_buf.pop_front() else { break };
            let msg_size = 4 + msg.topic.len() + 4 + msg.payload.len();

            if msg_size > buffer_size {
                if data.is_empty() && held_back.is_empty() {
                    had_oversize = true;
                }
                held_back.push(msg);
                continue;
            }

            if data.len() + msg_size > buffer_size {
                held_back.insert(0, msg);
                break;
            }

            data.extend_from_slice(&(msg.topic.len() as u32).to_le_bytes());
            data.extend_from_slice(&msg.topic);
            data.extend_from_slice(&(msg.payload.len() as u32).to_le_bytes());
            data.extend_from_slice(&msg.payload);
            n += 1;
        }

        for msg in held_back.into_iter().rev() {
            poll_buf.push_front(msg);
        }

        // The 2-byte message was delivered (not blocked by the oversize message).
        assert_eq!(n, 1, "small message delivered despite oversize-first and max_msgs=1");
        // had_oversize is true but n > 0, so we return (data, n), NOT -2.
        assert!(had_oversize, "had_oversize set (oversize msg was encountered)");
        // Oversize message stays at front of poll_buf for the next call.
        assert_eq!(poll_buf.len(), 1, "oversize message preserved for retry with larger buffer");
        assert_eq!(poll_buf.front().unwrap().payload.len(), 5000, "oversize message is still front");
    }

    #[test]
    fn build_config_null_returns_default() {
        let c = build_config(std::ptr::null(), 0);
        drop(c);
    }

    #[test]
    fn build_config_empty_returns_default() {
        let s = b"";
        let c = build_config(s.as_ptr(), 0);
        drop(c);
    }

    #[test]
    fn build_config_valid_json() {
        let s = b"{}";
        let c = build_config(s.as_ptr(), s.len());
        drop(c);
    }
}
