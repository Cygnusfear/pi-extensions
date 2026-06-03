// Frontpage zoom/pan controller — generic, works on any .diagram-shell that contains:
//   .mermaid-wrap / .chart-wrap / .svg-wrap / .d3-wrap (the clickable container)
//   .mermaid-viewport (the clipping window)
//   .mermaid-canvas  (the transformed layer holding an <svg>)
//   [data-action="zoom-in|zoom-out|zoom-fit|zoom-one|zoom-expand"] buttons
//   .zoom-label (readout)
//
// Called once per diagram shell. Safe to invoke after the SVG is attached.
export function initZoomPan(shell, opts = {}) {
  const config = {
    fitPadding: 28,
    minHeight: 360,
    maxHeightPx: 960,
    maxHeightVh: 0.84,
    maxInitialZoom: 1.8,
    minZoom: 0.08,
    maxZoom: 6.5,
    zoomStep: 0.14,
    readabilityFloor: 0.58,
    ...opts,
  };
  const wrap = shell.querySelector('.mermaid-wrap, .chart-wrap, .svg-wrap, .d3-wrap');
  const viewport = shell.querySelector('.mermaid-viewport');
  const canvas = shell.querySelector('.mermaid-canvas');
  const label = shell.querySelector('.zoom-label');
  if (!wrap || !viewport || !canvas) return null;

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  let zoom = 1, fitMode = 'contain', panX = 0, panY = 0, svgW = 0, svgH = 0;
  let sx = 0, sy = 0, spx = 0, spy = 0, touchDist = 0, touchCx = 0, touchCy = 0;
  let activeDrag = null;

  function constrainPan() {
    const vpW = viewport.clientWidth, vpH = viewport.clientHeight;
    const rW = svgW * zoom, rH = svgH * zoom, pad = config.fitPadding;
    panX = (rW + pad * 2 <= vpW) ? (vpW - rW) / 2 : clamp(panX, vpW - rW - pad, pad);
    panY = (rH + pad * 2 <= vpH) ? (vpH - rH) / 2 : clamp(panY, vpH - rH - pad, pad);
  }
  function applyTransform() {
    const svg = canvas.querySelector('svg');
    if (!svg || !svgW) return;
    constrainPan();
    svg.style.width = (svgW * zoom) + 'px';
    svg.style.height = (svgH * zoom) + 'px';
    canvas.style.transform = `translate(${panX}px, ${panY}px)`;
    if (label) label.textContent = Math.round(zoom * 100) + '% \u2014 ' + fitMode;
  }
  function canPan() {
    const rW = svgW * zoom, rH = svgH * zoom;
    return rW + config.fitPadding * 2 > viewport.clientWidth ||
           rH + config.fitPadding * 2 > viewport.clientHeight;
  }
  function computeSmartFit() {
    const vpW = viewport.clientWidth, vpH = viewport.clientHeight;
    const aW = Math.max(80, vpW - config.fitPadding * 2);
    const aH = Math.max(80, vpH - config.fitPadding * 2);
    const contain = Math.min(aW / svgW, aH / svgH);
    let z = contain, mode = 'contain';
    if (contain < config.readabilityFloor) {
      const chartR = svgH / svgW, vpR = vpH / Math.max(vpW, 1);
      if (chartR >= vpR) { z = aW / svgW; mode = 'width-priority'; }
      else { z = aH / svgH; mode = 'height-priority'; }
    }
    return { zoom: clamp(z, config.minZoom, config.maxInitialZoom), mode };
  }
  function fitDiagram() {
    if (!svgW) return;
    const fit = computeSmartFit();
    zoom = fit.zoom; fitMode = fit.mode;
    panX = (viewport.clientWidth - svgW * zoom) / 2;
    panY = (viewport.clientHeight - svgH * zoom) / 2;
    applyTransform();
  }
  function setOneToOne() {
    zoom = clamp(1, config.minZoom, config.maxZoom); fitMode = '1:1';
    panX = (viewport.clientWidth - svgW * zoom) / 2;
    panY = (viewport.clientHeight - svgH * zoom) / 2;
    applyTransform();
  }
  function zoomAround(factor, cx, cy) {
    const next = clamp(zoom * factor, config.minZoom, config.maxZoom);
    const ratio = next / zoom;
    panX = cx - ratio * (cx - panX);
    panY = cy - ratio * (cy - panY);
    zoom = next; fitMode = 'custom'; applyTransform();
  }
  function readSvgNaturalSize(svg) {
    let w = 0, h = 0;
    if (svg.viewBox?.baseVal?.width > 0) { w = svg.viewBox.baseVal.width; h = svg.viewBox.baseVal.height; }
    if (!w) { w = parseFloat(svg.getAttribute('width')) || 0; h = parseFloat(svg.getAttribute('height')) || 0; }
    if (!w) { const b = svg.getBBox(); w = b.width; h = b.height; }
    if (!w) { const r = svg.getBoundingClientRect(); w = r.width || 1000; h = r.height || 700; }
    if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    return { w, h };
  }
  function setAdaptiveHeight() {
    if (!svgW) return;
    const usableW = Math.max(280, wrap.getBoundingClientRect().width - 2);
    const idealH = (svgH / svgW) * usableW + config.fitPadding * 2;
    // Embedded (tldraw iframe auto-sized to content): the "viewport" IS the
    // thing we're sizing, so a vh-based height chases itself infinitely. Use a
    // fixed px cap — idealH is width-driven and stable. Standalone page: keep
    // the vh-aware cap so big diagrams use the available screen.
    var embedded = false; try { embedded = window.self !== window.top; } catch (_) { embedded = true; }
    const maxVp = embedded ? config.maxHeightPx : Math.floor(innerHeight * config.maxHeightVh);
    const hardMax = Math.min(config.maxHeightPx, Math.max(config.minHeight + 40, maxVp));
    wrap.style.height = Math.round(clamp(idealH, config.minHeight, hardMax)) + 'px';
  }
  function openInNewTab() {
    const svg = canvas.querySelector('svg'); if (!svg) return;
    const clone = svg.cloneNode(true); clone.style.width = ''; clone.style.height = '';
    const html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Diagram</title>' +
      '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
      'background:#ffffff;padding:40px;box-sizing:border-box}svg{max-width:100%;max-height:90vh;height:auto}' +
      '</style></head><body>' + clone.outerHTML + '</body></html>';
    open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
  }

  const actions = {
    'zoom-in': () => zoomAround(1 + config.zoomStep, viewport.clientWidth / 2, viewport.clientHeight / 2),
    'zoom-out': () => zoomAround(1 / (1 + config.zoomStep), viewport.clientWidth / 2, viewport.clientHeight / 2),
    'zoom-fit': fitDiagram,
    'zoom-one': setOneToOne,
    'zoom-expand': openInNewTab,
  };
  Object.entries(actions).forEach(([a, h]) => {
    wrap.querySelector(`[data-action="${a}"]`)?.addEventListener('click', h);
  });
  viewport.addEventListener('dblclick', fitDiagram);
  viewport.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1 + config.zoomStep : 1 / (1 + config.zoomStep);
      zoomAround(factor, e.clientX - rect.left, e.clientY - rect.top); return;
    }
    if (canPan()) { e.preventDefault(); panX -= e.deltaX; panY -= e.deltaY; applyTransform(); }
  }, { passive: false });
  viewport.addEventListener('mousedown', (e) => {
    if (e.target.closest('.zoom-controls') || !canPan()) return;
    wrap.classList.add('is-panning');
    sx = e.clientX; sy = e.clientY; spx = panX; spy = panY; e.preventDefault();
    activeDrag = {
      onMove: (ev) => { panX = spx + (ev.clientX - sx); panY = spy + (ev.clientY - sy); applyTransform(); },
      onEnd: () => wrap.classList.remove('is-panning'),
    };
  });
  addEventListener('mousemove', (e) => activeDrag?.onMove(e));
  addEventListener('mouseup', () => { activeDrag?.onEnd(); activeDrag = null; });
  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; spx = panX; spy = panY; }
    else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDist = Math.sqrt(dx*dx + dy*dy);
      const r = viewport.getBoundingClientRect();
      touchCx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left;
      touchCy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
    }
  }, { passive: true });
  viewport.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && canPan()) {
      if (touchDist > 0) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; spx = panX; spy = panY; touchDist = 0; }
      e.preventDefault();
      panX = spx + (e.touches[0].clientX - sx);
      panY = spy + (e.touches[0].clientY - sy);
      applyTransform();
    } else if (e.touches.length === 2 && touchDist > 0) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const d = Math.sqrt(dx*dx + dy*dy);
      zoomAround(d / touchDist, touchCx, touchCy);
      touchDist = d;
    }
  }, { passive: false });
  new ResizeObserver(() => { if (svgW) { setAdaptiveHeight(); fitDiagram(); } }).observe(wrap);

  return {
    onSvgReady() {
      const svg = canvas.querySelector('svg'); if (!svg) return;
      const size = readSvgNaturalSize(svg);
      svgW = size.w; svgH = size.h;
      svg.removeAttribute('width'); svg.removeAttribute('height');
      svg.style.maxWidth = 'none'; svg.style.display = 'block';
      setAdaptiveHeight();
      fitDiagram();
    },
    fit: fitDiagram,
  };
}
