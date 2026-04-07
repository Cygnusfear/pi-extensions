/**
 * Generic BM25 search engine.
 * Works on any corpus of { id, fields: { name: text } } documents.
 * Ported from maitake's pkg/notes/search.go — same algorithm, same tuning.
 */

export type Bm25Doc = {
	id: string;
	fields: Record<string, string>;
};

export type Bm25Result = {
	id: string;
	score: number;
};

type IndexedDoc = {
	id: string;
	termFreqs: Map<string, number>; // weighted term frequency
	length: number; // weighted token count
};

const K1 = 1.2;
const B = 0.75;

/**
 * Tokenize text into lowercase alphanumeric tokens.
 * No stemming — raw tokens proved sufficient in practice.
 */
export function tokenize(text: string): string[] {
	if (!text) return [];
	return text
		.toLowerCase()
		.split(/[^a-z0-9_]+/)
		.filter(Boolean);
}

/**
 * Build a BM25 index over a set of documents.
 * Each doc has named text fields with configurable weights.
 */
export function buildBm25Index(
	docs: Bm25Doc[],
	fieldWeights: Record<string, number> = { text: 1.0 },
): Bm25Index {
	const indexed: IndexedDoc[] = [];
	const df = new Map<string, number>(); // document frequency per term
	let totalLength = 0;

	for (const doc of docs) {
		const tf = new Map<string, number>();
		let len = 0;

		for (const [fieldName, weight] of Object.entries(fieldWeights)) {
			const text = doc.fields[fieldName] ?? "";
			const tokens = tokenize(text);
			for (const tok of tokens) {
				const cur = tf.get(tok) ?? 0;
				tf.set(tok, cur + weight);
				len += weight;
			}
		}

		// Count each unique term once per doc for df
		for (const term of tf.keys()) {
			df.set(term, (df.get(term) ?? 0) + 1);
		}

		totalLength += len;
		indexed.push({ id: doc.id, termFreqs: tf, length: len });
	}

	const avgDL = indexed.length > 0 ? totalLength / indexed.length : 0;

	return { docs: indexed, df, avgDL, docCount: indexed.length, fieldWeights };
}

export type Bm25Index = {
	docs: IndexedDoc[];
	df: Map<string, number>;
	avgDL: number;
	docCount: number;
	fieldWeights: Record<string, number>;
};

/**
 * Search the index. Returns top-K results sorted by score descending.
 */
export function searchBm25(index: Bm25Index, query: string, topK = 20): Bm25Result[] {
	if (index.docCount === 0 || !query) return [];

	const queryTerms = tokenize(query);
	if (queryTerms.length === 0) return [];

	const N = index.docCount;
	const hits: Bm25Result[] = [];

	for (const doc of index.docs) {
		let score = 0;
		for (const q of queryTerms) {
			const f = doc.termFreqs.get(q) ?? 0;
			if (f === 0) continue;

			const dfVal = index.df.get(q) ?? 0;
			const idf = Math.log((N - dfVal + 0.5) / (dfVal + 0.5) + 1);
			const num = f * (K1 + 1);
			const den = f + K1 * (1 - B + B * doc.length / index.avgDL);
			score += idf * num / den;
		}

		if (score > 0) {
			hits.push({ id: doc.id, score });
		}
	}

	hits.sort((a, b) => b.score - a.score);
	return hits.slice(0, topK);
}

/**
 * Convenience: build index + search in one shot.
 */
export function bm25Search(
	docs: Bm25Doc[],
	query: string,
	opts?: { fieldWeights?: Record<string, number>; topK?: number },
): Bm25Result[] {
	const weights = opts?.fieldWeights ?? { text: 1.0 };
	const topK = opts?.topK ?? 20;
	const index = buildBm25Index(docs, weights);
	return searchBm25(index, query, topK);
}
