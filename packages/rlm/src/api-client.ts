import { complete, type Message } from "@mariozechner/pi-ai";

export interface CompleteResponse {
	content: Array<{ type: string; text?: string }>;
	usage?: { input?: number; output?: number; inputTokens?: number; outputTokens?: number };
	stopReason?: string;
}

export async function completeRlm(model: unknown, request: { systemPrompt: string; messages: Message[] }, auth: { apiKey: string; headers?: Record<string, string>; signal?: AbortSignal }): Promise<CompleteResponse> {
	const testHook = (globalThis as any).__rlmCompleteMock;
	if (typeof testHook === "function") return testHook(model, request, auth) as Promise<CompleteResponse>;
	return complete(model as any, request as any, auth as any) as Promise<CompleteResponse>;
}
