// mermaid renderer — runs after mermaid is initialized.
// Resilient by design: a diagram that fails under the primary (elk) layout is
// retried with the default layout, and if it STILL fails the source is shown
// inline with the real error — a broken diagram never becomes an empty box.
(async () => {
  // mermaid.render(id, ...) appends a temporary measurement element to <body>
  // (id, or 'd'+id) and, on a parse error, leaves its "Syntax error in text"
  // bomb SVG orphaned there. Remove those so failed diagrams don't litter the
  // page bottom with bombs. Never touch anything inside a .mermaid-canvas.
  function cleanupOrphans(rid) {
    ['#' + rid, '#d' + rid].forEach(function (sel) {
      var nodes;
      try { nodes = document.querySelectorAll(sel); } catch (_) { return; }
      nodes.forEach(function (el) { if (!el.closest('.mermaid-canvas')) el.remove(); });
    });
  }

  function showError(shell, msg, code) {
    var canvas = shell.querySelector('.mermaid-canvas');
    var label = shell.querySelector('.zoom-label');
    if (label) label.textContent = 'Diagram error';
    if (!canvas) return;
    canvas.innerHTML = '';
    var pre = document.createElement('pre');
    pre.className = 'diagram-error';
    pre.textContent = 'Mermaid could not render this diagram.\n\nError: ' + msg + '\n\n--- source ---\n' + code;
    canvas.appendChild(pre);
  }

  var usedFallbackLayout = false;
  for (const shell of document.querySelectorAll('.section--mermaid')) {
    const canvas = shell.querySelector('.mermaid-canvas');
    const source = shell.querySelector('.diagram-source');
    const label = shell.querySelector('.zoom-label');
    if (!canvas || !source) continue;
    const code = source.textContent.trim();
    if (!code) { showError(shell, 'empty source', ''); continue; }
    const id = 'diagram-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

    try {
      const { svg } = await mermaid.render(id, code);
      canvas.innerHTML = svg;
      const zp = initZoomPan(shell);
      if (zp) zp.onSvgReady();
      cleanupOrphans(id);
      continue;
    } catch (err1) {
      console.error('Mermaid render failed (primary layout):', err1);
      cleanupOrphans(id);
      // Fallback 1 — retry with the built-in default layout (elk-independent).
      try {
        if (!usedFallbackLayout) { mermaid.initialize({ layout: 'default' }); usedFallbackLayout = true; }
        const { svg } = await mermaid.render(id + '-fb', code);
        canvas.innerHTML = svg;
        const zp = initZoomPan(shell);
        if (zp) zp.onSvgReady();
        if (label) label.textContent = 'default layout';
        cleanupOrphans(id + '-fb');
        continue;
      } catch (err2) {
        console.error('Mermaid render failed (default layout):', err2);
        cleanupOrphans(id + '-fb');
        // Fallback 2 — never lose content: show source + the real error.
        const msg = (err2 && err2.message) || (err1 && err1.message) || 'render failed';
        showError(shell, msg, code);
      }
    }
  }
})();
