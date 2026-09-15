import { describe, expect, test } from "bun:test";
import { buildSandboxEnv, DEFAULT_SANDBOX_ENV_NAMES } from "./sandbox-env.ts";

describe("buildSandboxEnv (kal-fq41qj60)", () => {
	test("credential-shaped names are absent, not blanked", () => {
		const env = buildSandboxEnv({
			PATH: "/usr/bin",
			OPENAI_API_KEY: "sk-secret",
			FORGEJO_TOKEN: "tok",
			POP_SMTP_PASSWORD: "pw",
		});
		expect(env.PATH).toBe("/usr/bin");
		expect("OPENAI_API_KEY" in env).toBe(false);
		expect("FORGEJO_TOKEN" in env).toBe(false);
		expect("POP_SMTP_PASSWORD" in env).toBe(false);
		// the distinction that matters: undefined AND not present as a key
		expect(env.OPENAI_API_KEY).toBeUndefined();
		expect(Object.keys(env)).toEqual(["PATH"]);
	});

	test("locale prefixes pass wholesale, arbitrary names do not", () => {
		const env = buildSandboxEnv({ LC_CTYPE: "UTF-8", LC_MESSAGES: "en", RANDOM_SETTING: "x" });
		expect(env.LC_CTYPE).toBe("UTF-8");
		expect(env.LC_MESSAGES).toBe("en");
		expect("RANDOM_SETTING" in env).toBe(false);
	});

	test("a host grant is honoured for exactly that name", () => {
		const env = buildSandboxEnv({ PI_SESSION_ID: "abc", PI_AGENT_EMAIL: "a@b.c" }, { extraNames: ["PI_SESSION_ID"] });
		expect(env.PI_SESSION_ID).toBe("abc");
		expect("PI_AGENT_EMAIL" in env).toBe(false);
	});

	test("undefined values are skipped rather than materialised as empty strings", () => {
		const env = buildSandboxEnv({ PATH: "/bin", HOME: undefined });
		expect(Object.keys(env)).toEqual(["PATH"]);
	});

	test("the result is a fresh object; writing to it cannot reach the host env", () => {
		const host = { PATH: "/bin" } as Record<string, string | undefined>;
		const env = buildSandboxEnv(host);
		expect(env).not.toBe(host);
		env.SCRATCH = "x";
		expect("SCRATCH" in host).toBe(false);
		env.PATH = "/mutated";
		expect(host.PATH).toBe("/bin");
	});

	test("the default allowlist itself carries no credential-shaped name", () => {
		for (const name of DEFAULT_SANDBOX_ENV_NAMES) {
			expect(name).not.toMatch(/KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL/i);
		}
	});
});
