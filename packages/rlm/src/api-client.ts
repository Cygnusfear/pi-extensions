import { complete, type Context, type Model, type ProviderStreamOptions } from "@mariozechner/pi-ai";
import type { RlmCompleteFn } from "./types";

export type CompleteResponse = Awaited<ReturnType<typeof complete>>;

export async function completeRlm(completeFn: RlmCompleteFn | undefined, model: Model<any>, request: Context, auth: ProviderStreamOptions): Promise<CompleteResponse> {
	const fn = completeFn ?? complete;
	return fn(model, request, auth);
}
