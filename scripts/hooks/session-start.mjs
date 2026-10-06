#!/usr/bin/env node
// SessionStart hook: stdout is added to Claude's context at the start of each session.
// Prints time remaining (WAT), milestone progress, and whether the plan likely fits.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const out = [];

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*"?([^"#]*?)"?\s*(#.*)?$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

const fmtWAT = (d) =>
  d.toLocaleString("en-GB", { timeZone: "Africa/Lagos", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " WAT";

let hoursLeft = null;
const rulesPath = join(dir, "RULES.md");
if (existsSync(rulesPath)) {
  const fm = frontmatter(readFileSync(rulesPath, "utf8"));
  const deadline = new Date(fm.deadline);
  if (!isNaN(deadline)) {
    hoursLeft = (deadline - Date.now()) / 36e5;
    const d = Math.floor(Math.abs(hoursLeft) / 24), h = Math.floor(Math.abs(hoursLeft) % 24);
    out.push(`HACKATHON: ${fm.name || "(unnamed)"}`);
    out.push(`Now: ${fmtWAT(new Date())} | Deadline: ${fmtWAT(deadline)}`);
    out.push(hoursLeft > 0 ? `TIME LEFT: ${d}d ${h}h (${hoursLeft.toFixed(1)}h)` : `DEADLINE PASSED ${d}d ${h}h ago.`);
    if (fm.ai_policy) out.push(`AI policy: ${fm.ai_policy}`);
    if (fm.last_checked) {
      const since = (Date.now() - new Date(fm.last_checked)) / 36e5;
      if (isNaN(since)) out.push("Rules never checked → run /check.");
      else if (since > 12) out.push(`Rules last checked ${since.toFixed(0)}h ago → run /check.`);
    } else out.push("Rules never checked → run /check.");
  } else out.push("RULES.md deadline missing or unparseable — fix the frontmatter.");
} else out.push("No RULES.md found in this folder.");

const statusPath = join(dir, "STATUS.md");
if (existsSync(statusPath)) {
  const lines = readFileSync(statusPath, "utf8").split("\n").filter((l) => /^- \[.\]/.test(l));
  const count = (re) => lines.filter((l) => re.test(l)).length;
  const done = count(/^- \[x\]/i), cut = count(/^- \[-\]/), blocked = count(/^- \[!\]/);
  const todo = lines.filter((l) => /^- \[ \]/.test(l));
  const mustLeft = todo.filter((l) => /\(must\)/.test(l)).length;
  out.push(`Milestones: ${done} done, ${todo.length} todo (${mustLeft} must), ${blocked} blocked, ${cut} cut.`);
  const nextM = todo.find((l) => !/\(ship\)/.test(l));
  if (nextM) out.push(`Next: ${nextM.replace(/^- \[ \]\s*/, "")}`);
  if (blocked) out.push("There are BLOCKED milestones — surface them to the operator first.");
  if (hoursLeft !== null && hoursLeft > 0) {
    const buffer = Math.max(6, hoursLeft * 0.15);
    const usable = (hoursLeft - buffer) * (16 / 24); // assume ~8h sleep/day
    const buildTodo = todo.filter((l) => !/\(ship\)/.test(l)).length;
    // crude: flag if < 3 usable hours per remaining milestone
    if (buildTodo && usable / buildTodo < 3) out.push(`WARNING: ~${usable.toFixed(0)} usable build hours for ${buildTodo} milestones → run /recut before building.`);
    if (hoursLeft < buffer + 1 && todo.some((l) => /\(ship\)/.test(l))) out.push("INSIDE SHIP BUFFER → stop building features, run /ship.");
  }
}

console.log(out.join("\n"));
