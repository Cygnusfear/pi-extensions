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

Ramdock is a **forum**. The bridge auto-creates a **topic per agent**, named `YourNickname · YourSessionName`.

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
// image + caption → sendPhoto (rendered inline)
await mesh.tell({ sessionId: ID, message: { image: "/tmp/render.png", text: "here's the render:" } });

// any file → sendDocument
await mesh.tell({ sessionId: ID, message: { file: "/tmp/report.pdf" } });
```

**Path field aliases:** `image` · `file` · `attachment` · `path` (equivalent — pick whichever reads clearest).

**Photo vs document:** `.png .jpg .jpeg .gif .webp .bmp` → sent as a **photo**. Anything else → sent as a **document**.

**One attachment per tell.** Two images = two tells.

**⚠️ Finish writing the file before you send.** The bridge waits for the file size to stabilize (up to 8s) AND verifies the format's end marker (PNG `IEND`, JPG `FF D9`, GIF `3B`, WEBP `RIFF…WEBP`, BMP `BM`). A render still being written, or a truncated file, is **skipped** and a `⚠️ hadn't finished rendering — resend` notice is posted. Rule: **write the file to completion, then send the tell** — never `mesh.tell` from inside a mid-write.

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

(Reactions on the Hooman's *own* messages don't relay — only reactions on agent-sent messages do.)

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
- **`/dm <agent>`** — create a topic for any mesh peer on demand.
- **`@ramdock_bot <query>`** — inline autocomplete; tap inserts `/dm <agent>`.

---

## 9. Gotchas

1. **Durable id over nickname** — the ~90s post-restart duplicate window makes "The Hooman" ambiguous. Always `0d10973c-…`.
2. **Finish writing before you send an image** — mid-write / truncated files are skipped.
3. **One attachment per tell.**
4. **Reactions need an allowed emoji** and only relay on agent-sent messages.
5. **The bridge is always-on** (launchd `com.piextensions.mesh-telegram-bridge`). If traffic seems stuck, it's almost always a mesh-sidecar or addressing issue, not the bridge being down.

---

## Reference

Source: `packages/mesh-telegram-bridge/src/{bridge.ts, mesh-client.ts, config.ts, index.ts}` + launchd plist + README. Config (bot token, chat id, mesh id, OpenRouter key) lives in `~/.config/mesh-telegram-bridge/config.env` (mode 600, gitignored, outside the repo). Topic↔agent state persists in `~/.config/mesh-telegram-bridge/state.json`. Restart the bridge: `launchctl kickstart -k gui/$(id -u)/com.piextensions.mesh-telegram-bridge`.
