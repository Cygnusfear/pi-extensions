import { loadConfig } from "./config.ts";
import { Bridge } from "./bridge.ts";

async function main(): Promise<void> {
	const cfg = loadConfig();
	console.log(
		`[bridge] starting — "${cfg.hoomanNickname}" durable=${cfg.hoomanMeshId} channel=#${cfg.channel}`,
	);
	const bridge = new Bridge(cfg);
	await bridge.start();
	console.log("[bridge] running — mesh ↔ telegram wired");
}

for (const sig of ["SIGINT", "SIGTERM"] as const) {
	process.on(sig, () => {
		console.log(`\n[bridge] ${sig} — shutting down`);
		process.exit(0);
	});
}

main().catch((e) => {
	console.error("[bridge] fatal:", e);
	process.exit(1);
});