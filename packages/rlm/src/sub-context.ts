export async function createRlmSubContext() {
	const mod = await import("@pi-extensions/code-mode" + "/session-factory");
	return mod.createCodeModeSession();
}
