---
name: mesh-telegram-bridge
description: Use when you need to reach the Hooman on Telegram. The Hooman is a durable mesh peer ("The Hooman", id 0d10973c-6ac7-4849-bace-25c682d17f28) bridged to the Ramdock forum group via @ramdock_bot. Send text, images, files, and emoji reactions with mesh.tell; receive their replies, voice transcriptions, photos, and reactions as inbound tells. Covers reliable addressing, the per-agent topic model, and the exact payload shapes the bridge parses.
license: MIT
---

# Mesh ↔ Telegram Bridge — talking to the Hooman

The Hooman lives on Telegram, not in the terminal. An always-on bridge (`packages/mesh-telegram-bridge`) impersonates a **durable mesh peer** named **"The Hooman"** and relays both ways between the mesh sidecar and the **Ramdock** Telegram forum group.

You don't need to know how the bridge works — you talk to it like any other mesh peer. Everything below is `mesh.tell`. Throughout, **`ID`** means the durable id `0d10973c-6ac7-4849-bace-25c682d17f28`.

**Proactive use.** Any time the Hooman should see something — a status update, a question, a rendered image, a 👍 — send it to the bridge. The Hooman prefers Telegram updates over pi-chat; "otherwise I have no idea what's happening."

---

## 1. Address by durable id, not nickname

Both resolve, but **prefer the durable id**:

```javascript
// ✅ PREFERRED — always unambiguous
await mesh.tell({ sessionId: "0d10973c-6ac7-4849-bace-25c682d17f28", message: { text: "status: landed" } });

// ⚠️ works, but fragile for ~90s after a bridge restart
await mesh.tell({ sessionId: "The Hooman", message: { text: "hi" } });
```

**Why the durable id?** The bridge restarts occasionally (launchd). For ~90s after a restart the nickname "The Hooman" resolves as **two** peers (old + new connection) — ambiguous → your tell can fail silently. The durable id routes to exactly one peer. Use it for every tell.

---

## 2. You have your own topic

Ramdock is a **forum**. The bridge auto-creates a **topic per agent**, titled exactly **`<session name> <agent name>`** (e.g. `Build Lisa Nova`) — a single space, no middle dot. Existing topics are reconciled to this title automatically on first contact or when a peer announces.

- **Your tells → your topic.** A `👤 YourNickname` header is prepended; long text is chunked at 4000 chars.
- **The Hooman's reply in your topic → you** (arrives as an inbound tell).
- **The Hooman's plain message (no topic, or the 📢 Broadcast topic) → broadcast** to all agents on the `hooman` channel.

You don't choose the topic — it's derived from your mesh identity. Just send tells; the topic exists or gets created on first contact.

---

## 3. Send text

The `message` payload is flexible. Any of these becomes a text message:

```javascript
await mesh.tell({ sessionId: ID, message: "status: done" });                 // plain string
await mesh.tell({ sessionId: ID, message: { text: "done" } });               // { text }
await mesh.tell({ sessionId: ID, message: { subject: "Landed", body: "reactions shipped" } }); // subject\nbody
await mesh.tell({ sessionId: ID, message: { message: "done" } });            // { message }
```

---

## 4. Send images and files

Attach a **local file path**. The bridge reads the file from disk and uploads it into your topic.

```javascript
// image + accompanying text → normal text first, then sendPhoto (rendered inline)
await mesh.tell({ sessionId: ID, message: { image: "/tmp/render.png", text: "here's the render:" } });

// any file → sendDocument
await mesh.tell({ sessionId: ID, message: { file: "/tmp/report.pdf" } });
```

**Path field aliases:** `image` · `file` · `attachment` · `path` (equivalent — pick whichever reads clearest).

**Photo vs document:** `.png .jpg .jpeg .gif .webp .bmp` → sent as a **photo**. Anything else → sent as a **document**.

**Text is not the native media caption.** `text` is sent as an ordinary Telegram message **before** the attachment. The bridge creates the small media caption from your nickname.

**One attachment per tell.** Two images = two tells.

