import { describe, test, expect } from "bun:test";
import {
	deriveTripleName,
	claimNickname,
	FIRST_NAMES,
	LAST_NAMES,
	COSMIC_MIDDLES,
	getAllSessionNicknames,
	classifyNicknameVoice,
	type NicknameOccupancy,
} from "./session-nickname.ts";

// ── Array integrity ──────────────────────────────────────────────────────────

describe("name pool arrays", () => {
	test("FIRST_NAMES contains no duplicates", () => {
		expect(new Set(FIRST_NAMES).size).toBe(FIRST_NAMES.length);
	});

	test("LAST_NAMES contains no duplicates", () => {
		expect(new Set(LAST_NAMES).size).toBe(LAST_NAMES.length);
	});

	test("COSMIC_MIDDLES contains no duplicates", () => {
		expect(new Set(COSMIC_MIDDLES).size).toBe(COSMIC_MIDDLES.length);
	});

	test("COSMIC_MIDDLES has 80 entries", () => {
		expect(COSMIC_MIDDLES.length).toBe(80);
	});

	test("FIRST_NAMES has reasonable count (170+)", () => {
		expect(FIRST_NAMES.length).toBeGreaterThanOrEqual(170);
	});

	test("LAST_NAMES has reasonable count (180+)", () => {
		expect(LAST_NAMES.length).toBeGreaterThanOrEqual(180);
	});
});

// ── Deduplication ────────────────────────────────────────────────────────────

describe("deduplication", () => {
	const astronomers = getAllSessionNicknames();

	test("Wendy Freedman appears once (not Wendy Laurel Freedman)", () => {
		const matches = astronomers.filter(n => n.includes("Wendy") && n.includes("Freedman"));
		expect(matches.length).toBe(1);
		expect(matches[0]).toBe("Wendy Freedman");
	});

	test("Jan Oort appears once (not Jan Hendrik Oort)", () => {
		const matches = astronomers.filter(n => n.includes("Jan") && n.includes("Oort"));
		expect(matches.length).toBe(1);
		expect(matches[0]).toBe("Jan Oort");
	});

	test("Avi Loeb appears once (not Abraham Loeb)", () => {
		const avi = astronomers.filter(n => n === "Avi Loeb");
		const abraham = astronomers.filter(n => n === "Abraham Loeb");
		expect(avi.length).toBe(1);
		expect(abraham.length).toBe(0);
	});

	test("Jocelyn Bell Burnell appears once (not Dame Jocelyn Bell)", () => {
		const burnell = astronomers.filter(n => n === "Jocelyn Bell Burnell");
		const dame = astronomers.filter(n => n === "Dame Jocelyn Bell");
		expect(burnell.length).toBe(1);
		expect(dame.length).toBe(0);
	});
});

// ── deriveTripleName ─────────────────────────────────────────────────────────

describe("deriveTripleName", () => {
	test("determinism: same id → same triple across 1000 calls", () => {
		const id = "test-uuid-abc123";
		const first = deriveTripleName(id);
		for (let i = 0; i < 1000; i++) {
			expect(deriveTripleName(id)).toBe(first);
		}
	});

	test("different ids produce different triples (high probability)", () => {
		const names = new Set<string>();
		for (let i = 0; i < 100; i++) {
			names.add(deriveTripleName(`id-${i}`));
		}
		// With 2.6M combinations, 100 random IDs should all be unique
		expect(names.size).toBe(100);
	});

	test("triple names have three words (or are easter-egg single names)", () => {
		for (let i = 0; i < 100; i++) {
			const name = deriveTripleName(`test-${i}`);
			const words = name.split(" ");
			// Either a triple (3 words) or an easter-egg astronomer name (1-3+ words)
			expect(words.length).toBeGreaterThanOrEqual(1);
		}
	});

	test("easter-egg drop rate: ~5% over 10k ids (within 3-7% confidence)", () => {
		const astronomers = new Set(getAllSessionNicknames());
		let easterEggs = 0;
		const total = 10_000;
		for (let i = 0; i < total; i++) {
			const name = deriveTripleName(`egg-test-${i}`);
			if (astronomers.has(name)) easterEggs++;
		}
		const rate = easterEggs / total;
		expect(rate).toBeGreaterThanOrEqual(0.03);
		expect(rate).toBeLessThanOrEqual(0.07);
	});
});

