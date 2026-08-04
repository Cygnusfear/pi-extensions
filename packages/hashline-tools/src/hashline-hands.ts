import {
	applyEditsToText,

	formatHashLines,
	type HashlineEdit,
} from "./hashline-core";

export interface HashlineSnapshot {
	/** Host-resolved stable path or resource id. */
	path: string;
	text: string;
	/** Opaque version used by compare-and-swap. */
	version: string;
}

export interface HashlineCompareAndSwapInput {
	path: string;
	expectedVersion: string;
	before: string;
	updated: string;
	displayPath: string;
}

export interface HashlineCompareAndSwapResult {
	changed: boolean;
	version: string;
	diffText: string;
}

export type HashlineAuthority =
	| { readonly kind: "host-filesystem" }
	| { readonly kind: "resource-namespace"; readonly namespace: string };

export type HashlineConsistency =
	| { readonly kind: "process-local-optimistic" }
	| { readonly kind: "storage-atomic" };

/**
 * Host-effects contract for hashline tools.
 *
 * Every real adapter declares and enforces its authority and consistency domain,
 * honors cancellation, and returns explicit failures. A no-op is not an adapter.
 * `process-local-optimistic` serializes cooperating calls only; it does not fence
 * external writers. `storage-atomic` guarantees compare-and-swap within the
 * declared resource namespace.
 */
export interface HashlineHands {
	readonly authority: HashlineAuthority;
	readonly consistency: HashlineConsistency;
	readText(path: string, signal?: AbortSignal): Promise<HashlineSnapshot>;
	compareAndSwapText(input: HashlineCompareAndSwapInput, signal?: AbortSignal): Promise<HashlineCompareAndSwapResult>;
}

export interface HashReadInput {
	path: string;
	startLine?: number;
	endLine?: number;
}

export interface HashReadOutcome {
	formatted: string;
	path: string;
	startLine: number;
	endLine: number | null;
	rawLines: string[];
	version: string;
}

export interface HashEditInput {
	path: string;
	/** Opaque version returned by an earlier read; when present, the adapter must reject an intervening write. */
	expectedVersion?: string;
	edits: HashlineEdit[];
}

export interface HashEditOutcome extends HashlineCompareAndSwapResult {
	path: string;
	appliedEdits: number;
	warnings: string[];
	summary: string;
}

function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) throw new DOMException("Operation aborted", "AbortError");
}

export async function runHashRead(
	hands: HashlineHands,
	input: HashReadInput,
	signal?: AbortSignal,
): Promise<HashReadOutcome> {
	throwIfAborted(signal);
	const snapshot = await hands.readText(input.path, signal);
	throwIfAborted(signal);
	const startLine = input.startLine ?? 1;
	const allLines = snapshot.text.split("\n");
	const endIndex = input.endLine ? Math.min(input.endLine, allLines.length) : allLines.length;
	return {
		formatted: formatHashLines(snapshot.text, startLine, input.endLine),
		path: snapshot.path,
		startLine,
		endLine: input.endLine ?? null,
		rawLines: allLines.slice(startLine - 1, endIndex),
		version: snapshot.version,
	};
}

export async function runHashEdit(
	hands: HashlineHands,
	input: HashEditInput,
	signal?: AbortSignal,
): Promise<HashEditOutcome> {
	throwIfAborted(signal);
	const snapshot = await hands.readText(input.path, signal);
	const { updated, appliedEdits, warnings } = applyEditsToText(snapshot.text, input.edits);
	throwIfAborted(signal);

	const write = updated === snapshot.text
		? { changed: false, version: snapshot.version, diffText: "" }
		: await hands.compareAndSwapText(
			{
				path: snapshot.path,
				expectedVersion: input.expectedVersion ?? snapshot.version,
				before: snapshot.text,
				updated,
				displayPath: input.path,
			},
			signal,
		);

	const warningText = warnings.length > 0 ? "\n\n" + warnings.join("\n") : "";
	return {
		...write,
		path: snapshot.path,
		appliedEdits,
		warnings,
		summary: `Applied ${appliedEdits} edit(s) to ${input.path}.${warningText}`,
	};
}
