export function combineSignals(signals: AbortSignal[]): AbortSignal {
	const live = signals.filter(Boolean);
	if (live.length === 1) return live[0];
	return AbortSignal.any(live);
}
