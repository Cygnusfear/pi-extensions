import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

interface Harness {
	readonly classifyCalls: unknown[];
	fire(event: unknown): Promise<{ block?: boolean; reason?: string } | undefined>;
	command(args: string): Promise<void>;
	notifications: string[];
}

async function harness(probabilities: Record<string, number>): Promise<Harness> {
	const { default: register } = await import("./git-safety.ts?test-bust=" + Math.random());
	const classifyCalls: unknown[] = [];
	const notifications: string[] = [];
	let handler: any = null;
	let commandHandler: any = null;
	const fakePi = {
		on(event: string, h: any) {
			if (event === "tool_call") handler = h;
		},
		registerCommand(name: string, definition: any) {
			if (name === "git-lock") commandHandler = definition.handler;
		},
	};
	register(fakePi as any);

	const repo = mkdtempSync(path.join(tmpdir(), "git-safety-repo-"));
	execFileSync("git", ["init", "-q"], { cwd: repo });
	writeFileSync(path.join(repo, "scratch.txt"), "uncommitted work\n");

	const ctx: any = {
		cwd: repo,
		hasUI: false,
		modelRegistry: {
			findOfType: () => ({ type: "classifier", provider: "openrouter", id: "perplexity/pplx-decider-v1.1-27b" }),
			classify: (_model: unknown, context: unknown) => {
				classifyCalls.push(context);
				return Promise.resolve({
					answers: Object.fromEntries(
						Object.entries(probabilities).map(([key, probability]) => [key, { probability }]),
					),
					stopReason: "stop",
				});
			},
		},
		ui: { notify: (text: string) => notifications.push(text) },
	};

	return {
		classifyCalls,
		notifications,
		async fire(event) {
			return handler(event, ctx);
		},
		async command(args: string) {
			await commandHandler(args, ctx);
		},
	};
}

const bash = (command: string) => ({ toolName: "bash", input: { command } });

describe("decide mode", () => {
	test("ordinary git traffic never reaches the model", async () => {
		const h = await harness({ unrecoverable_loss: 0.001 });
		for (const command of ["git status", "git log --oneline -5", "git diff", "git add -A", "git commit -m x"]) {
			expect(await h.fire(bash(command))).toBeUndefined();
		}
		expect(h.classifyCalls.length).toBe(0);
	});

	test("a risky command is judged, and allowed when the model rates it low", async () => {
		const h = await harness({ unrecoverable_loss: 0.001, repository_corruption: 0.002, shared_history_damage: 0.001 });
		expect(await h.fire(bash("git reset --hard HEAD~1"))).toBeUndefined();
		expect(h.classifyCalls.length).toBe(1);
	});

	test("blocks a destructive command the model rates on the loss axis", async () => {
		const h = await harness({ unrecoverable_loss: 0.976 });
		const verdict = await h.fire(bash("git reset --hard HEAD~1"));
		expect(verdict?.block).toBe(true);
		expect(verdict?.reason).toContain("nowhere else");
	});

	test("blocks an enumerated disaster without asking the model", async () => {
		const h = await harness({ unrecoverable_loss: 0.0 });
		const verdict = await h.fire(bash("git reflog expire --expire=now --all"));
		expect(verdict?.block).toBe(true);
		expect(h.classifyCalls.length).toBe(0);
	});

	test("does not call the model for a command that is not about git", async () => {
		const h = await harness({ unrecoverable_loss: 0.9 });
		expect(await h.fire(bash("ls -la"))).toBeUndefined();
		expect(h.classifyCalls.length).toBe(0);
	});

	test("answers from the cache for an identical command", async () => {
		const h = await harness({ unrecoverable_loss: 0.9 });
		await h.fire(bash("git reset --hard HEAD~1"));
		await h.fire(bash("git reset --hard HEAD~1"));
		expect(h.classifyCalls.length).toBe(1);
	});
});

describe("modes", () => {
	test("off: no decision, no block", async () => {
		const h = await harness({ unrecoverable_loss: 0.99 });
		await h.command("off");
		expect(await h.fire(bash("git reset --hard HEAD~1"))).toBeUndefined();
		expect(h.classifyCalls.length).toBe(0);
	});

	test("block: the deterministic matcher decides, allowing a clean classified command", async () => {
		const h = await harness({ unrecoverable_loss: 0.99 });
		await h.command("block");
		const verdict = await h.fire(bash("git reset --hard HEAD~1"));
		expect(verdict?.block).toBe(true);
		expect(verdict?.reason).toContain("deterministic guard");
	});

	test("decide is the default and confirm is gone", async () => {
		const h = await harness({ unrecoverable_loss: 0.001 });
		await h.command("confirm");
		expect(h.notifications.some((note) => note.includes("Usage"))).toBe(true);
	});
});

describe("always on", () => {
	test("sed and process-kill broadcasts are blocked in every mode", async () => {
		const h = await harness({ unrecoverable_loss: 0.0 });
		await h.command("off");
		expect((await h.fire(bash("sed -i '' 's/a/b/' file.txt")))?.block).toBe(true);
		expect((await h.fire(bash("kill -9 -1")))?.block).toBe(true);
	});

	test("a write to a .git path is blocked deterministically", async () => {
		const h = await harness({ repository_corruption: 0.0 });
		const verdict = await h.fire({ toolName: "write", input: { path: ".git/config" } });
		expect(verdict?.block).toBe(true);
		expect(h.classifyCalls.length).toBe(0);
	});
});
