// Decision Points — interactive answer round-trip. Runs inside the rendered
// frontpage (and inside the tldraw embed iframe). Pick a choice (or type) →
// POST to the server → the agent reads it back via frontpage_read.
//
// Honesty rules this fragment enforces, because a control that claims a save
// which did not happen is worse than no control:
//   - the block is marked answered only AFTER the server confirms the write
//   - a failed write keeps the draft and the selection, and says so loudly
//   - a write carries the revision the page was rendered from, so a page that
//     moved on is refused instead of racing it
//   - an answer whose question has since changed shows as needing a new answer
//     rather than as the answer to the question now on screen
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

  let answers = {};
  let revision;
  const inflight = {};

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }
  function idOf(b) {
    return b.getAttribute("data-fp-decision");
  }
  function isStale(id) {
    return !!(answers[id] && answers[id].stale === true);
  }
  // A block still needs the operator when it has no answer, or when its stored
  // answer no longer matches the question being shown.
  function openBlocks() {
    return blocks.filter(function (b) {
      const id = idOf(b);
      return !answers[id] || isStale(id);
    });
  }
  function chosenLabel(b, key) {
    const el = b.querySelector('[data-fp-option="' + cssEscape(key) + '"] .fp-decision__opt-label');
    return el ? el.textContent.replace("Recommended", "").trim() : "";
  }
  function describeAnswer(b, a) {
    if (!a) return "";
    if (a.chosenKey) return chosenLabel(b, a.chosenKey) || a.chosenKey;
    if (a.text) return '"' + a.text + '"';
    return "";
  }
  function setState(b, text, kind) {
    const node = b.querySelector("[data-fp-state]");
    if (!node) return;
    node.textContent = text || "";
    node.className = "fp-decision__state" + (kind ? " fp-decision__state--" + kind : "");
  }
  function refresh() {
    const open = openBlocks().length;
    if (pillCount) pillCount.textContent = String(open);
    if (pillLabel) {
      pillLabel.textContent =
        open === 0 ? "all decisions answered" : open === 1 ? "decision needs you" : "decisions need you";
    }
    if (pill) pill.classList.toggle("fp-decisions-pill--clear", open === 0);
    if (chip) {
      if (chipCount) chipCount.textContent = String(open);
      chip.hidden = open === 0;
    }
    blocks.forEach(function (b) {
      const id = idOf(b);
      const a = answers[id];
      const answeredEl = b.querySelector("[data-fp-answered]");
      const answeredText = b.querySelector("[data-fp-answered-text]");
      const foot = b.querySelector(".fp-decision__foot");
      const stale = isStale(id);
      b.classList.toggle("fp-decision--resolved", !!a && !stale);
      b.classList.toggle("fp-decision--needs-review", stale);
      b.querySelectorAll("[data-fp-option]").forEach(function (o) {
        o.classList.toggle("is-chosen", !!a && !stale && o.getAttribute("data-fp-option") === a.chosenKey);
      });
      const textEl = b.querySelector("[data-fp-text]");
      if (a && stale) {
        if (answeredEl) answeredEl.hidden = true;
        if (foot) foot.hidden = false;
        if (answeredText) answeredText.textContent = "";
        setState(
          b,
          "Needs a new answer: " + (a.reason || "the question changed") +
            (a.chosenKey || a.text ? " (earlier answer: " + describeAnswer(b, a) + ")" : ""),
          "stale",
        );
        if (textEl && !textEl.value && a.text) textEl.value = a.text;
        return;
      }
      if (a) {
        if (answeredText) answeredText.textContent = "You chose " + (describeAnswer(b, a) || "an answer");
        if (answeredEl) answeredEl.hidden = false;
        if (foot) foot.hidden = true;
        setState(b, "", null);
        return;
      }
      if (answeredEl) answeredEl.hidden = true;
      if (foot) foot.hidden = false;
      if (!inflight[id]) setState(b, "", null);
    });
  }
  function jumpTo(b) {
    b.scrollIntoView({ behavior: "smooth", block: "center" });
    b.classList.add("fp-decision--flash");
    setTimeout(function () {
      b.classList.remove("fp-decision--flash");
    }, 1200);
  }
  function post(body) {
    return fetch(api(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (response) {
      return response
        .json()
        .catch(function () {
          return {};
        })
        .then(function (payload) {
          if (!response.ok) {
            throw new Error((payload && payload.error) || "HTTP " + response.status);
          }
          return payload;
        });
    });
  }
  function load() {
    return fetch(api())
      .then(function (r) {
        return r.json();
      })
      .then(function (payload) {
        if (payload && typeof payload === "object" && payload.answers) {
          answers = payload.answers || {};
          revision = payload.revision;
        } else if (payload && typeof payload === "object") {
          answers = payload;
        }
        refresh();
      })
      .catch(function () {
        // Unknown state is the safe direction: with no answers loaded, every
        // decision still counts as needing the operator.
        refresh();
      });
  }

  blocks.forEach(function (b) {
    const id = idOf(b);
    const submit = b.querySelector("[data-fp-submit]");
    const clear = b.querySelector("[data-fp-change]");
    const textEl = b.querySelector("[data-fp-text]");
    b.querySelectorAll("[data-fp-option]").forEach(function (opt) {
      opt.addEventListener("click", function () {
        b.querySelectorAll("[data-fp-option]").forEach(function (o) {
          o.classList.toggle("is-selected", o === opt);
        });
      });
    });
    if (submit) {
      submit.addEventListener("click", function () {
        if (inflight[id]) return;
        const selected = b.querySelector("[data-fp-option].is-selected, [data-fp-option].is-chosen");
        const payload = { id: id };
        if (selected) payload.chosenKey = selected.getAttribute("data-fp-option");
        if (textEl && textEl.value.trim()) payload.text = textEl.value.trim();
        if (!payload.chosenKey && !payload.text) {
          b.classList.add("fp-decision--nudge");
          setTimeout(function () {
            b.classList.remove("fp-decision--nudge");
          }, 500);
          setState(b, "Pick an option or write an answer first.", "fail");
          return;
        }
        if (revision !== undefined) payload.expectedRevision = revision;
        inflight[id] = true;
        submit.disabled = true;
        setState(b, "Saving\u2026", "pending");
        post(payload)
          .then(function (res) {
            answers[id] = {
              chosenKey: payload.chosenKey,
              text: payload.text,
              at: res && res.answer ? res.answer.at : Date.now(),
            };
            delete answers[id].stale;
            setState(b, "Saved.", "ok");
            refresh();
          })
          .catch(function (error) {
            // The draft stays exactly as typed, the selection stays picked, and
            // the block is NOT marked answered.
            setState(
              b,
              "Not saved: " + error.message + " \u2014 your answer is still here, try again.",
              "fail",
            );
          })
          .then(function () {
            inflight[id] = false;
            submit.disabled = false;
          });
      });
    }
    if (clear) {
      clear.addEventListener("click", function () {
        if (inflight[id]) return;
        const previous = answers[id];
        inflight[id] = true;
        clear.disabled = true;
        setState(b, "Withdrawing\u2026", "pending");
        const body = { id: id, clear: true };
        if (revision !== undefined) body.expectedRevision = revision;
        post(body)
          .then(function () {
            delete answers[id];
            setState(b, "Withdrawn.", "ok");
            refresh();
          })
          .catch(function (error) {
            // Keep showing the answer that is still on record.
            answers[id] = previous;
            setState(b, "Not withdrawn: " + error.message, "fail");
          })
          .then(function () {
            inflight[id] = false;
            clear.disabled = false;
          });
      });
    }
  });

  if (chip) {
    chip.addEventListener("click", function () {
      const o = openBlocks();
      if (o.length) jumpTo(o[0]);
    });
  }
  if (pill) {
    pill.addEventListener("click", function (e) {
      const o = openBlocks();
      if (o.length) {
        e.preventDefault();
        jumpTo(o[0]);
      }
    });
  }

  load();
})();
