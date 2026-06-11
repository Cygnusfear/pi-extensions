// Decision Points — interactive answer round-trip. Runs inside the rendered
// frontpage (and inside the tldraw embed iframe). Click a choice (or type) →
// POST to the server → the agent reads it back via frontpage_read. The header
// pill + floating chip count down as you answer.
(function () {
  const SLUG = "{{slug}}";
  const api = () => "/api/page/" + encodeURIComponent(SLUG) + "/decision";
  const blocks = Array.from(document.querySelectorAll("[data-fp-decision]"));
  if (blocks.length === 0) return;

  const pill = document.querySelector("[data-fp-decisions-pill]");
  const pillCount = document.querySelector("[data-fp-pill-count]");
  const pillLabel = pill ? pill.querySelector(".fp-decisions-pill__label") : null;
  const chip = document.querySelector("[data-fp-decisions-chip]");
  const chipCount = document.querySelector("[data-fp-chip-count]");

  let answers = {}; // id -> { chosenKey?, text?, at }

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }
  function openBlocks() {
    return blocks.filter((b) => !answers[b.getAttribute("data-fp-decision")]);
  }
  function chosenLabel(b, key) {
    const el = b.querySelector('[data-fp-option="' + cssEscape(key) + '"] .fp-decision__opt-label');
    return el ? el.textContent.replace("Recommended", "").trim() : "";
  }
  function refresh() {
    const open = openBlocks().length;
    if (pillCount) pillCount.textContent = String(open);
    if (pillLabel) pillLabel.textContent = open === 0 ? "all decisions answered"
      : (open === 1 ? "decision needs you" : "decisions need you");
    if (pill) pill.classList.toggle("fp-decisions-pill--clear", open === 0);
    if (chip) { if (chipCount) chipCount.textContent = String(open); chip.hidden = open === 0; }
    blocks.forEach((b) => {
      const id = b.getAttribute("data-fp-decision");
      const a = answers[id];
      b.classList.toggle("fp-decision--resolved", !!a);
      const answeredEl = b.querySelector("[data-fp-answered]");
      const answeredText = b.querySelector("[data-fp-answered-text]");
      const foot = b.querySelector(".fp-decision__foot");
      b.querySelectorAll("[data-fp-option]").forEach((o) =>
        o.classList.toggle("is-chosen", !!a && o.getAttribute("data-fp-option") === a.chosenKey));
      if (a) {
        if (answeredText) {
          const lbl = a.chosenKey ? chosenLabel(b, a.chosenKey) : "";
          answeredText.textContent = lbl ? ("You chose " + lbl) : (a.text ? ('You answered: "' + a.text + '"') : "Answered");
        }
        if (answeredEl) answeredEl.hidden = false;
        if (foot) foot.hidden = true;
      } else {
        if (answeredEl) answeredEl.hidden = true;
        if (foot) foot.hidden = false;
      }
    });
  }
  function jumpTo(b) {
    b.scrollIntoView({ behavior: "smooth", block: "center" });
    b.classList.add("fp-decision--flash");
    setTimeout(() => b.classList.remove("fp-decision--flash"), 1200);
  }
  async function load() {
    try { const r = await fetch(api()); if (r.ok) answers = (await r.json()) || {}; } catch (e) {}
    refresh();
  }
  async function post(body) {
    try {
      await fetch(api(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    } catch (e) { console.error("[frontpage] decision save failed", e); }
  }

  blocks.forEach((b) => {
    const id = b.getAttribute("data-fp-decision");
    let pendingKey = null;
    b.querySelectorAll("[data-fp-option]").forEach((opt) => {
      opt.addEventListener("click", () => {
        pendingKey = opt.getAttribute("data-fp-option");
        b.querySelectorAll("[data-fp-option]").forEach((o) => o.classList.toggle("is-selected", o === opt));
      });
    });
    const submit = b.querySelector("[data-fp-submit]");
    if (submit) submit.addEventListener("click", () => {
      const textEl = b.querySelector("[data-fp-text]");
      const payload = { id: id };
      if (pendingKey) payload.chosenKey = pendingKey;
      if (textEl && textEl.value.trim()) payload.text = textEl.value.trim();
      if (!payload.chosenKey && !payload.text) {
        b.classList.add("fp-decision--nudge");
        setTimeout(() => b.classList.remove("fp-decision--nudge"), 500);
        return;
      }
      answers[id] = { chosenKey: payload.chosenKey, text: payload.text, at: Date.now() };
      refresh();
      post(payload);
    });
    const change = b.querySelector("[data-fp-change]");
    if (change) change.addEventListener("click", () => {
      delete answers[id]; pendingKey = null;
      b.querySelectorAll("[data-fp-option]").forEach((o) => o.classList.remove("is-selected", "is-chosen"));
      refresh();
      post({ id: id, clear: true });
    });
  });

  if (chip) chip.addEventListener("click", () => { const o = openBlocks(); if (o.length) jumpTo(o[0]); });
  if (pill) pill.addEventListener("click", (e) => { const o = openBlocks(); if (o.length) { e.preventDefault(); jumpTo(o[0]); } });

  load();
})();
