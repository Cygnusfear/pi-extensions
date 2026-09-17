// Pure finite playback state. Rendering and scheduling belong to the viewer.
export function createPlayback(flows, duration = 2400) {
  const state = { flow: 0, step: 0, progress: 0, playing: false, finished: false };
  const current = () => flows[state.flow]?.steps[state.step] ?? null;
  function restart() { Object.assign(state, { step: 0, progress: 0, playing: false, finished: false }); }
  return {
    state, current,
    choose(index) {
      if (!Number.isInteger(index) || !flows[index]) return false;
      state.flow = index; restart(); return true;
    },
    restart,
    pause() { state.playing = false; },
    play() { if (!current()) return; if (state.finished) restart(); state.playing = true; },
    step() {
      state.playing = false;
      if (!current()) return;
      if (state.step + 1 < flows[state.flow].steps.length) { state.step++; state.progress = 0; state.finished = false; }
      else { state.progress = 1; state.finished = true; }
    },
    tick(milliseconds) {
      if (!state.playing || !current() || !Number.isFinite(milliseconds) || milliseconds <= 0) return;
      state.progress += milliseconds / duration;
      while (state.progress >= 1) {
        if (state.step + 1 === flows[state.flow].steps.length) { state.progress = 1; state.playing = false; state.finished = true; break; }
        state.progress--; state.step++;
      }
    },
  };
}

export function pointOnRoute(points, fraction) {
  if (!points.length) return null;
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.z - points[i].z));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let remaining = Math.max(0, Math.min(1, fraction)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] && lengths[i] > 0) {
      const t = remaining / lengths[i];
      return { x: points[i].x + (points[i+1].x-points[i].x)*t, z: points[i].z + (points[i+1].z-points[i].z)*t };
    }
    remaining -= lengths[i];
  }
  return { ...points.at(-1) };
}
