// d3 section {{id}}
(() => {
  const target = document.getElementById('{{id}}-target');
  const data = JSON.parse(document.getElementById('{{id}}-data').textContent);
  const width = {{width}};
  const height = {{height}};
  const shell = target.closest('.diagram-shell');
  const zp = initZoomPan(shell);
  (function userScript() {
{{script}}
  })();
  if (zp && target.querySelector('svg')) zp.onSvgReady();
})();
