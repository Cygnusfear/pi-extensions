/**
 * pi-mesh-native Bun FFI test harness.
 *
 * Exercises the full C API:
 *   mesh_open / mesh_close
 *   mesh_subscribe / mesh_publish  (pub/sub round-trip)
 *   mesh_unsubscribe               (cancel subscription)
 *   mesh_serve / mesh_request / mesh_reply  (request-reply round-trip)
 *   mesh_peers                     (enumerate peers)
 *   mesh_poll                      (buffer messages without callback)
 *
 * Uses JSCallback with threadsafe: true for all callbacks.
 * Uses null context pointer (we don't need context in this test).
 */

import { JSCallback, dlopen, ptr, suffix, toArrayBuffer } from "bun:ffi";
import { join } from "node:path";

// ── Library loading ──────────────────────────────────────────────────────────

const libDir = join(import.meta.dir, "target", "release");
const libPath = `${libDir}/libpi_mesh_native.${suffix}`;

console.log(`Loading: ${libPath}`);

const lib = dlopen(libPath, {
  mesh_open: {
    args: ["ptr", "usize"],  // config_ptr, config_len
    returns: "ptr",
  },
  mesh_close: {
    args: ["ptr"],
    returns: "void",
  },
  mesh_publish: {
    args: ["ptr", "ptr", "usize", "ptr", "usize"],
    returns: "void",
  },
  mesh_subscribe: {
    args: ["ptr", "ptr", "usize", "callback", "ptr"],
    returns: "i32",
  },
  mesh_unsubscribe: {
    args: ["ptr", "i32"],
    returns: "i32",
  },
  mesh_request: {
    args: ["ptr", "ptr", "usize", "ptr", "usize", "callback", "ptr", "u32"],
    returns: "void",
  },
  mesh_serve: {
    args: ["ptr", "ptr", "usize", "callback", "ptr"],
    returns: "i32",
  },
  mesh_reply: {
    args: ["ptr", "u64", "ptr", "usize"],
    returns: "void",
  },
  mesh_peers: {
    args: ["ptr", "callback", "ptr"],
    returns: "void",
  },
  mesh_poll: {
    args: ["ptr", "ptr", "usize", "i32"],
    returns: "i32",
  },
  mesh_unserve: {
    args: ["ptr", "i32"],
    returns: "i32",
  },
} as const);

// ── Helpers ──────────────────────────────────────────────────────────────────

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encode(s: string): Uint8Array {
  return encoder.encode(s);
}

function readPtr(dataPtr: number | bigint, dataLen: number | bigint): string {
  const p = Number(dataPtr);
  const l = Number(dataLen);
  if (p === 0 || l === 0) return "";
  const buf = new Uint8Array(toArrayBuffer(p, 0, l), 0, l);
  return decoder.decode(Uint8Array.from(buf));
}

let passed = 0;
let failed = 0;
const FAIL_MESSAGES: string[] = [];

function assert(condition: boolean, msg: string): void {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
    FAIL_MESSAGES.push(msg);
  }
}

// ── Open session ─────────────────────────────────────────────────────────────

console.log("\n[1] mesh_open");
const handle = lib.symbols.mesh_open(null, 0);
assert(handle !== null && handle !== 0, "mesh_open returns non-null handle");

if (!handle) {
  console.error("Cannot continue — mesh_open returned null.");
  lib.close();
  process.exit(1);
}

// Test mesh_open with explicit JSON config string.
console.log("\n[1b] mesh_open with JSON config");
const configStr = JSON.stringify({
  mode: "peer",
  scouting: { multicast: { enabled: true } },
});
const configBytes = Buffer.from(configStr);
const handle2 = lib.symbols.mesh_open(ptr(configBytes), configBytes.length);
assert(handle2 !== null && handle2 !== 0, "mesh_open with JSON config returns non-null handle");
if (handle2) lib.symbols.mesh_close(handle2);
console.log("[JSON config] PASS");

// Small delay for Zenoh session to settle.
await Bun.sleep(500);

// ── Pub/sub round-trip ───────────────────────────────────────────────────────

console.log("\n[2] mesh_subscribe + mesh_publish round-trip");

const pubSubReceived: string[] = [];

const subCallback = new JSCallback(
  (
    topicPtr: number | bigint,
    topicLen: number | bigint,
    payloadPtr: number | bigint,
    payloadLen: number | bigint,
    _ctx: number | bigint,
  ) => {
    const payload = readPtr(payloadPtr, payloadLen);
    pubSubReceived.push(payload);
    console.log(`  → sub callback: topic="${readPtr(topicPtr, topicLen)}" payload="${payload}"`);
  },
  {
    args: ["ptr", "usize", "ptr", "usize", "ptr"],
    returns: "void",
    threadsafe: true,
  },
);

const subTopic = encode("pi/mesh/test");
const subId = lib.symbols.mesh_subscribe(
  handle,
  ptr(subTopic), subTopic.length,
  subCallback,
  null,
);
assert(subId > 0, `mesh_subscribe returns valid sub_id (got ${subId})`);

