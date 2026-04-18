// mermaid renderer — runs after mermaid is initialized
(async () => {
  for (const shell of document.querySelectorAll('.section--mermaid')) {
    const canvas = shell.querySelector('.mermaid-canvas');
    const source = shell.querySelector('.diagram-source');
    const label = shell.querySelector('.zoom-label');
    if (!canvas || !source) continue;
    try {
      const code = source.textContent.trim();
      if (!code) { if (label) label.textContent = 'Error: empty source'; continue; }
      const id = 'diagram-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      const { svg } = await mermaid.render(id, code);
      canvas.innerHTML = svg;
      const zp = initZoomPan(shell);
      if (zp) zp.onSvgReady();
    } catch (err) {
      console.error('Mermaid render failed:', err);
      if (label) label.textContent = 'Error: ' + (err.message || 'render failed');
    }
  }
})();
