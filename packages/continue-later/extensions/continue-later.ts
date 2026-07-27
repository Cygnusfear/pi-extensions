/**
 * /continue — schedule a message to re-trigger this session later.
 *
 * Rate-limited agent? Schedule `/continue 2h go` and walk away instead of
 * burning paid retries. When the timer fires, the text lands via
 * pi.sendUserMessage(deliverAs: "followUp"): an idle agent starts a turn, a
 * busy agent gets it queued after its current turn.
 *
 * Timers are in-process and do not survive a pi restart.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  CONTINUE_USAGE,
  ContinueScheduler,
  formatClockTime,
  formatEta,
  formatPendingList,
  parseWhen,
} from "../src/continue-later.js";

export default function (pi: ExtensionAPI) {
  const scheduler = new ContinueScheduler((text) =>
    pi.sendUserMessage(text, { deliverAs: "followUp" }),
  );

  pi.registerCommand("continue", {
    description:
      "Schedule a message to re-trigger this session later. /continue 2h go · /continue 22:40 review the fix · /continue list · /continue cancel <id|all>. In-process timers; lost on restart.",
    handler: async (args, ctx) => {
      const notify = (message: string, level: "info" | "error" = "info") => {
        if (ctx.hasUI) ctx.ui.notify(message, level);
      };

      const input = args.trim();

      if (!input) {
        notify(formatPendingList(scheduler.list()) + "\n\n" + CONTINUE_USAGE);
        return;
      }

      if (input === "list") {
        notify(formatPendingList(scheduler.list()));
        return;
      }

      if (input === "cancel" || input.startsWith("cancel ")) {
        const arg = input === "cancel" ? "" : input.slice("cancel ".length).trim();
        if (arg === "all") {
          const count = scheduler.cancelAll();
          notify(count > 0 ? `Cancelled ${count} scheduled continuation(s).` : "Nothing scheduled.");
          return;
        }
        const id = Number(arg);
        if (Number.isInteger(id) && id > 0 && scheduler.cancel(id)) {
          notify(`Cancelled continuation #${id}.`);
        } else {
          notify(`No scheduled continuation ${arg ? "#" + arg : ""}.\n` + formatPendingList(scheduler.list()), "error");
        }
        return;
      }

      const [whenToken, ...rest] = input.split(/\s+/);
      const fireAt = parseWhen(whenToken);
      if (fireAt === null) {
        notify(`Could not parse "${whenToken}" as a time.\n\n` + CONTINUE_USAGE, "error");
        return;
      }

      const text = rest.join(" ").trim() || "go";
      const entry = scheduler.schedule(fireAt, text);
      notify(
        `Scheduled #${entry.id}: "${text}" at ${formatClockTime(entry.fireAt)} (${formatEta(entry.fireAt - Date.now())}). In-process timer — lost on restart.`,
      );
    },
  });
}
