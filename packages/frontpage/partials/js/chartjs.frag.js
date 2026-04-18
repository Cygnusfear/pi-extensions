// chartjs section {{id}}
(() => {
  const cfg = JSON.parse(document.getElementById('{{id}}-config').textContent);
  new Chart(document.getElementById('{{id}}-canvas'), cfg);
})();