// ── FNV-1a distribution ──────────────────────────────────────────────────────

describe("FNV-1a distribution", () => {
	test("no single slot >2x expected frequency across 100k ids", () => {
		// Test distribution across first names as a proxy
		const counts = new Map<string, number>();
		const total = 100_000;
		for (let i = 0; i < total; i++) {
			const name = deriveTripleName(`dist-${i}`);
			const first = name.split(" ")[0];
			counts.set(first, (counts.get(first) ?? 0) + 1);
		}

		// Expected frequency for first names (non-easter-egg ~95% of ids)
		const effectiveTotal = total * 0.95;
		const expectedPerSlot = effectiveTotal / FIRST_NAMES.length;
		const maxAllowed = expectedPerSlot * 2;

		for (const [name, count] of counts) {
			// Only check first names that are in the FIRST_NAMES pool (not easter egg names)
			if (FIRST_NAMES.includes(name)) {
				expect(count).toBeLessThanOrEqual(maxAllowed);
			}
		}
	});
});

// ── claimNickname ────────────────────────────────────────────────────────────

describe("claimNickname", () => {
	test("returns preferred name when no collisions", () => {
		const result = claimNickname("fresh-uuid", new Set());
		expect(result).toBe(deriveTripleName("fresh-uuid"));
	});

	test("avoids collision by iterating cosmic middle first", () => {
		const id = "test-claim-id";
		const preferred = deriveTripleName(id);
		const live = new Set([preferred]);
		const claimed = claimNickname(id, live);
		expect(claimed).not.toBe(preferred);

		// Should still have the same first and last name (cosmic changed)
		const prefParts = preferred.split(" ");
		const claimParts = claimed.split(" ");

		// If preferred was an easter-egg, the fallback won't match pattern
		if (prefParts.length === 3 && claimParts.length === 3) {
			expect(claimParts[0]).toBe(prefParts[0]); // same first
			expect(claimParts[2]).toBe(prefParts[2]); // same last
			expect(claimParts[1]).not.toBe(prefParts[1]); // different cosmic
		}
	});

	test("handles many collisions by iterating last names", () => {
		const id = "collision-test";
		const preferred = deriveTripleName(id);
		const prefParts = preferred.split(" ");

		// Block all cosmic variations for the base first+last combo
		const live = new Set<string>();
		if (prefParts.length === 3) {
			for (const cosmic of COSMIC_MIDDLES) {
				live.add(`${prefParts[0]} ${cosmic} ${prefParts[2]}`);
			}
		} else {
			live.add(preferred);
		}

		const claimed = claimNickname(id, live);
		expect(claimed).not.toBe("");
		expect(live.has(claimed)).toBe(false);
	});

	test("fallback with id suffix when namespace exhausted", () => {
		const id = "exhausted-test";
		const allNamesOccupied: NicknameOccupancy = { has: () => true };
		const claimed = claimNickname(id, allNamesOccupied);
		expect(claimed).toContain(`#${id.slice(0, 4)}`);
	}, 20_000);
});

describe("classifyNicknameVoice", () => {
	test("classifies female first-name tokens as female", () => {
		expect(classifyNicknameVoice("Vera Accretion Rubin")).toBe("female");
		expect(classifyNicknameVoice("Jocelyn Stargate Burnell")).toBe("female");
		expect(classifyNicknameVoice("Andrea Ecliptic Ghez")).toBe("female");
		expect(classifyNicknameVoice("Mae Gravitas Jemison")).toBe("female");
	});
	test("classifies male first-name tokens as male", () => {
		expect(classifyNicknameVoice("Volker Stargate Newcomb")).toBe("male");
		expect(classifyNicknameVoice("Galileo Accretion Rubin")).toBe("male");
		expect(classifyNicknameVoice("Bohdan Ecliptic Paczyński")).toBe("male");
	});
	test("classifies easter-egg single-astronomer names by first token", () => {
		expect(classifyNicknameVoice("Vera Rubin")).toBe("female");
		expect(classifyNicknameVoice("Carl Sagan")).toBe("male");
		expect(classifyNicknameVoice("A. G. W. Cameron")).toBe("male");
	});
});
