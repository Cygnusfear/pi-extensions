import type { MeshAskReceiptEnvelope, MeshAskReceiptPhase, MeshAskReceiptWaitForPhase } from "./types.ts";

export interface MeshAskEnvelope {
	kind: "mesh:ask";
	askId: string;
	from: string;
	payload: unknown;
	timestamp: number;
	receiptRequested?: MeshAskReceiptWaitForPhase;
	timeoutMs?: number;
}

export function createAskId(): string {
	return `mesh-ask-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isMeshAskEnvelope(payload: unknown): payload is MeshAskEnvelope {
	return !!payload
		&& typeof payload === "object"
		&& (payload as Record<string, unknown>).kind === "mesh:ask"
		&& typeof (payload as Record<string, unknown>).askId === "string"
		&& typeof (payload as Record<string, unknown>).from === "string";
}

export function isMeshAskReceiptEnvelope(payload: unknown): payload is MeshAskReceiptEnvelope {
	return !!payload
		&& typeof payload === "object"
		&& (payload as Record<string, unknown>).kind === "mesh:ask:receipt"
		&& typeof (payload as Record<string, unknown>).askId === "string";
}

export function buildMeshAskEnvelope(
	from: string,
	payload: unknown,
	askId: string,
	receiptRequested?: MeshAskReceiptWaitForPhase,
	timeoutMs?: number,
): MeshAskEnvelope {
	return {
		kind: "mesh:ask",
		askId,
		from,
		payload,
		timestamp: Date.now(),
		...(receiptRequested ? { receiptRequested } : {}),
		...(typeof timeoutMs === "number" ? { timeoutMs } : {}),
	};
}

export function buildMeshAskReceipt(
	askId: string,
	from: string,
	phase: MeshAskReceiptPhase,
): MeshAskReceiptEnvelope {
	return {
		kind: "mesh:ask:receipt",
		askId,
		from,
		phase,
		timestamp: Date.now(),
	};
}

export function appendMeshAskReceipt(
	receipts: MeshAskReceiptEnvelope[],
	receipt: MeshAskReceiptEnvelope,
): MeshAskReceiptEnvelope[] {
	const filtered = receipts.filter((existing) => existing.phase !== receipt.phase);
	return [...filtered, receipt].sort((a, b) => a.timestamp - b.timestamp);
}

export function formatMeshAskReceiptTrail(receipts: MeshAskReceiptEnvelope[]): string {
	if (receipts.length === 0) return "none";
	return receipts
		.map((receipt) => `${receipt.phase} by ${receipt.from}`)
		.join(" -> ");
}