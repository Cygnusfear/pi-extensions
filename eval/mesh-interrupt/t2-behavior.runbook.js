// ── mesh-interrupt eval · Tier-2 behavior harness ───────────────────────────
// Measures whether real LLM agents CHOOSE THE RIGHT PRIMITIVE given a situation.
// The sender's choice (mesh_tell vs mesh_interrupt + level) is read DETERMINISTICALLY
// from its tool call — no judge needed for the headline metric. Run from a live
// mesh-connected pi session.
//
//   await runbook.run({ name: "mesh-interrupt-t2", args: { root: process.cwd(), trials: 3 } })
//
const root = (args && args.root) || process.cwd();
const model = (args && args.model) || "claude-haiku-4-5";
const trials = (args && args.trials) || 3;
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const dir = `${root}/eval/mesh-interrupt/runs/t2-${ts}`;
const bId = "evalpeer" + Date.now().toString(36);
const tmuxName = "meshval2";
await Bash({ command: `mkdir -p ${dir}` });

// Scenarios: each frames a SITUATION (never names a primitive) + the correct choice.
const scenarios = [
  { id: "steer_correct", expect: "steer",
    prompt: (b) => `You are Alpha. Earlier you asked your colleague (mesh sessionId '${b}') to refactor auth.ts using library X. You just discovered X is DEPRECATED — they must use Y instead. They are MID-TASK working on it right now. Nothing destructive is happening and it is not an emergency, but you must correct them before they finish down the wrong path. Decide the appropriate mesh action and TAKE IT NOW.` },
  { id: "abort_correct", expect: "abort",
    prompt: (b) => `You are Alpha. Your colleague (mesh sessionId '${b}') is about to run 'git push --force origin main' RIGHT NOW — it will destroy shared history for the whole team. You must STOP them immediately, before the command executes. Decide the appropriate mesh action and TAKE IT NOW.` },
  { id: "tell_correct", expect: "tell",
    prompt: (b) => `You are Alpha. You have a MINOR, NON-URGENT FYI for your colleague (mesh sessionId '${b}'): the staging URL changed; they'll need it later, not now. They are busy. Decide the appropriate mesh action and TAKE IT NOW.` },
  { id: "abort_restraint", expect: "steer",
    prompt: (b) => `You are Alpha. You asked your colleague (mesh sessionId '${b}') to use approach A for a migration. You now think approach B is cleaner. They are mid-task on a long, SLOW step. It is not urgent and NOTHING is at risk — you'd just like them to switch before they go further. Decide the appropriate mesh action and TAKE IT NOW.` },
];
const selected = (args && args.only) ? scenarios.filter((s) => args.only.includes(s.id)) : scenarios;

const spawnAgent = ({ name, sessionId, prompt }) => {
  const a = ["--session-id", sessionId, "--session-dir", dir, "--model", model, "-p", prompt];
  const q = a.map((x) => `'${String(x).replace(/'/g, "'\\''")}'`).join(" ");
  return bashBgStart({ command: `cd ${root} && exec pi ${q} > ${dir}/${name}.out 2> ${dir}/${name}.err` });
};
const readAgent = async (sid) => { const c = await Bash({ command: `cat ${dir}/*_${sid}.jsonl 2>/dev/null` }).then((r) => r.stdout); return c.trim().split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); };
// Classify the sender's CHOSEN mesh primitive from its assistant tool-call blocks
// (pi stores calls as content blocks { type:"toolCall", name, arguments }). Reads the
// CHOICE even if the send later errors on the spawn-time discovery race.
const classify = (entries) => {
  for (const e of entries) {
    if (!(e.type === "message" && e.message?.role === "assistant" && Array.isArray(e.message.content))) continue;
    for (const b of e.message.content) {
      if (b.type !== "toolCall") continue;
      const a = b.arguments || {};
      if (b.name === "mesh_interrupt") return String(a.level || "steer") === "abort" ? "abort" : "steer";
      if (b.name === "mesh_tell") return "tell";
      if (b.name === "execute_code") {
        const code = String(a.code || "");
        if (/meshInterrupt|mesh\.interrupt/.test(code)) return /level\s*[:=]\s*["']?abort/.test(code) ? "abort" : "steer";
        if (/meshTell|mesh\.tell/.test(code)) return "tell";
      }
    }
  }
  return "none";
};

// ── Long-lived addressable peer (idle interactive pi in tmux) ───────────────
const piCmd = `cd ${root} && exec pi --session-id ${bId} --session-dir ${dir} --model ${model}`;
await Bash({ command: `tmux kill-session -t ${tmuxName} 2>/dev/null; tmux new-session -d -s ${tmuxName} -x 200 -y 50 ${JSON.stringify("bash -lc " + JSON.stringify(piCmd))}` });
let peer = null;
for (let i = 0; i < 20; i++) { await sleep(1500); const ps = JSON.parse(await meshPeers()); peer = ps.find((p) => (p.sessionId || "").startsWith(bId)); if (peer) break; }
if (!peer) { await Bash({ command: `tmux kill-session -t ${tmuxName} 2>/dev/null` }); return { ok: false, error: "peer never joined mesh" }; }
console.log(`peer live: ${peer.nickname} (${bId})`);

// ── Run scenarios × trials ──────────────────────────────────────────────────
const rows = [];
for (const sc of selected) {
  for (let t = 0; t < trials; t++) {
    const aid = `evalalpha${sc.id}${t}${Date.now().toString(36)}`;
    const h = spawnAgent({ name: aid, sessionId: aid, prompt: sc.prompt(bId) });
    await h.timeout(60000);
    await sleep(1000);
    const choice = classify(await readAgent(aid));
    const correct = choice === sc.expect;
    rows.push({ scenario: sc.id, expect: sc.expect, choice, correct });
    console.log(`${correct ? "✅" : "❌"} ${sc.id} trial ${t + 1}: chose ${choice} (expected ${sc.expect})`);
  }
}

// ── Aggregate ───────────────────────────────────────────────────────────────
await Bash({ command: `tmux kill-session -t ${tmuxName} 2>/dev/null` });
const byScenario = {};
for (const r of rows) { (byScenario[r.scenario] ||= []).push(r); }
const summary = Object.entries(byScenario).map(([s, rs]) => ({ scenario: s, expect: rs[0].expect, correctRate: rs.filter((r) => r.correct).length / rs.length, choices: rs.map((r) => r.choice) }));
// abort-overuse: abort chosen when steer/tell was correct
const overuse = rows.filter((r) => r.choice === "abort" && r.expect !== "abort").length;
const overuseRate = overuse / rows.length;
const correctRate = rows.filter((r) => r.correct).length / rows.length;
console.log(`\n=== T2: correct-primitive ${(correctRate * 100).toFixed(0)}% | abort-overuse ${(overuseRate * 100).toFixed(0)}% over ${rows.length} trials ===`);
return { ok: true, correctRate, overuseRate, trials: rows.length, summary, rows, runDir: dir };
