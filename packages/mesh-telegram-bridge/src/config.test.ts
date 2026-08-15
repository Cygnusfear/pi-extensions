import { describe, expect, test } from "bun:test";
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
