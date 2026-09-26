export const TRANSCRIPTION_LIMITS = Object.freeze({
	errorBytes: 160,
	audioBytes: 20 * 1024 * 1024,
	errorResponseBytes: 64 * 1024,
	providerResponseBytes: 1024 * 1024,
	transcriptBytes: 256 * 1024,
	fallbackBytes: 4 * 1024,
	providers: 16,
	providerNameBytes: 64,
	errorCodeBytes: 64,
});
const encoder = new TextEncoder();

async function boundedResponseText(
	response: Response,
	maximum: number,
): Promise<string> {
	const declaredHeader = response.headers.get("content-length");
	if (declaredHeader !== null) {
		const declared = Number(declaredHeader);
		if (!Number.isSafeInteger(declared) || declared < 0 || declared > maximum)
			throw new TranscriptionProviderError("response exceeded byte limit", {
				code: "response_too_large",
			});
	}
	if (!response.body)
		throw new TranscriptionProviderError("response body was missing", {
			code: "invalid_response",
		});
	const reader = response.body.getReader(),
		chunks: Uint8Array[] = [];
	let total = 0;
	try {
		while (true) {
			const next = await reader.read();
			if (next.done) break;
			total += next.value.byteLength;
			if (total > maximum) {
				await reader.cancel();
				throw new TranscriptionProviderError("response exceeded byte limit", {
					code: "response_too_large",
				});
			}
			chunks.push(next.value);
		}
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		throw new TranscriptionProviderError("response was not valid UTF-8", {
			code: "invalid_response",
		});
	}
}

/** Speaker tags from multi-speaker providers (fish-audio) are not part of the
 *  transcript: strip the exact <|speaker:N|> form and collapse the whitespace
 *  it leaves behind. A marker-only response normalises to empty and is
 *  rejected as empty_transcription, so the chain falls through. */