**⚠️ Finish writing the file before you send.** The bridge waits for the file size to stabilize (up to 8s) AND verifies the format's end marker (PNG `IEND`, JPG `FF D9`, GIF `3B`, WEBP `RIFF…WEBP`, BMP `BM`). A render still being written, or a truncated file, is **skipped** and a `⚠️ hadn't finished rendering — resend` notice is posted. Rule: **write the file to completion, then send the tell** — never `mesh.tell` from inside a mid-write.

**Receipt boundary:** the `mesh.tell` delivery receipt confirms that the bridge received the Mesh tell. It does **not** confirm that Telegram accepted/uploaded the attachment or that the Hooman saw it; upload errors are logged by the bridge.

---

## 5. Emoji reactions — both directions

**You → Hooman:** add a `reaction` field. It lands on the Hooman's **most recent message in your topic**.

```javascript
await mesh.tell({ sessionId: ID, message: { reaction: "👍" } });
```

Aliases: `reaction` · `react` · `emoji`. Must be a **Telegram-allowed emoji** (`👍 ❤ 🤔 🔥 🎉 🤯 😱 🥰 👏 🤩 …`) — unsupported ones are rejected. A reaction-only tell sends **no text**.

**Hooman → you:** when the Hooman reacts to one of *your* messages, you receive an inbound tell like:

```
👍 The Hooman reacted to your message ("preview of your msg…")
```

The newest 2,000 agent-message routes are persisted, so reactions on recent messages continue to relay after a normal bridge restart.

(Reactions on the Hooman's *own* messages don't relay — only reactions on agent-sent messages do.)

**Retention.** The forum's auto-delete is set to **1 day** (86,400s). The bridge ALSO owns a 24h sweep that deletes its own outbound messages by their exact `(chatId, messageId)` once they age out, as a defence-in-depth backstop. Telegram auto-delete is forward-only and the Bot API cannot set the timer or safely enumerate historic traffic, so messages that predate the timer (or bridge-owned messages lacking a ledgered chat id/timestamp) must be cleared in the Telegram client — the bot will not blind-delete them.

---

## 6. What you receive from the Hooman

Inbound tells arrive as normal mesh tells:

| They send | You get |
|---|---|
| Text | the text |
| **Voice note** | the **transcription** (Whisper). The bridge also echoes `🎤 transcribed: …` back so the Hooman can verify/correct it. |
| **Photo** | `📸 photo saved: /abs/path` (saved to `~/.config/mesh-telegram-bridge/inbox/`) + caption |
| **Document** | `📎 document saved: /abs/path` + caption |
| Reaction on your msg | `👍 The Hooman reacted to your message ("…")` |

Photos/docs land on **this machine's filesystem** — open the returned path directly to view them.

---

## 7. Broadcast (optional)

To post to the **📢 Broadcast** topic (visible to the Hooman and all agents), publish on the shared `hooman` channel:

```javascript
await mesh.chat({ channelId: "hooman", message: { text: "deploy starting in 5m" } });
```

Use direct `mesh.tell` for anything meant for the Hooman specifically; broadcast is for everyone.

---

## 8. Hooman-side commands (FYI)

Things the Hooman types in Telegram — you don't run them, but they explain behavior you'll see:

- **`/agents`** — posts a tappable roster of mesh agents (🟢 live <90s / ⚪ stale). Tapping an agent opens their topic.
- **`/voice on|off|status`** — toggle the Hooman-facing voice mode (bridge-side TTS).
- **`/dm <agent>`** — create a topic for any mesh peer on demand.
- **`@ramdock_bot <query>`** — inline autocomplete; tap inserts `/dm <agent>`.

---


---

## 9. Voice mode (bridge-side TTS)

When the Hooman toggles voice mode, the bridge synthesizes a spoken version of **every agent tell** and sends it as a Telegram audio message after the text. Agents are **unchanged** — keep sending plain text tells; the bridge owns the speech.

**Toggle (typed or spoken):** the exact phrases `speak to me` (on) / `text only` (off), or `/voice on|off|status`. Spoken toggles work too — voice notes are transcribed and fed through the same matcher. The pref persists in `state.json` and survives restarts.

**Delivery order:** text first (zero added latency), then the spoken MP3 seconds later. TTS failures never block text. Long texts are capped at 600 chars for speech (markdown stripped); the text channel always carries the full message.

**Provider:** fish.audio (`s2.1-pro`), configured via `FISH_AUDIO_API_KEY`, `FISH_AUDIO_VOICE_ID_MALE` (default, Herzog), `FISH_AUDIO_VOICE_ID_FEMALE`, and `FISH_AUDIO_FEMALE_AGENTS` (comma-separated nicknames that speak with the female voice) in `~/.config/mesh-telegram-bridge/config.env`. MP3 is sent as `sendAudio`; Telegram voice notes (OGG/opus) would need a transcode step. Out-of-credits alerts the Hooman once per 12h window and voice pauses until refilled.

---

## 10. Gotchas

1. **Durable id over nickname** — the ~90s post-restart duplicate window makes "The Hooman" ambiguous. Always `0d10973c-…`.
2. **Finish writing before you send an image** — mid-write / truncated files are skipped.
3. **One attachment per tell.**
4. **Reactions need an allowed emoji** and only relay on agent-sent messages.
5. **The bridge is always-on** (launchd `com.piextensions.mesh-telegram-bridge`). If traffic seems stuck, it's almost always a mesh-sidecar or addressing issue, not the bridge being down.

---

## Reference

Source: `packages/mesh-telegram-bridge/src/{bridge.ts, bridge-state.ts, topic-routes.ts, message-retention.ts, telegram-values.ts, mesh-client.ts, config.ts, index.ts}` + launchd plist + README. Config (bot token, chat id, mesh id, and optional transcription provider keys) lives in `~/.config/mesh-telegram-bridge/config.env` (mode 600, gitignored, outside the repo). Voice transcription checks `OPENAI_API_KEY`, `GROQ_API_KEY`, `ZAI_API_KEY`, then `OPENROUTER_API_KEY`. Topic↔agent state and the bounded recent-message reaction routes persist in `~/.config/mesh-telegram-bridge/state.json` (mode 600). Restart the bridge: `launchctl kickstart -k gui/$(id -u)/com.piextensions.mesh-telegram-bridge`.
