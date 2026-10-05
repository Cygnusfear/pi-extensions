import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** Length framing makes the script/style pair unambiguous. */
export function clientReleaseId(script: Uint8Array, style: Uint8Array): string {
	return createHash("sha256").update(String(script.byteLength) + ":").update(script).update(style).digest("hex");
}

/** A running server owns these verified bytes, never mutable build output. */
export async function readClientRelease(directory: string) {
	const [script, style, published] = await Promise.all([
		readFile(path.join(directory, "bundle.js")),
		readFile(path.join(directory, "bundle.css")),
		readFile(path.join(directory, "release-id"), "utf8"),
	]);
	const id = clientReleaseId(script, style);
	if (published.trim() !== id) throw new Error("Client release is incomplete or mixed; run bun run build-client before starting the server.");
	return { id, script, style } as const;
}
