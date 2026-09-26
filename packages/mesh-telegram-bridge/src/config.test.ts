import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseConfig, refreshTranscriptionEnv } from "./config.ts";
import { parseConfig } from "./config.ts";

const required = {
	TELEGRAM_BOT_TOKEN: "bot-token",
	HOOMAN_MESH_ID: "hooman-mesh-id",
};

describe("parseConfig voice contract", () => {
	test("uses one explicit global Fish voice model", () => {
		const config = parseConfig({ ...required, FISH_AUDIO_VOICE_ID: " chosen-global-model " });
		expect(config.fishVoiceId).toBe("chosen-global-model");
	});

	test("does not retain gender-scoped voice fallbacks", () => {
		const config = parseConfig({ ...required, FISH_AUDIO_VOICE_ID_MALE: "werner", FISH_AUDIO_VOICE_ID_FEMALE: "old-female" });
		expect(config.fishVoiceId).toBeUndefined();
	});
});

describe("transcription hot swap", () => {
	test("re-reads model list and order when the file changes, and restores the pre-file environment when a line is removed", () => {
		const dir = mkdtempSync(join(tmpdir(), "mesh-bridge-hotswap-"));
		const path = join(dir, "config.env");
		const modelsKey = "OPENROUTER_TRANSCRIPTION_MODELS";
		const orderKey = "TRANSCRIPTION_PROVIDER_ORDER";
		const before = { models: process.env[modelsKey], order: process.env[orderKey] };
		try {
			writeFileSync(path, `${modelsKey}=fish-audio/transcribe-1-pro\n${orderKey}=OpenRouter\n`);
			refreshTranscriptionEnv(path);
			expect(process.env[modelsKey]).toBe("fish-audio/transcribe-1-pro");
			expect(process.env[orderKey]).toBe("OpenRouter");

			// The cache is stamp-based, so force a later mtime for the rewrite.
			writeFileSync(path, `${modelsKey}=google/gemini-3.5-transcribe\n${orderKey}=OpenAI,OpenRouter\n`);
			const second = new Date(Date.now() + 2000);
			utimesSync(path, second, second);
			refreshTranscriptionEnv(path);
			expect(process.env[modelsKey]).toBe("google/gemini-3.5-transcribe");
			expect(process.env[orderKey]).toBe("OpenAI,OpenRouter");

			// Dropping the declarations returns the process to its pre-file state.
			writeFileSync(path, "TELEGRAM_BOT_TOKEN=unrelated\n");
			const third = new Date(Date.now() + 4000);
			utimesSync(path, third, third);
			refreshTranscriptionEnv(path);
			expect(process.env[modelsKey]).toBe(before.models);
			expect(process.env[orderKey]).toBe(before.order);
		} finally {
			if (before.models === undefined) delete process.env[modelsKey];
			else process.env[modelsKey] = before.models;
			if (before.order === undefined) delete process.env[orderKey];
			else process.env[orderKey] = before.order;
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
