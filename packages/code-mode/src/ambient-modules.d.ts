/**
 * Ambient module declarations for third-party packages without their own
 * `.d.ts`. Keep this minimal — type `unknown` for surfaces we don't actively
 * consume so we don't lock in fake API shapes.
 */

declare module "turndown" {
	/**
	 * Minimal surface area used inside code-mode. The real `turndown` package
	 * exports a class with several methods; we only need the shape that's
	 * actually invoked.
	 */
	export default class TurndownService {
		constructor(options?: Record<string, unknown>);
		turndown(html: string | Node): string;
		addRule(name: string, rule: Record<string, unknown>): this;
		use(plugins: unknown): this;
		keep(filter: unknown): this;
		remove(filter: unknown): this;
	}
}
