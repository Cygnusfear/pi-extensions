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

	let shuttingDown = false;
	for (const signal of ["SIGINT", "SIGTERM"] as const) {
		process.once(signal, () => {
			if (shuttingDown) return;
			shuttingDown = true;
			console.log(`\n[bridge] ${signal} — shutting down`);
			void bridge.stop().then(
				() => process.exit(0),
				(error: unknown) => {
					console.error("[bridge] shutdown failed:", error);
					process.exit(1);
				},
			);
		});
	}
}

main().catch((error: unknown) => {
	console.error("[bridge] fatal:", error);
	process.exit(1);
});
