import type { MeshAskReceiptEnvelope } from "./types.ts";

export interface MeshAskEnvelope {
	__meshFrom: string;
	__meshTs: number;
	__meshPayload: unknown;
	__meshAskId?: string;
	__meshAskReceiptRequested?: "delivered" | "visible";
}

export function isMeshAskEnvelope(payload: unknown): payload is MeshAskEnvelope {
	return !!payload
		&& typeof payload === "object"
		&& typeof (payload as Record<string, unknown>).__meshFrom === "string"
		&& "__meshPayload" in (payload as Record<string, unknown>);
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
	askId?: string,
	receiptRequested?: "delivered" | "visible",
): MeshAskEnvelope {
	return {
		__meshFrom: from,
		__meshTs: Date.now(),
		__meshPayload: payload,
		...(askId ? { __meshAskId: askId } : {}),
		...(receiptRequested ? { __meshAskReceiptRequested: receiptRequested } : {}),
	};
}

export function buildMeshAskReceipt(
	askId: string,
	from: string,
	phase: "delivered" | "visible",
): MeshAskReceiptEnvelope {
	return {
		kind: "mesh:ask:receipt",
		askId,
		from,
		phase,
		timestamp: Date.now(),
	};
}
