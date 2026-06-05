// ── mesh-interrupt eval · Tier-1 mechanism harness ──────────────────────────
// Run this from a LIVE, mesh-connected pi session (the controller IS the sender).
// It spawns an interactive pi receiver in a tmux pane (long-lived, so there is
// no -p exit-race), then drives 5 deterministic cross-process checks and asserts
// on ground-truth artifacts: the enriched ack + the receiver's session JSONL
// (the `error:"Aborted"` flag is the steer-vs-abort discriminator).
//
//   await runbook.run({ name: "mesh-interrupt-t1", args: { root: process.cwd() } })
//
const root = (args && args.root) || process.cwd();
const model = (args && args.model) || "claude-haiku-4-5";
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const dir = `${root}/eval/mesh-interrupt/runs/${ts}`;
const bId = "evalbravo" + Date.now().toString(36);
const tmuxName = "meshval";
await Bash({ command: `mkdir -p ${dir}` });

const readAgent = async () => {
  const cat = await Bash({ command: `cat ${dir}/*_${bId}.jsonl 2>/dev/null` }).then((r) => r.stdout);
  return cat.trim().split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
};
const findPeer = async () => {
  const ps = JSON.parse(await meshPeers());
  return ps.find((p) => (p.sessionId || "") === bId || (p.sessionId || "").startsWith(bId));
};
const sendKeys = (text) => Bash({ command: `tmux send-keys -t ${tmuxName} ${JSON.stringify(text)} Enter` });
const toolResults = (es) => es.filter((e) => e.type === "message" && e.message?.role === "toolResult");
const results = [];
const check = (id, name, ok, evidence) => { results.push({ id, name, result: ok ? "PASS" : "FAIL", evidence }); console.log(`${ok ? "✅" : "❌"} ${id} ${name} — ${evidence}`); };

// ── Launch long-lived interactive receiver in tmux ──────────────────────────
const piCmd = `cd ${root} && exec pi --session-id ${bId} --session-dir ${dir} --model ${model}`;
await Bash({ command: `tmux kill-session -t ${tmuxName} 2>/dev/null; tmux new-session -d -s ${tmuxName} -x 220 -y 50 ${JSON.stringify("bash -lc " + JSON.stringify(piCmd))}` });

// Discovery gate
let peer = null;
for (let i = 0; i < 20; i++) { await sleep(1500); peer = await findPeer(); if (peer) break; }
if (!peer) { await Bash({ command: `tmux kill-session -t ${tmuxName} 2>/dev/null` }); rlm.return ? null : null; console.log("FATAL: receiver never joined mesh"); return { ok: false, error: "receiver never joined mesh" }; }
console.log(`receiver live: ${peer.nickname} (${bId})`);

// ── T1 · enriched receipt, IDLE ─────────────────────────────────────────────
{
  const ack = JSON.parse(await meshTell({ sessionId: bId, message: "eval: idle receipt", waitFor: "delivered", timeoutMs: 12000 })).ack;
  check("T1-idle", "Enriched receipt, idle peer", ack && ack.receiverBusy === false && !!ack.view, `receiverBusy=${ack?.receiverBusy}, view=${!!ack?.view}`);
}

// ── T2 · enriched receipt, BUSY ─────────────────────────────────────────────
await sendKeys("Run this exact bash command and wait: sleep 45. Do nothing else until it finishes.");
await sleep(7000); // let it enter the busy window
{
  const ack = JSON.parse(await meshTell({ sessionId: bId, message: "eval: busy receipt", waitFor: "delivered", timeoutMs: 12000 })).ack;
  check("T2-busy", "Enriched receipt, busy peer", ack && ack.receiverBusy === true && ack.view?.entries?.length > 0, `receiverBusy=${ack?.receiverBusy}, viewEntries=${ack?.view?.entries?.length}`);
}

// ── T3 · ABORT cancels in-flight work ───────────────────────────────────────
// Wait for any prior task to finish, then start a 120s sleep and abort it.
await sleep(45000);
await sendKeys("Run this exact bash command and wait: sleep 120. Do nothing else.");
await sleep(9000); // mid-sleep
{
  const beforeN = toolResults(await readAgent()).length;
  const t0 = Date.now();
  JSON.parse(await meshInterrupt({ sessionId: bId, message: "eval: ABORT now", level: "abort", timeoutMs: 10000 }));
  let aborted = false, elapsed = 0;
  for (let i = 0; i < 8; i++) {
    await sleep(2000);
    const trs = toolResults(await readAgent());
    if (trs.length > beforeN) { aborted = /abort/i.test(JSON.stringify(trs[trs.length - 1].message.result || trs[trs.length - 1].message.details || "")); elapsed = (Date.now() - t0) / 1000; break; }
  }
  check("T3-abort", "Interrupt abort cancels in-flight work", aborted, `tool ended ~${elapsed}s after abort with error=Aborted (sleep was 120s)`);
}

// ── T4 · STEER does NOT kill work ───────────────────────────────────────────
await sleep(6000);
await sendKeys("Run this exact bash command and wait: sleep 20. Then say finished.");
await sleep(6000); // mid-sleep
{
  const beforeN = toolResults(await readAgent()).length;
  JSON.parse(await meshInterrupt({ sessionId: bId, message: "eval: STEER note", level: "steer", timeoutMs: 10000 }));
  await sleep(22000); // let the sleep 20 finish
  const trs = toolResults(await readAgent());
  const fresh = trs.slice(beforeN);
  const anyAborted = fresh.some((e) => /abort/i.test(JSON.stringify(e.message.result || e.message.details || "")));
  const surfaced = (await readAgent()).some((e) => /MESH INTERRUPT \(steer/i.test(JSON.stringify(e)));
  check("T4-steer", "Interrupt steer does NOT kill work", !anyAborted && surfaced, `aborted=${anyAborted} (expect false), banner surfaced=${surfaced}`);
}

// ── T5 · DEAFEN drops + reports receiverDeafened ────────────────────────────
await sleep(4000);
await sendKeys("/mesh deafen on");
await sleep(3000);
{
  const beforeN = (await readAgent()).length;
  const ack = JSON.parse(await meshTell({ sessionId: bId, message: "eval: you should NOT see this", waitFor: "delivered", timeoutMs: 10000 })).ack;
  await sleep(3000);
  const surfaced = (await readAgent()).some((e) => /should NOT see this/i.test(JSON.stringify(e)));
  check("T5-deafen", "Deafen drops + reports receiverDeafened", ack?.receiverDeafened === true && !surfaced, `receiverDeafened=${ack?.receiverDeafened}, surfaced=${surfaced}`);
  await sendKeys("/mesh deafen off");
}

// ── Teardown + report ───────────────────────────────────────────────────────
await Bash({ command: `tmux kill-session -t ${tmuxName} 2>/dev/null` });
const passed = results.filter((r) => r.result === "PASS").length;
console.log(`\n=== mesh-interrupt T1: ${passed}/${results.length} PASS ===`);
return { ok: passed === results.length, passed, total: results.length, results, runDir: dir };
