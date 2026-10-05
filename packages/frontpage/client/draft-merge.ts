/** Merge a kept draft onto the server's current records.
 *
 *  A draft is written against a known base. When the server has not moved the
 *  whole draft is still exactly right and is applied as-is. When it has moved,
 *  replacing the store would silently delete whatever the server gained — so we
 *  apply only the records this draft actually changed, and report the records
 *  both sides changed rather than guessing between them. */
export function storeRecords(snapshot: unknown): Record<string, unknown> {
	const parsed = snapshot as { document?: { store?: Record<string, unknown> } } | null | undefined;
	return parsed?.document?.store ?? {};
}

function same(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

export interface DraftMerge {
	/** Null when the merge cannot be applied honestly. */
	merged: unknown | null;
	/** Record ids changed by both the draft and the server. */
	conflicts: string[];
}

export function mergeDraft(base: unknown, draft: unknown, server: unknown): DraftMerge {
	const before = storeRecords(base);
	const kept = storeRecords(draft);
	const current = storeRecords(server);
	const merged: Record<string, unknown> = { ...current };
	const conflicts: string[] = [];
	for (const id of new Set([...Object.keys(before), ...Object.keys(kept)])) {
		if (same(before[id], kept[id])) continue;
		// Not ours to resolve: the server changed this record too.
		if (!same(before[id], current[id])) { conflicts.push(id); continue; }
		if (kept[id] === undefined) delete merged[id];
		else merged[id] = kept[id];
	}
	const source = draft as { document?: Record<string, unknown> } | null | undefined;
	return {
		merged: { ...source, document: { ...source?.document, store: merged } },
		conflicts,
	};
}
