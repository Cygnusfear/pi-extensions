export interface SandboxContext {
	cwd: string;
	images: Array<{ data: string; mimeType: string }>;
	signal?: AbortSignal;
}
