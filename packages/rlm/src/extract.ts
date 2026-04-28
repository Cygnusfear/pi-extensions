const CODE_BLOCK_RE = /```(?:javascript|js|typescript|ts)\s*\n([\s\S]*?)\n```/gm;

export function extractCodeBlocks(text: string): string[] {
	const blocks: string[] = [];
	CODE_BLOCK_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = CODE_BLOCK_RE.exec(text)) !== null) {
		blocks.push(match[1]);
	}
	return blocks;
}