const SPEAKER_TAG = /<\|speaker:\d+\|>/gu;
function normaliseTranscript(text: string): string {
	return text
		.replace(SPEAKER_TAG, " ")
		.replace(/[ \t]+/gu, " ")
		.replace(/ *\n */gu, "\n")
		.trim();
}
function requireTranscript(value: unknown): string {
	const text = typeof value === "string" ? normaliseTranscript(value) : "";
	if (!text)
		throw new TranscriptionProviderError(
			"response did not contain a transcription",
			{ code: "empty_transcription" },
		);
	if (encoder.encode(text).byteLength > TRANSCRIPTION_LIMITS.transcriptBytes)
		throw new TranscriptionProviderError("transcription exceeded byte limit", {
			code: "transcription_too_large",
		});
	return text;
}
export interface TranscriptionCredentials {
	OPENAI_API_KEY?: string | undefined;
	GROQ_API_KEY?: string | undefined;
	ZAI_API_KEY?: string | undefined;
	OPENROUTER_API_KEY?: string | undefined;
	/** Comma-separated OpenRouter transcription models; replaces the built-in OpenRouter entry with one provider per model. */
	OPENROUTER_TRANSCRIPTION_MODELS?: string | undefined;
	/** Comma-separated provider names (exact or prefix) that lead the chain, in order. */
	TRANSCRIPTION_PROVIDER_ORDER?: string | undefined;
}
export interface TranscriptionInput {
	bytes: Uint8Array;
	filename?: string;
	mimeType?: string;
	signal?: AbortSignal;
}
export interface TranscriptionProvider {
	readonly name: string;
	transcribe(input: TranscriptionInput | Uint8Array): Promise<string>;
}
export interface TranscriptionFallbackHooks {
	readonly onOutOfCredits?: (
		provider: TranscriptionProvider,
		error: unknown,
	) => void | Promise<void>;
}
export class TranscriptionProviderError extends Error {
	constructor(
		message: string,
		readonly metadata: {
			status?: number;
			code?: string;
			outOfCredits?: boolean;
		} = {},
	) {
		super(message);
		this.name = "TranscriptionProviderError";
	}
	get status() {
		return this.metadata.status;
	}
	get code() {
		return this.metadata.code;
	}
	get outOfCredits() {
		return this.metadata.outOfCredits ?? this.status === 402;
	}
}
function boundUtf8(value: string, maximum: number, suffix = "…"): string {
	const bytes = encoder.encode(value);
	if (bytes.byteLength <= maximum) return value;
	const suffixBytes = encoder.encode(suffix).byteLength;
	let result = new TextDecoder().decode(
		bytes.slice(0, Math.max(0, maximum - suffixBytes)),
	);
	while (encoder.encode(result + suffix).byteLength > maximum)
		result = result.slice(0, -1);
	return result + suffix;
}
function bounded(value: string) {
	return boundUtf8(
		value.replace(/\s+/g, " ").trim(),
		TRANSCRIPTION_LIMITS.errorBytes,
	);
}
function safeErrorCode(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const compact = value.trim();
	return /^[A-Za-z0-9._:-]+$/.test(compact) &&
		encoder.encode(compact).byteLength <= TRANSCRIPTION_LIMITS.errorCodeBytes
		? compact
		: undefined;
}
function validProviders(
	providers: readonly TranscriptionProvider[],
): providers is readonly TranscriptionProvider[] {
	if (providers.length > TRANSCRIPTION_LIMITS.providers) return false;
	const names = new Set<string>();
	for (const provider of providers) {
		if (
			typeof provider !== "object" ||
			provider === null ||
			typeof provider.name !== "string" ||
			!provider.name ||
			!/^[A-Za-z0-9._ -]+$/.test(provider.name) ||
			encoder.encode(provider.name).byteLength >
				TRANSCRIPTION_LIMITS.providerNameBytes ||
			names.has(provider.name) ||
			typeof provider.transcribe !== "function"
		)
			return false;
		names.add(provider.name);
	}
	return true;
}
function record(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}
function outOfCredits(value: string) {
	return /(?:402|insufficient[_ -]?(?:credits|quota)|out of credits|not enough credits|credit balance)/i.test(
		value,
	);
}
export async function transcriptionResponseError(response: Response) {
	let body = "";
	try {
		body = await boundedResponseText(
			response,
			TRANSCRIPTION_LIMITS.errorResponseBytes,
		);
	} catch {}
	let code: string | undefined;
	try {
		const parsed = record(JSON.parse(body));
		const candidate = record(parsed?.error)?.code ?? parsed?.code;
		code = safeErrorCode(candidate);
	} catch {}
	return new TranscriptionProviderError("request rejected", {
		status: response.status,
		code: code ?? `http_${response.status}`,
		outOfCredits: response.status === 402 || outOfCredits(body),
	});
}
interface ProviderSpec {
	name: string;
	endpoint: string;
	model: string;
	key: keyof TranscriptionCredentials;
	stream?: boolean;
}
const SPECS: readonly ProviderSpec[] = [
	{
		name: "OpenAI",
		endpoint: "https://api.openai.com/v1/audio/transcriptions",
		model: "whisper-1",
		key: "OPENAI_API_KEY",
	},
	{
		name: "Groq",
		endpoint: "https://api.groq.com/openai/v1/audio/transcriptions",
		model: "whisper-large-v3",
		key: "GROQ_API_KEY",
	},
	{
		name: "Z.ai",
		endpoint: "https://api.z.ai/api/paas/v4/audio/transcriptions",
		model: "glm-asr-2512",
		key: "ZAI_API_KEY",
		stream: false,
	},
	{
		name: "OpenRouter",
		endpoint: "https://openrouter.ai/api/v1/audio/transcriptions",
		model: "whisper-1",
		key: "OPENROUTER_API_KEY",
	},
];
function validFilename(value: string): boolean {
	return (
		value.length >= 1 &&
		value.length <= 255 &&
		![...value].some(
			(character) =>
				character === "/" ||
				character === "\\" ||
				character.charCodeAt(0) <= 0x1f,
		)
	);
}

/** The built-in OpenRouter entry that OPENROUTER_TRANSCRIPTION_MODELS replaces. */
const OPENROUTER_NAME = "OpenRouter";
const OPENROUTER_CREDENTIAL = "OPENROUTER_API_KEY" as const;
/** Comma-separated env list -> trimmed, order-preserving, conflict-free entries. */
function parseEnvList(value: string | undefined): string[] {
	if (typeof value !== "string") return [];
	const seen = new Set<string>();
	const entries: string[] = [];
	for (const raw of value.split(",")) {
		const entry = raw.trim();
		if (!entry || seen.has(entry)) continue;
		seen.add(entry);
		entries.push(entry);
	}
	return entries;
}

