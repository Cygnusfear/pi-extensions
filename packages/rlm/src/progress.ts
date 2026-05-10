import type { RlmEvent, RlmEventCallback, RlmEventType, RlmIdentity, RlmSnapshot, RlmStatus, RlmToolCallSummary } from "./types";

let nextIdentity = 1;

function slugify(value: string): string {
	const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
	return slug || "rlm";
}

export function resolveRlmIdentity(input: unknown): RlmIdentity {
	if (typeof input === "string" && input.trim()) {
		const name = input.trim();
		return { name, email: slugify(name) + "@rlm.pi-agent.local" };
	}
	if (input && typeof input === "object") {
		const obj = input as { name?: unknown; email?: unknown };
		const name = typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : "rlm-" + nextIdentity++;
		const email = typeof obj.email === "string" && obj.email.trim() ? obj.email.trim() : slugify(name) + "@rlm.pi-agent.local";
		return { name, email };
	}
	const name = "rlm-" + nextIdentity++;
	return { name, email: slugify(name) + "@rlm.pi-agent.local" };
}

export class RlmProgressMonitor {
	private snapshot: RlmSnapshot;
	private listeners = new Map<RlmEventType, Set<RlmEventCallback>>();

	constructor(identity: RlmIdentity) {
		const now = Date.now();
		this.snapshot = {
			status: "pending",
			identity,
			iteration: 0,
			usage: { input: 0, output: 0 },
			toolHistory: [],
			startedAt: now,
			updatedAt: now,
		};
	}

	inspect(): RlmSnapshot {
		return {
			...this.snapshot,
			identity: { ...this.snapshot.identity },
			usage: { ...this.snapshot.usage },
			lastToolCall: this.snapshot.lastToolCall ? { ...this.snapshot.lastToolCall } : undefined,
			toolHistory: this.snapshot.toolHistory.map((t) => ({ ...t })),
		};
	}

	on(type: RlmEventType, callback: RlmEventCallback): void {
		const set = this.listeners.get(type) ?? new Set<RlmEventCallback>();
		set.add(callback);
		this.listeners.set(type, set);
	}

	update(patch: Partial<Omit<RlmSnapshot, "identity" | "toolHistory" | "startedAt">> & { identity?: RlmIdentity }, eventType?: RlmEventType): void {
		const next: RlmSnapshot = {
			...this.snapshot,
			...patch,
			identity: patch.identity ?? this.snapshot.identity,
			usage: patch.usage ?? this.snapshot.usage,
			toolHistory: this.snapshot.toolHistory,
			updatedAt: Date.now(),
		};
		this.snapshot = next;
		if (eventType) this.emit(eventType);
	}

	recordTool(tool: RlmToolCallSummary): void {
		const history = [...this.snapshot.toolHistory, tool].slice(-50);
		this.snapshot = { ...this.snapshot, lastToolCall: tool, toolHistory: history, updatedAt: Date.now() };
		this.emit("tool");
	}

	emit(type: RlmEventType): void {
		const event: RlmEvent = { type, snapshot: this.inspect() };
		for (const cb of this.listeners.get(type) ?? []) {
			try { cb(event); } catch { /* listeners are observational; never break rlm */ }
		}
	}

	settle(status: Extract<RlmStatus, "resolved" | "failed" | "cancelled" | "timeout">, error?: string): void {
		this.update({ status, ...(error ? { error } : {}) }, status === "resolved" ? "return" : "error");
		this.emit("settled");
	}
}

export function summarizeAssistantMessage(message: any): string | undefined {
	const content = message?.content;
	if (!Array.isArray(content)) return typeof content === "string" ? content.slice(0, 500) : undefined;
	const text = content
		.map((part) => typeof part?.text === "string" ? part.text : part?.type === "toolCall" ? `[tool:${part.name ?? "unknown"}]` : "")
		.filter(Boolean)
		.join("\n")
		.trim();
	return text ? text.slice(0, 500) : undefined;
}

export function assistantToolCalls(message: any): RlmToolCallSummary[] {
	const content = message?.content;
	if (!Array.isArray(content)) return [];
	return content
		.filter((part) => part?.type === "toolCall")
		.map((part) => ({ name: String(part.name ?? "unknown"), arguments: part.arguments, timestamp: Date.now() }));
}
