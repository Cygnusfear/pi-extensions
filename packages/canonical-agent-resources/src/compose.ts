export interface PromptClockValue {
	readonly iso: string;
	readonly local: string;
}

export function stripPromptFrontmatter(content: string): string {
	const trimmed = content.trim();
	const match = trimmed.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
	return match ? trimmed.slice(match[0].length).trim() : trimmed;
}

export function formatPromptClock(now: Date = new Date()): PromptClockValue {
	return {
		iso: now.toISOString(),
		local: now.toLocaleString("en-US", {
			weekday: "short",
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			timeZoneName: "short",
		}),
	};
}

export function buildIdentityBlock(
	nickname: string,
	clock: PromptClockValue,
): string {
	return [
		"## Your identity (re-anchored every turn)",
		"",
		`You are **${nickname}** on the mesh. This is your stable name — it does NOT change between turns.`,
		"",
		`When you sign mesh tells, mai notes, commit messages, or any other communication that other agents will read, use this exact name: **${nickname}**.`,
		"",
		"Do NOT invent a name. Do NOT use a previous turn's name from memory. Do NOT use a name you read in someone else's message. Your name is on this line, refreshed every turn.",
		"",
		`Current time: **${clock.local}** (${clock.iso}).`,
	].join("\n");
}

export function buildTimeBlock(clock: PromptClockValue): string {
	return [
		"## Current time (re-anchored every turn)",
		"",
		`Current time: **${clock.local}** (${clock.iso}).`,
	].join("\n");
}

export function composePromptLayers(
	layers: readonly (string | null | undefined)[],
): string {
	return layers
		.filter((layer): layer is string => Boolean(layer?.trim()))
		.join("\n\n");
}
