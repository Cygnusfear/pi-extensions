import { describe, expect, test } from "bun:test";
import type { Theme } from "@earendil-works/pi-coding-agent";
import { renderSegment } from "./segments";
import type { SegmentContext } from "./types";

const plainTheme = {
	fg: (_color: unknown, text: string) => text,
	bg: (_color: unknown, text: string) => text,
} as Theme;

function makeContext(overrides: Partial<SegmentContext>): SegmentContext {
	return {
		model: undefined,
		thinkingLevel: "off",
		sessionId: undefined,
		sessionName: undefined,
		usageStats: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 },
		contextTokens: null,
		contextPercent: null,
		contextWindow: 200_000,
		autoCompactEnabled: true,
		usingSubscription: false,
		sessionStartTime: Date.now(),
		git: { branch: null, staged: 0, unstaged: 0, untracked: 0 },
		getGitStatus: () => ({ branch: null, staged: 0, unstaged: 0, untracked: 0 }),
		extensionStatuses: new Map(),
		options: {},
		width: 120,
		theme: plainTheme,
		colors: {},
		...overrides,
	};
}

describe("powerline context segment", () => {
	test("renders unknown context percent after compaction without falling back to stale usage", () => {
		const rendered = renderSegment("context_pct", makeContext({ contextPercent: null }));

		expect(rendered.visible).toBe(true);
		expect(rendered.content).toContain("?/200k");
		expect(rendered.content).not.toContain("95.0%");
	});

	test("renders known context percent normally", () => {
		const rendered = renderSegment("context_pct", makeContext({ contextPercent: 42.5 }));

		expect(rendered.visible).toBe(true);
		expect(rendered.content).toContain("42.5%/200k");
	});
});
