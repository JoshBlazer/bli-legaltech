#!/usr/bin/env node
// Stop hook: blocks Claude from ending a turn with uncommitted work (and optionally failing tests).
// Exit 2 + stderr = Claude is told why and continues. Blocks at most once per turn (stop_hook_active).
// Disable: HACK_STOP_GUARD=0. Enable test run: HACK_STOP_TESTS=1.
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

if (process.env.HACK_STOP_GUARD === "0") process.exit(0);

let input = {};
try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch {}
if (input.stop_hook_active) process.exit(0); // already blocked once this turn — don't loop

const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const sh = (cmd) => execSync(cmd, { cwd: dir, stdio: ["ignore", "pipe", "pipe"] }).toString();

const problems = [];
try {
  const dirty = sh("git status --porcelain").trim();
  if (dirty) problems.push(`Uncommitted changes:\n${dirty.split("\n").slice(0, 15).join("\n")}\nCommit them (conventional message, no AI attribution) or tell the operator why they should stay uncommitted.`);
} catch { /* not a git repo yet */ }

if (process.env.HACK_STOP_TESTS === "1") {
  try {
    if (existsSync(join(dir, "foundry.toml"))) sh("forge test -q");
    const pkg = join(dir, "package.json");
    if (existsSync(pkg) && JSON.parse(readFileSync(pkg, "utf8")).scripts?.test) sh("npm test --silent");
  } catch (e) {
    problems.push(`Tests are failing:\n${(e.stdout?.toString() || e.message).slice(-1500)}\nFix them or mark the milestone [!] blocked with the reason.`);
  }
}

if (problems.length) {
  process.stderr.write(problems.join("\n\n"));
  process.exit(2);
}
process.exit(0);
