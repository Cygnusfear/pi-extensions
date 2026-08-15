# telegram-coordinator — Ada

The hooman's calling agent: a dedicated pi session whose extension gives it a
Telegram voice loop. Voice notes in (Whisper, shared transcription chain),
female-voiced speech out (fish.audio, shared TTS module).

## Run

1. Config: `~/.config/telegram-coordinator/config.env` (mode 600) with
   `TELEGRAM_BOT_TOKEN` and `FISH_AUDIO_API_KEY` (+ optional
   `FISH_AUDIO_VOICE_ID_FEMALE`). `TELEGRAM_CHAT_ID` is auto-persisted from
   the first inbound message.
2. Launch a dedicated pi session in a persistent pane (pi is TUI-first — "use
   tmux"): `pi --extension @pi-extensions/telegram-coordinator` with this
   package as cwd so SYSTEM.md loads.
3. The extension starts grammy long-polling on session start; the bot loop is
   independent of agent turns.

Source: `extensions/telegram-coordinator.ts` (ears + mouth), `src/config.ts`
(config), SYSTEM.md (Ada's role).