/** Model ids as they are valid on the wire (fish-audio/transcribe-1-pro). */
const TRANSCRIPTION_MODEL_ID = /^[A-Za-z0-9._:/-]{1,128}$/u;

/** Provider names are constrained by validProviders: charset [A-Za-z0-9._ -],
 *  at most TRANSCRIPTION_LIMITS.providerNameBytes, unique. A model id contains
 *  "/" and may exceed the cap, so the display name is derived from it: illegal
 *  characters become spaces and the result is cut to the byte budget. */
function providerNameForModel(model: string): string {
	const legal = model.replace(/[^A-Za-z0-9._ -]+/gu, " ").replace(/\s+/gu, " ").trim();
	const name = legal ? `${OPENROUTER_NAME} ${legal}` : OPENROUTER_NAME;
	return name.slice(0, TRANSCRIPTION_LIMITS.providerNameBytes).trimEnd();
}

/** The configured provider chain: the built-in SPECS, with the OpenRouter entry
 *  expanded to one entry per OPENROUTER_TRANSCRIPTION_MODELS value when that
 *  list is set, then reordered by TRANSCRIPTION_PROVIDER_ORDER. Both env vars
 *  are opt-in: with neither set this returns exactly SPECS. */
function resolveProviderSpecs(credentials: TranscriptionCredentials): ProviderSpec[] {
	const models = parseEnvList(credentials.OPENROUTER_TRANSCRIPTION_MODELS).filter((model) =>
		TRANSCRIPTION_MODEL_ID.test(model),
	);
	const specs: ProviderSpec[] = SPECS.flatMap((spec) => {
		if (models.length === 0 || spec.key !== OPENROUTER_CREDENTIAL) return [spec];
		// Reserve the slots the other providers occupy: the runtime caps the total
		// number of providers, and an over-long list must not invalidate the chain.
		const budget = Math.max(1, TRANSCRIPTION_LIMITS.providers - (SPECS.length - 1));
		const names = new Set<string>();
		const expanded: ProviderSpec[] = [];
		for (const model of models.slice(0, budget)) {
			const name = providerNameForModel(model);
			if (names.has(name)) continue;
			names.add(name);
			expanded.push({ ...spec, name, model });
		}
		return expanded;
	});
	const order = parseEnvList(credentials.TRANSCRIPTION_PROVIDER_ORDER);
	if (order.length === 0) return specs;
	// An entry selects a spec by exact name or by prefix: "OpenRouter" covers
	// every "OpenRouter <model>". Listed providers lead in the listed order;
	// unlisted ones keep their relative order after them. Case-insensitive so an
	// env typo in casing does not silently reorder the chain.
	const lowered = order.map((entry) => entry.toLowerCase());
	const rank = (name: string): number => {
		const candidate = name.toLowerCase();
		for (let index = 0; index < lowered.length; index++) {
			const entry = lowered[index] as string;
			if (candidate === entry) return index;
			if (candidate.startsWith(`${entry} `) || candidate.startsWith(`${entry}:`)) return index;
		}
		return Number.POSITIVE_INFINITY;
	};
	return specs
		.map((spec, index) => ({ spec, index }))
		.sort((left, right) => {
			const leftRank = rank(left.spec.name);
			const rightRank = rank(right.spec.name);
			if (leftRank !== rightRank) return leftRank < rightRank ? -1 : 1;
			return left.index - right.index;
		})
		.map(({ spec }) => spec);
}