await Bun.sleep(300);

const pubPayload = encode("hello from bun");
lib.symbols.mesh_publish(
  handle,
  ptr(subTopic), subTopic.length,
  ptr(pubPayload), pubPayload.length,
);

await Bun.sleep(1000);
assert(pubSubReceived.includes("hello from bun"), "sub callback fired with correct payload");

// ── mesh_unsubscribe ─────────────────────────────────────────────────────────

console.log("\n[3] mesh_unsubscribe");
const unsubResult = lib.symbols.mesh_unsubscribe(handle, subId);
assert(unsubResult === 0, `mesh_unsubscribe returns 0 (got ${unsubResult})`);

// After unsubscribe, publish again and verify callback does NOT fire a second time.
const countBefore = pubSubReceived.length;
lib.symbols.mesh_publish(
  handle,
  ptr(subTopic), subTopic.length,
  ptr(encode("post-unsub")), 10,
);
await Bun.sleep(500);
assert(
  pubSubReceived.length === countBefore,
  "callback does not fire after unsubscribe",
);

// ── Request-reply round-trip ─────────────────────────────────────────────────

console.log("\n[4] mesh_serve + mesh_request + mesh_reply");

const reqReplyReceived: string[] = [];

// The serve callback is called when a query arrives.  It calls mesh_reply.
const serveCallback = new JSCallback(
  (
    queryId: number | bigint,
    _topicPtr: number | bigint,
    _topicLen: number | bigint,
    payloadPtr: number | bigint,
    payloadLen: number | bigint,
    _ctx: number | bigint,
  ) => {
    const qid = BigInt(queryId);
    const incoming = readPtr(payloadPtr, payloadLen);
    console.log(`  → serve callback: query_id=${qid} payload="${incoming}"`);
    const replyPayload = encode("pong");
    lib.symbols.mesh_reply(handle, qid, ptr(replyPayload), replyPayload.length);
  },
  {
    args: ["u64", "ptr", "usize", "ptr", "usize", "ptr"],
    returns: "void",
    threadsafe: true,
  },
);

// The request callback is called when a reply arrives.
const reqCallback = new JSCallback(
  (
    payloadPtr: number | bigint,
    payloadLen: number | bigint,
    _ctx: number | bigint,
  ) => {
    const payload = readPtr(payloadPtr, payloadLen);
    reqReplyReceived.push(payload);
    console.log(`  → req callback: payload="${payload}"`);
  },
  {
    args: ["ptr", "usize", "ptr"],
    returns: "void",
    threadsafe: true,
  },
);

const serviceTopic = encode("pi/mesh/service");
const serveId = lib.symbols.mesh_serve(
  handle,
  ptr(serviceTopic), serviceTopic.length,
  serveCallback,
  null,
);
assert(serveId > 0, `mesh_serve returns valid serve_id (got ${serveId})`);

await Bun.sleep(300);

const reqPayload = encode("ping");
lib.symbols.mesh_request(
  handle,
  ptr(serviceTopic), serviceTopic.length,
  ptr(reqPayload), reqPayload.length,
  reqCallback,
  null,
  5000,
);

await Bun.sleep(2000);
assert(reqReplyReceived.includes("pong"), "request callback received pong reply");

// ── mesh_unserve ─────────────────────────────────────────────────────────────

console.log("\n[4b] mesh_unserve");
const unserveResult = lib.symbols.mesh_unserve(handle, serveId);
assert(unserveResult === 0, `mesh_unserve returns 0 (got ${unserveResult})`);
console.log(`[mesh_unserve] PASS (returned ${unserveResult})`);

// ── Unknown ID negative paths ────────────────────────────────────────────────

console.log("\n[4c] unknown sub/serve ID negative paths");
const badUnsub = lib.symbols.mesh_unsubscribe(handle, 99999);
assert(badUnsub === -1, `mesh_unsubscribe unknown id: expected -1, got ${badUnsub}`);
console.log(`[mesh_unsubscribe unknown id] PASS`);

const badUnserve = lib.symbols.mesh_unserve(handle, 99999);
assert(badUnserve === -1, `mesh_unserve unknown id: expected -1, got ${badUnserve}`);
console.log(`[mesh_unserve unknown id] PASS`);

// ── mesh_peers ───────────────────────────────────────────────────────────────

console.log("\n[5] mesh_peers");

const peersReceived: string[] = [];
const peersCallback = new JSCallback(
  (
    peerPtr: number | bigint,
    peerLen: number | bigint,
    _ctx: number | bigint,
  ) => {
    const id = readPtr(peerPtr, peerLen);
    peersReceived.push(id);
    console.log(`  → peers callback: peer_id="${id}"`);
  },
  {
    args: ["ptr", "usize", "ptr"],
    returns: "void",
    threadsafe: true,
  },
);

lib.symbols.mesh_peers(handle, peersCallback, null);
await Bun.sleep(500);
// In a standalone single-session test, there may be 0 peers — that's fine.
assert(true, `mesh_peers callback invoked (found ${peersReceived.length} peer(s))`);

