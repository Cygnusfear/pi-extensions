// annotation-chart section {{id}}
(() => {
  const target = document.getElementById('{{id}}-target');
  const { data, annotations } = JSON.parse(document.getElementById('{{id}}-data').textContent);
  const W = {{width}}, H = {{height}}, M = { top: 24, right: 28, bottom: 40, left: 48 };
  const svg = d3.select(target).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%').attr('height', H)
    .style('display', 'block');
  const x = d3.scaleLinear().domain(d3.extent(data, d => d.x)).range([M.left, W - M.right]);
  const y = d3.scaleLinear()
    .domain([d3.min(data, d => d.y), d3.max(data, d => d.y)]).nice()
    .range([H - M.bottom, M.top]);
  svg.append('g').attr('transform', `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0))
    .call(g => g.select('.domain').attr('stroke', 'var(--rule-bright)'))
    .call(g => g.selectAll('.tick text').attr('fill', 'var(--text-dim)'));
  svg.append('g').attr('transform', `translate(${M.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickSizeOuter(0))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line').attr('stroke', 'var(--rule)').attr('x2', W - M.left - M.right))
    .call(g => g.selectAll('.tick text').attr('fill', 'var(--text-dim)'));
  svg.append('path').datum(data)
    .attr('fill', 'none').attr('stroke', 'var(--spot)').attr('stroke-width', 1.8)
    .attr('d', d3.line().x(d => x(d.x)).y(d => y(d.y)).curve(d3.curveMonotoneX));
  const g = svg.append('g').attr('class', 'annotations');
  annotations.forEach(a => {
    const cx = x(a.x), cy = y(a.y);
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 3).attr('fill', 'var(--spot)');
    g.append('text').attr('x', cx + (a.dx ?? 8)).attr('y', cy + (a.dy ?? -10))
      .attr('font-family', "var(--font-mono)").attr('font-size', 11)
      .attr('fill', 'var(--ink)').text(a.label);
  });
})();