export function createTranscriptionProviders(
	credentials: TranscriptionCredentials,
	fetcher: typeof fetch = fetch,
): TranscriptionProvider[] {
	return resolveProviderSpecs(credentials).flatMap((spec) => {
		const key = credentials[spec.key]?.trim();
		if (!key) return [];
		return [
			{
				name: spec.name,
				async transcribe(value: TranscriptionInput | Uint8Array) {
					const input = value instanceof Uint8Array ? { bytes: value } : value;
					if (
						!(input.bytes instanceof Uint8Array) ||
						input.bytes.byteLength < 1 ||
						input.bytes.byteLength > TRANSCRIPTION_LIMITS.audioBytes
					)
						throw new TranscriptionProviderError("audio exceeded byte limit", {
							code: "invalid_audio",
						});
					if (input.filename !== undefined && !validFilename(input.filename))
						throw new TranscriptionProviderError("filename was invalid", {
							code: "invalid_filename",
						});
					if (
						input.mimeType !== undefined &&
						(input.mimeType.length < 1 ||
							input.mimeType.length > 128 ||
							!/^[A-Za-z0-9!#&^_.+/-]+$/u.test(input.mimeType))
					)
						throw new TranscriptionProviderError("MIME type was invalid", {
							code: "invalid_mime_type",
						});
					const form = new FormData();
					form.append(
						"file",
						new Blob([Uint8Array.from(input.bytes)], {
							type: input.mimeType ?? "application/octet-stream",
						}),
						input.filename ?? "voice.ogg",
					);
					form.append("model", spec.model);
					if (spec.stream !== undefined)
						form.append("stream", String(spec.stream));
					const response = await fetcher(spec.endpoint, {
						method: "POST",
						headers: { authorization: `Bearer ${key}` },
						body: form,
						...(input.signal ? { signal: input.signal } : {}),
					});
					if (!response.ok) throw await transcriptionResponseError(response);
					let payload: unknown;
					try {
						payload = JSON.parse(
							await boundedResponseText(
								response,
								TRANSCRIPTION_LIMITS.providerResponseBytes,
							),
						) as unknown;
					} catch (error) {
						if (error instanceof TranscriptionProviderError) throw error;
						throw new TranscriptionProviderError(
							"response was not valid JSON",
							{ code: "invalid_response" },
						);
					}
					return requireTranscript(record(payload)?.text);
				},
			},
		];
	});
}
export async function transcribeWithFallback(
	providers: readonly TranscriptionProvider[],
	value: TranscriptionInput | Uint8Array,
	hooks: TranscriptionFallbackHooks = {},
): Promise<string> {
	if (!validProviders(providers))
		return "(voice transcription failed: invalid transcription provider configuration)";
	if (!providers.length)
		return "(voice transcription failed: no transcription providers configured)";
	const failures: string[] = [];
	for (const provider of providers) {
		try {
			const text = requireTranscript(await provider.transcribe(value));
			return text;
		} catch (error) {
			const message =
				error instanceof TranscriptionProviderError
					? [
							Number.isSafeInteger(error.status) &&
							Number(error.status) >= 100 &&
							Number(error.status) <= 599
								? `status=${error.status}`
								: undefined,
							safeErrorCode(error.code)
								? `code=${safeErrorCode(error.code)}`
								: undefined,
							bounded(error.message),
						]
							.filter(Boolean)
							.join(" ")
					: bounded(error instanceof Error ? error.message : String(error));
			if (
				(error instanceof TranscriptionProviderError && error.outOfCredits) ||
				outOfCredits(message)
			) {
				try {
					await hooks.onOutOfCredits?.(provider, error);
				} catch {}
			}
			failures.push(`${provider.name}: ${message}`);
		}
	}
	return boundUtf8(
		`(voice transcription failed; tried ${providers.map((provider) => provider.name).join(", ")}: ${failures.join("; ")})`,
		TRANSCRIPTION_LIMITS.fallbackBytes,
		"…)",
	);
}
export function availableTranscriptionProviders(
	env: TranscriptionCredentials = createDefaultCredentials(),
): TranscriptionProvider[] {
	return createTranscriptionProviders(env);
}
function createDefaultCredentials(): TranscriptionCredentials {
	const processEnv =
		(globalThis as { process?: { env?: Record<string, string | undefined> } })
			.process?.env ?? {};
	return {
		OPENAI_API_KEY: processEnv.OPENAI_API_KEY,
		GROQ_API_KEY: processEnv.GROQ_API_KEY,
		ZAI_API_KEY: processEnv.ZAI_API_KEY,
		OPENROUTER_API_KEY: processEnv.OPENROUTER_API_KEY,
		OPENROUTER_TRANSCRIPTION_MODELS: processEnv.OPENROUTER_TRANSCRIPTION_MODELS,
		TRANSCRIPTION_PROVIDER_ORDER: processEnv.TRANSCRIPTION_PROVIDER_ORDER,
	};
}
