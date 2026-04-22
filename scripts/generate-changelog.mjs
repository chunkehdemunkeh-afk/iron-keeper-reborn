/**
 * generate-changelog.mjs
 *
 * Runs as a GitHub Action on every push to main.
 * Reads recent git commits and upserts a daily changelog entry into
 * src/lib/changelog.ts.
 *
 * Behaviour:
 *   • Baseline = the most recent "Auto-update changelog" commit.
 *     Only commits AFTER that point are considered new.
 *   • If no auto-update has ever run, falls back to the last human
 *     commit that touched changelog.ts.
 *   • Generic / noisy commits are filtered out.
 *   • File-map fallbacks are intentionally removed — they produced
 *     vague entries ("Food tracker improvements") that persisted
 *     across versions even after the real fix was already listed.
 */

import { execSync }           from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join }      from "path";
import { fileURLToPath }      from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHANGELOG = join(__dirname, "../src/lib/changelog.ts");
const today     = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

// ── Helpers ────────────────────────────────────────────────────────────────────

function run(cmd) {
  try { return execSync(cmd, { encoding: "utf8" }).trim(); }
  catch { return ""; }
}

function bumpPatch(version) {
  const parts = version.split(".").map(Number);
  parts[2] += 1;
  return parts.join(".");
}

// Commit messages we always ignore (technical / meta / too vague).
// "Save plan in Lovable" and bare "Changes" are Lovable's placeholder commits
// that carry no information about what actually changed — drop them so the
// real descriptive commit (the first one of a Lovable turn) is what surfaces.
const NOISE_RE = /^(work in progress|wip|changes?$|misc|temp|auto-update changelog|bump.?version|applied |switch(ed)? to|hard.?code|reverted?|updated?\s*$|added?\s*$|fix\s*$|test\s*$|restored?|fix pwa|pwa |service worker|sw |auto-update|skip waiting|controllerchange|networkfirst|cache|hash poll|ik-up|fix stale|deadlock|dual.?strat|registration|deployed?|rollback|co-authored|save plan in lovable|lovable plan|lovable tool use)/i;
const INFRA_RE = /\b(sw\.js|vite\.config|github action|workbox|service.?worker|localstorage|flag|cache-buster|supabase|schema|migration|typescript|tsx|eslint|linting|npm|bun\.lock|package\.json)\b/i;

// ── Read changelog ─────────────────────────────────────────────────────────────

let content = readFileSync(CHANGELOG, "utf8");

const latestVersionMatch = content.match(/version:\s*"(\d+\.\d+\.\d+)"/);
const latestVersion = latestVersionMatch ? latestVersionMatch[1] : "1.6.0";

// ── Find sinceHash ─────────────────────────────────────────────────────────────
// Use the most recent "Auto-update changelog" commit as the baseline so we only
// ever collect commits that arrived AFTER the last auto-run.
// Falls back to the last human commit that touched changelog.ts if no auto-run exists.

const changelogHistory = run(
  `git log --oneline --follow -- src/lib/changelog.ts`
).split("\n").filter(Boolean);

let sinceHash = "";

// First pass: find the most recent auto-update commit
for (const line of changelogHistory) {
  const [hash, ...msgParts] = line.split(" ");
  const msg = msgParts.join(" ");
  if (msg.startsWith("Auto-update changelog")) {
    sinceHash = hash;
    break;
  }
}

// Second pass fallback: last human commit touching changelog.ts
if (!sinceHash) {
  for (const line of changelogHistory) {
    const [hash, ...msgParts] = line.split(" ");
    const msg = msgParts.join(" ");
    if (!msg.startsWith("Auto-update changelog")) {
      sinceHash = hash;
      break;
    }
  }
}

// ── Collect commits since baseline ────────────────────────────────────────────

const gitLogCmd = sinceHash
  ? `git log --oneline --no-merges ${sinceHash}..HEAD`
  : `git log --oneline --no-merges -20`;

const rawCommits = run(gitLogCmd)
  .split("\n")
  .filter(Boolean)
  .map(line => line.replace(/^[a-f0-9]+ /, "").trim());

const changes = rawCommits
  .filter(msg => !NOISE_RE.test(msg))
  .filter(msg => !INFRA_RE.test(msg))
  .filter(msg => msg.length >= 8 && msg.length <= 120)
  .map(msg => msg.charAt(0).toUpperCase() + msg.slice(1))
  // Deduplicate (case-insensitive)
  .filter((msg, i, arr) => arr.findIndex(m => m.toLowerCase() === msg.toLowerCase()) === i)
  .slice(0, 8);

if (changes.length === 0) {
  console.log("No meaningful changes since last auto-update — skipping.");
  process.exit(0);
}

// ── Extract existing bullets from today's entry (if any) so we merge instead
// of clobbering. Lovable pushes commits in bursts; without merging, a later
// "Save plan in Lovable" run wipes out the descriptive entry from earlier.
function extractTodayBullets(src, dateStr) {
  const dateIdx = src.indexOf(`date: "${dateStr}"`);
  if (dateIdx === -1) return [];
  // Find the changes: [...] array within this entry
  const changesIdx = src.indexOf("changes:", dateIdx);
  if (changesIdx === -1) return [];
  const arrStart = src.indexOf("[", changesIdx);
  const arrEnd = src.indexOf("]", arrStart);
  if (arrStart === -1 || arrEnd === -1) return [];
  const block = src.slice(arrStart + 1, arrEnd);
  const matches = [...block.matchAll(/"((?:[^"\\]|\\.)*)"/g)];
  return matches.map(m => m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
}

// ── Build entry ────────────────────────────────────────────────────────────────

const newVersion = bumpPatch(latestVersion);

const bulletList = changes
  .map(c => `      "${c.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
  .join(",\n");

const entryBody = `{
    version: "${newVersion}",
    date: "${today}",
    title: "Updates & Fixes",
    changes: [
${bulletList},
    ],
  },`;

const entryWithIndent = `  ${entryBody}`;

// ── Write back ─────────────────────────────────────────────────────────────────

const todayInFile = content.includes(`date: "${today}"`);

if (todayInFile) {
  // Replace the existing today block
  const dateStr = `date: "${today}"`;
  const dateIdx = content.indexOf(dateStr);
  if (dateIdx === -1) {
    console.log("Could not locate today's entry — skipping.");
    process.exit(0);
  }

  let start = dateIdx;
  while (start > 0 && content[start] !== "{") start--;

  let depth = 0, end = start;
  while (end < content.length) {
    if (content[end] === "{") depth++;
    if (content[end] === "}") { depth--; if (depth === 0) { end++; break; } }
    end++;
  }
  if (content[end] === ",") end++;

  content = content.slice(0, start) + entryBody + content.slice(end);
  console.log(`♻️  Replaced today's (${today}) entry — v${newVersion}, ${changes.length} changes`);
} else {
  content = content.replace(
    /export const changelog: ChangelogEntry\[\]\s*=\s*\[/,
    `export const changelog: ChangelogEntry[] = [\n${entryWithIndent}`
  );
  console.log(`✅ Added new changelog entry — v${newVersion}, ${changes.length} changes`);
}

writeFileSync(CHANGELOG, content, "utf8");
