#!/usr/bin/env node
// Autopilot: runs /next headless in a loop until build milestones are done, one is blocked,
// a run fails, the ship buffer is reached, or the iteration cap is hit.
// Usage: node scripts/autopilot.mjs [--max 8] [--turns 80] [--tests]
// Never runs /ship (production deploy + public repo need you). Ctrl-C to stop anytime.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? Number(args[i + 1]) : def; };
const MAX = opt("--max", 8), TURNS = opt("--turns", 80);
const env = { ...process.env, ...(args.includes("--tests") ? { HACK_STOP_TESTS: "1" } : {}) };

const deadline = () => {
  const m = readFileSync("RULES.md", "utf8").match(/^deadline:\s*"?([^"#\s]+)/m);
  return m ? new Date(m[1]) : null;
};
const status = () => {
  const lines = readFileSync("STATUS.md", "utf8").split("\n").filter((l) => /^- \[.\]/.test(l));
  return {
    todo: lines.filter((l) => /^- \[ \]/.test(l) && !/\(ship\)/.test(l)),
    blocked: lines.filter((l) => /^- \[!\]/.test(l)),
  };
};

const PROMPT =
  "Autopilot mode. Follow .claude/commands/next.md exactly for ONE milestone. " +
  "If the session-start notes say the plan does not fit, first follow .claude/commands/recut.md in headless mode. " +
  "Do not ask questions; if you need the operator, mark the milestone blocked with the reason and stop.";

for (let i = 1; i <= MAX; i++) {
  const s = status();
  if (s.blocked.length) { console.log(`\n⛔ Blocked:\n${s.blocked.join("\n")}\nResolve it, then rerun.`); process.exit(1); }
  if (!s.todo.length) { console.log("\n✅ All build milestones done. Open `claude` and run /ship."); process.exit(0); }
  const d = deadline();
  if (d) {
    const h = (d - Date.now()) / 36e5, buffer = Math.max(6, h * 0.15);
    if (h <= buffer) { console.log(`\n⏰ ${h.toFixed(1)}h left — inside ship buffer. Stop building; run /ship.`); process.exit(0); }
  }

  console.log(`\n━━ Autopilot run ${i}/${MAX} → ${s.todo[0].replace(/^- \[ \]\s*/, "")}`);
  const before = s.todo.length;
  const r = spawnSync("claude", ["-p", PROMPT, "--permission-mode", "acceptEdits", "--max-turns", String(TURNS)], {
    stdio: "inherit", env, shell: process.platform === "win32",
  });
  if (r.status !== 0) { console.log(`\n❌ claude exited with ${r.status}. Stopping.`); process.exit(1); }
  if (status().todo.length >= before && !status().blocked.length) {
    console.log("\n⚠ No milestone ticked this run. Stopping so you can look."); process.exit(1);
  }
}
console.log(`\nReached --max ${MAX} runs. Check progress and rerun if happy.`);
