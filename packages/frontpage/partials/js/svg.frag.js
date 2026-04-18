// svg section {{id}}
(() => {
  const shell = document.querySelector('[data-id="{{id}}"]');
  const zp = initZoomPan(shell);
  if (zp) zp.onSvgReady();
})();
