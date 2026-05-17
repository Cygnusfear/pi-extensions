import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const SKILLS_STATUS_KEY = "skills";
const DEFAULT_SKILLS_SOURCE =
  process.env.PI_SKILLS_SOURCE ?? "https://github.com/user/agent-skills.git";

function cleanOutput(raw: string): string {
  return raw
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
    .replace(/\x1b\[\?25[hl]/g, "")
    .replace(/\[999D\[J/g, "")
    .replace(/[█▓░╔╗╚╝║═╠╣╬╦╩├┤┬┴┼┌┐└┘│─╮╯╰╭◇◆●◒◐◓◑]/g, "")
    .replace(/[✓✗]/g, (m) => (m === "✓" ? "OK" : "FAIL"))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function runSkills(pi: ExtensionAPI, args: string[], cwd: string, signal?: AbortSignal) {
  return pi.exec("bunx", ["--bun", "skills", ...args], { cwd, signal });
}

async function getPackageUpdateStatus(pi: ExtensionAPI, pkgDir: string) {
  const status = await pi.exec("git", ["status", "--porcelain"], { cwd: pkgDir });
  if (status.code !== 0 || status.stdout.trim().length > 0) {
    return { shouldNotify: false, reason: "dirty" as const };
  }

  const fetch = await pi.exec("git", ["fetch", "--quiet"], { cwd: pkgDir });
  if (fetch.code !== 0) {
    return { shouldNotify: false, reason: "fetch-failed" as const };
  }

  const ahead = await pi.exec("git", ["rev-list", "@{u}..HEAD", "--count"], { cwd: pkgDir });
  const behind = await pi.exec("git", ["rev-list", "HEAD..@{u}", "--count"], { cwd: pkgDir });
  if (ahead.code !== 0 || behind.code !== 0) {
    return { shouldNotify: false, reason: "no-upstream" as const };
  }

  const aheadCount = parseInt(ahead.stdout.trim(), 10) || 0;
  const behindCount = parseInt(behind.stdout.trim(), 10) || 0;

  return {
    shouldNotify: aheadCount === 0 && behindCount > 0,
    reason: aheadCount > 0 ? ("diverged" as const) : ("ok" as const),
  };
}

export default function skillsExtension(pi: ExtensionAPI) {
  // Check for skill + package updates on session start (non-blocking)
  pi.on("session_start", (_event, ctx) => {
    (async () => {
      const updates: string[] = [];

      // Check skills (skip if no skills installed via CLI)
      try {
        const r = await runSkills(pi, ["check"], ctx.cwd);
        if (r.code === 0) {
          const out = cleanOutput(r.stdout);
          // Only flag if there are actual updates, not "no skills tracked"
          if (
            out.match(/updates? available|new version|can be updated/i) &&
            !out.match(/no skills tracked|not tracked|install skills/i)
          ) {
            updates.push("skills");
          }
        }
      } catch {}

      // Check this package (compare local HEAD to remote)
      try {
        const pkgDir = new URL(".", import.meta.url).pathname.replace(/\/extensions\/$/, "");
        const pkg = await getPackageUpdateStatus(pi, pkgDir);
        if (pkg.shouldNotify) {
          updates.push("package");
        }
      } catch {}

      if (updates.length > 0) {
        ctx.ui.setStatus(SKILLS_STATUS_KEY, `⬆ ${updates.join(" + ")} updates available`);
      } else {
        ctx.ui.setStatus(SKILLS_STATUS_KEY, undefined);
      }
    })();
  });

  pi.registerCommand("skills:install", {
    description: "Install skills: /skills:install [source] [--skill name] [--global]",
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const source = parts[0] || DEFAULT_SKILLS_SOURCE;
      const extra = parts.slice(1);

      ctx.ui.notify(`Installing skills from ${source}...`, "info");

      const r = await runSkills(
        pi,
        ["add", source, "-a", "-g", "pi", "-y", ...extra],
        ctx.cwd,
        ctx.signal,
      );

      if (r.code !== 0) {
        ctx.ui.notify(`Install failed (exit ${r.code}): ${r.stderr}`, "error");
      } else {
        ctx.ui.setStatus(SKILLS_STATUS_KEY, undefined);
        ctx.ui.notify(cleanOutput(r.stdout) || "Skills installed. Reloading...", "info");
        await ctx.reload();
      }
    },
  });

  pi.registerCommand("skills:check", {
    description: "Check for available skill updates",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Checking for skill updates...", "info");

      const r = await runSkills(pi, ["check"], ctx.cwd, ctx.signal);

      if (r.code !== 0) {
        ctx.ui.notify(`Check failed (exit ${r.code}): ${r.stderr}`, "error");
      } else {
        const out = cleanOutput(r.stdout);
        if (
          out.match(/updates? available|new version|can be updated/i) &&
          !out.match(/no skills tracked|not tracked|install skills/i)
        ) {
          ctx.ui.setStatus(SKILLS_STATUS_KEY, "⬆ skills updates available");
        } else {
          ctx.ui.setStatus(SKILLS_STATUS_KEY, undefined);
        }
        ctx.ui.notify(out || "All skills up to date", "info");
      }
    },
  });

  pi.registerCommand("skills:update", {
    description: "Update all installed skills to latest versions",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Updating skills...", "info");

      const r = await runSkills(pi, ["update"], ctx.cwd, ctx.signal);

      if (r.code !== 0) {
        ctx.ui.notify(`Update failed (exit ${r.code}): ${r.stderr}`, "error");
      } else {
        ctx.ui.setStatus(SKILLS_STATUS_KEY, undefined);
        ctx.ui.notify(cleanOutput(r.stdout) || "Skills updated. Reloading...", "info");
        await ctx.reload();
      }
    },
  });

  pi.registerCommand("skills:list", {
    description: "List installed skills: /skills:list [--global]",
    handler: async (args, ctx) => {
      const extra = args.trim().split(/\s+/).filter(Boolean);

      const r = await runSkills(pi, ["list", "-a", "pi", ...extra], ctx.cwd, ctx.signal);

      if (r.code !== 0) {
        ctx.ui.notify(`List failed (exit ${r.code}): ${r.stderr}`, "error");
      } else {
        ctx.ui.notify(cleanOutput(r.stdout) || "No skills installed", "info");
      }
    },
  });

  pi.registerCommand("skills:remove", {
    description: "Remove skills: /skills:remove <name...> or /skills:remove --all",
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) {
        ctx.ui.notify("Usage: /skills:remove <name> or /skills:remove --all", "warning");
        return;
      }

      const r = await runSkills(pi, ["remove", ...parts, "-a", "pi", "-y"], ctx.cwd, ctx.signal);

      if (r.code !== 0) {
        ctx.ui.notify(`Remove failed (exit ${r.code}): ${r.stderr}`, "error");
      } else {
        ctx.ui.notify(cleanOutput(r.stdout) || "Skills removed. Reloading...", "info");
        await ctx.reload();
      }
    },
  });
}
