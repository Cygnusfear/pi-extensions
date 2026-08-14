import { describe, expect, test } from "bun:test";
import { parseVoiceToggle } from "./voice-toggle.ts";

describe("parseVoiceToggle", () => {
	test("bare /voice enables", () => {
		expect(parseVoiceToggle("/voice")).toBe("on");
	});

	test("/voice subcommands with and without bot mention", () => {
		expect(parseVoiceToggle("/voice on")).toBe("on");
		expect(parseVoiceToggle("/voice@ramdock_bot off")).toBe("off");
		expect(parseVoiceToggle("/voice status")).toBe("status");
		expect(parseVoiceToggle("/voice@ramdock_bot")).toBe("on");
	});

	test("typed or transcribed exact phrases toggle", () => {
		expect(parseVoiceToggle("speak to me")).toBe("on");
		expect(parseVoiceToggle("Speak to me.")).toBe("on");
		expect(parseVoiceToggle("  SPEAK TO ME!  ")).toBe("on");
		expect(parseVoiceToggle("text only")).toBe("off");
		expect(parseVoiceToggle("Text only…")).toBe("off");
	});

	test("natural lead-ins still toggle", () => {
		expect(parseVoiceToggle("All right, speak to me.")).toBe("on");
		expect(parseVoiceToggle("Okay, text only!")).toBe("off");
		expect(parseVoiceToggle("So speak to me")).toBe("on");
		expect(parseVoiceToggle("Please, speak to me")).toBe("on");
	});

	test("near-miss phrases are not toggles", () => {
		expect(parseVoiceToggle("well, speak to me please")).toBeNull();
		expect(parseVoiceToggle("all right then, text only from here on")).toBeNull();
		expect(parseVoiceToggle("speak to me please")).toBeNull();
		expect(parseVoiceToggle("text only mode")).toBeNull();
		expect(parseVoiceToggle("hello there")).toBeNull();
		expect(parseVoiceToggle("/voice louder")).toBeNull();
		expect(parseVoiceToggle("")).toBeNull();
	});
});
