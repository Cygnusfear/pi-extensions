import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "../../..");
const instructionSurfaces = [
	"packages/code-mode/README.md",
	"packages/code-mode/extensions/code-mode-prompt.md",
	"packages/code-mode/extensions/code-mode-declarations.md",
	"skills/environment/SKILL.md",
	"packages/default-prompt/prompts/default-manual.md",
	"packages/background-bash/README.md",
	"docs/walkthrough.md",
	"docs/demo-script.md",
];

type Property = { name: string; value: string; index: number };

function text(file: string): string {
	return fs.readFileSync(path.join(repoRoot, file), "utf8");
}

function skipQuoted(source: string, start: number): number {
	const quote = source[start];
	let escaped = false;
	for (let index = start + 1; index < source.length; index++) {
		const char = source[index];
		if (escaped) escaped = false;
		else if (char === "\\") escaped = true;
		else if (char === quote) return index + 1;
	}
	return source.length;
}

function skipTrivia(source: string, start: number): number {
	let index = start;
	while (index < source.length) {
		if (/\s/.test(source[index] ?? "")) index++;
		else if (source.startsWith("//", index)) {
			index = source.indexOf("\n", index + 2);
			if (index < 0) return source.length;
		} else if (source.startsWith("/*", index)) {
			const end = source.indexOf("*/", index + 2);
			return end < 0 ? source.length : skipTrivia(source, end + 2);
		} else break;
	}
	return index;
}

function balancedObject(
	source: string,
	start: number,
): { text: string; end: number } | undefined {
	if (source[start] !== "{") return undefined;
	let depth = 0;
	for (let index = start; index < source.length; index++) {
		const char = source[index];
		if (char === "'" || char === '"' || char === "`") {
			index = skipQuoted(source, index) - 1;
			continue;
		}
		if (source.startsWith("//", index)) {
			const end = source.indexOf("\n", index + 2);
			if (end < 0) return undefined;
			index = end;
			continue;
		}
		if (source.startsWith("/*", index)) {
			const end = source.indexOf("*/", index + 2);
			if (end < 0) return undefined;
			index = end + 1;
			continue;
		}
		if (char === "{") depth++;
		else if (char === "}" && --depth === 0)
			return { text: source.slice(start, index + 1), end: index + 1 };
	}
	return undefined;
}

function readKey(
	source: string,
	start: number,
): { name: string; end: number } | undefined {
	const index = skipTrivia(source, start);
	const char = source[index];
	if (char === "'" || char === '"') {
		const end = skipQuoted(source, index);
		return { name: source.slice(index + 1, end - 1), end };
	}
	const match = /^[A-Za-z_$][\w$-]*/.exec(source.slice(index));
	return match ? { name: match[0], end: index + match[0].length } : undefined;
}

function topLevelProperties(object: string): Property[] {
	const properties: Property[] = [];
	let index = 1;
	while (index < object.length - 1) {
		index = skipTrivia(object, index);
		if (object[index] === ",") {
			index++;
			continue;
		}
		const keyStart = index;
		const key = readKey(object, index);
		if (!key) {
			index++;
			continue;
		}
		index = skipTrivia(object, key.end);
		if (object[index] !== ":") {
			index++;
			continue;
		}
		index = skipTrivia(object, index + 1);
		const valueStart = index;
		if (object[index] === "{") {
			const nested = balancedObject(object, index);
			if (!nested) break;
			properties.push({ name: key.name, value: nested.text, index: keyStart });
			index = nested.end;
		} else if (
			object[index] === "'" ||
			object[index] === '"' ||
			object[index] === "`"
		) {
			const end = skipQuoted(object, index);
			properties.push({
				name: key.name,
				value: object.slice(index + 1, end - 1),
				index: keyStart,
			});
			index = end;
		} else {
			let depth = 0;
			while (index < object.length - 1) {
				const char = object[index];
				if (char === "'" || char === '"' || char === "`") {
					index = skipQuoted(object, index);
					continue;
				}
				if (char === "{" || char === "[" || char === "(") depth++;
				else if (char === "}" || char === "]" || char === ")") depth--;
				if (depth <= 0 && (char === "," || char === "}")) break;
				index++;
			}
			properties.push({
				name: key.name,
				value: object.slice(valueStart, index).trim(),
				index: keyStart,
			});
		}
	}
	return properties;
}

function executeCodeArgumentObjects(content: string): string[] {
	const objects: string[] = [];
	for (const match of content.matchAll(/execute_code\s*\(/g)) {
		const start = content.indexOf("{", match.index ?? 0);
		const object = start >= 0 ? balancedObject(content, start) : undefined;
		if (object) objects.push(object.text);
	}
	for (const match of content.matchAll(
		/\{\s*(?:["']tool["']|tool)\s*:\s*["']execute_code["']/g,
	)) {
		const wrapper = balancedObject(content, match.index ?? 0);
		if (!wrapper) continue;
		const args = topLevelProperties(wrapper.text).find(
			(property) => property.name === "args",
		);
		if (args?.value.startsWith("{")) objects.push(args.value);
	}
	return objects;
}

function isValidArgumentObject(object: string): boolean {
	const properties = topLevelProperties(object);
	const thinking = properties.find((property) => property.name === "thinking");
	const code = properties.find((property) => property.name === "code");
	return Boolean(thinking?.value.trim() && code && code.index > thinking.index);
}

describe("required execute_code thinking documentation", () => {
	test("every literal execute_code payload has non-empty thinking before code in args", () => {
		for (const file of instructionSurfaces) {
			for (const object of executeCodeArgumentObjects(text(file))) {
				expect(
					isValidArgumentObject(object),
					`${file}: invalid execute_code args ${object}`,
				).toBe(true);
			}
		}
	});

	test("regression corpus scopes fields to the actual argument object", () => {
		const invalid = [
			`{ tool: "execute_code", thinking: "outer only", args: { code: "console.log(1)" } }`,
			`{ tool: "execute_code", args: { metadata: { thinking: "nested only" }, code: "console.log(1)" } }`,
			`{ tool: "execute_code", args: { timeout: 1000, code: "console.log(1)" } }`,
			`{ "tool": "execute_code", "args": { "async": true, "code": "console.log(1)" } }`,
			`{tool:'execute_code',args:{code:'console.log(1)'}}`,
			`execute_code({ timeout: 1000, code: "console.log(1)" })`,
			`execute_code({ thinking: "", code: "console.log(1)" })`,
		];
		for (const example of invalid) {
			const objects = executeCodeArgumentObjects(example);
			expect(objects, example).toHaveLength(1);
			expect(isValidArgumentObject(objects[0]!), example).toBe(false);
		}

		const valid = [
			`{ tool: "execute_code", args: { thinking: "verify", metadata: { thinking: "nested" }, timeout: 1000, code: "console.log(1)" } }`,
			`execute_code({ thinking: 'verify', code: 'console.log(1)', async: true })`,
		];
		for (const example of valid) {
			const objects = executeCodeArgumentObjects(example);
			expect(objects, example).toHaveLength(1);
			expect(isValidArgumentObject(objects[0]!), example).toBe(true);
		}
	});
});