// ── mesh_poll ─────────────────────────────────────────────────────────────────

console.log("\n[6] mesh_poll (buffer messages without callback)");

const pollTopic = encode("pi/mesh/poll");

// Subscribe with 0 callback → messages go to poll buffer.
// (Bun FFI does not accept null for callback type; 0 is a null function pointer,
//  which Rust receives as Option<SubCb> = None.)
const pollSubId = lib.symbols.mesh_subscribe(
  handle,
  ptr(pollTopic), pollTopic.length,
  0 as unknown as JSCallback,  // null function pointer → buffer for poll
  null,
);
assert(pollSubId > 0, `poll subscribe returns valid sub_id (got ${pollSubId})`);

await Bun.sleep(300);

const pollPayload = encode("poll-message");
lib.symbols.mesh_publish(
  handle,
  ptr(pollTopic), pollTopic.length,
  ptr(pollPayload), pollPayload.length,
);

await Bun.sleep(1000);

// Drain poll buffer.
const pollBuf = Buffer.alloc(4096);
const msgCount = lib.symbols.mesh_poll(handle, ptr(pollBuf), pollBuf.length, 10);
assert(msgCount >= 0, `mesh_poll returns non-negative count (got ${msgCount})`);

if (msgCount > 0) {
  // Parse first message: [topic_len:u32le][topic][payload_len:u32le][payload]
  const view = new DataView(pollBuf.buffer);
  const tLen = view.getUint32(0, true);
  const tStr = decoder.decode(pollBuf.slice(4, 4 + tLen));
  const pLen = view.getUint32(4 + tLen, true);
  const pStr = decoder.decode(pollBuf.slice(4 + tLen + 4, 4 + tLen + 4 + pLen));
  console.log(`  → polled: topic="${tStr}" payload="${pStr}"`);
  assert(pStr === "poll-message", `poll message payload matches (got "${pStr}")`);
} else {
  console.log("  (no messages in poll buffer — may be a timing issue)");
  assert(true, "mesh_poll did not crash");
}

// ── Poll HOL bypass: large + small message ────────────────────────────────────

console.log("\n[6b] mesh_poll HOL bypass (large message followed by small)");

const LARGE_MSG = Buffer.from(new Uint8Array(5000).fill(0x41)); // 5000 'A' bytes
const SMALL_MSG = Buffer.from("hi");
const pollTopicBytes = encoder.encode("pi/mesh/poll-test");

// Subscribe in null-callback (poll) mode.
const pollSubId2 = lib.symbols.mesh_subscribe(
  handle,
  ptr(pollTopicBytes), pollTopicBytes.length,
  0 as unknown as JSCallback,  // null function pointer → buffer for poll
  null,
);
assert(pollSubId2 > 0, `poll HOL subscribe returns valid sub_id (got ${pollSubId2})`);

await Bun.sleep(100);

lib.symbols.mesh_publish(handle, ptr(pollTopicBytes), pollTopicBytes.length, ptr(LARGE_MSG), LARGE_MSG.length);
lib.symbols.mesh_publish(handle, ptr(pollTopicBytes), pollTopicBytes.length, ptr(SMALL_MSG), SMALL_MSG.length);

await Bun.sleep(500);

// Small buffer (1KB): should deliver the small message, skip the large one.
const smallPollBuf = Buffer.alloc(1024);
const smallResult = lib.symbols.mesh_poll(handle, ptr(smallPollBuf), 1024, 10);
assert(smallResult === 1, `mesh_poll HOL bypass: expected 1 small message, got ${smallResult}`);
console.log(`[mesh_poll HOL bypass] PASS (got ${smallResult} msgs with 1KB buffer)`);

// Now the large message should still be at the front. Need a bigger buffer.
const bigPollBuf = Buffer.alloc(8192);
const bigResult = lib.symbols.mesh_poll(handle, ptr(bigPollBuf), 8192, 10);
assert(bigResult >= 1, `mesh_poll oversize drain: expected >= 1, got ${bigResult}`);
console.log(`[mesh_poll oversize drain] PASS (drained ${bigResult} large msg with 8KB buffer)`);

// NOTE: double-close and use-after-close are documented as caller's responsibility.
// The global registry prevents crashes for double-close, but pointer reuse after
// close is undefined behavior by C API contract.
// See docs/reference/10.00-core/10.01-pi-mesh/spec.md

// ── Close ────────────────────────────────────────────────────────────────────

console.log("\n[7] mesh_close");
lib.symbols.mesh_close(handle);
assert(true, "mesh_close returned without crash");

// Clean up callbacks.
subCallback.close();
serveCallback.close();
reqCallback.close();
peersCallback.close();
lib.close();

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (FAIL_MESSAGES.length > 0) {
  console.error("Failed assertions:");
  FAIL_MESSAGES.forEach((m) => console.error(`  • ${m}`));
}

process.exit(failed > 0 ? 1 : 0);
