import type { ReactionTypeEmoji } from "grammy/types";

export type TelegramReactionEmoji = ReactionTypeEmoji["emoji"];

/** Parse untrusted mesh payload text into Telegram's finite standard-reaction set. */
export function telegramReactionEmoji(value: string): TelegramReactionEmoji | null {
	switch (value) {
		case "👍": case "👎": case "❤": case "🔥": case "🥰": case "👏":
		case "😁": case "🤔": case "🤯": case "😱": case "🤬": case "😢":
		case "🎉": case "🤩": case "🤮": case "💩": case "🙏": case "👌":
		case "🕊": case "🤡": case "🥱": case "🥴": case "😍": case "🐳":
		case "❤‍🔥": case "🌚": case "🌭": case "💯": case "🤣": case "⚡":
		case "🍌": case "🏆": case "💔": case "🤨": case "😐": case "🍓":
		case "🍾": case "💋": case "🖕": case "😈": case "😴": case "😭":
		case "🤓": case "👻": case "👨‍💻": case "👀": case "🎃": case "🙈":
		case "😇": case "😨": case "🤝": case "✍": case "🤗": case "🫡":
		case "🎅": case "🎄": case "☃": case "💅": case "🤪": case "🗿":
		case "🆒": case "💘": case "🙉": case "🦄": case "😘": case "💊":
		case "🙊": case "😎": case "👾": case "🤷‍♂": case "🤷": case "🤷‍♀":
		case "😡":
			return value;
		default:
			return null;
	}
}

/** Copy a Node Buffer/view into ArrayBuffer-owned bytes accepted as a DOM BlobPart. */
export function blobBytes(source: Uint8Array): Uint8Array<ArrayBuffer> {
	const bytes = new Uint8Array(new ArrayBuffer(source.byteLength));
	bytes.set(source);
	return bytes;
}
