#!/usr/bin/env node
/**
 * Generate a new theme from src/themes/_template.
 *
 * Usage:
 *   node scripts/new-theme.mjs <number>
 *
 * Example:
 *   node scripts/new-theme.mjs 7
 *   → copies src/themes/_template → src/themes/theme-7
 *   → replaces every __N__ with 7
 *   → prints the line to add to ThemeRouter
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_DIR = path.join(ROOT, "src", "themes", "_template");
const THEMES_DIR = path.join(ROOT, "src", "themes");

const arg = process.argv[2];
const num = Number.parseInt(arg, 10);

if (!Number.isInteger(num) || num < 1) {
  console.error("Usage: node scripts/new-theme.mjs <number>");
  console.error("Example: node scripts/new-theme.mjs 7");
  process.exit(1);
}

const targetDir = path.join(THEMES_DIR, `theme-${num}`);

try {
  await fs.access(targetDir);
  console.error(`Aborting: ${targetDir} already exists.`);
  process.exit(1);
} catch {
  // doesn't exist — good, proceed
}

try {
  await fs.access(TEMPLATE_DIR);
} catch {
  console.error(`Template not found at ${TEMPLATE_DIR}`);
  process.exit(1);
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

async function substituteInTree(dir, token, value) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await substituteInTree(p, token, value);
      continue;
    }
    if (!/\.(tsx?|css|md|json)$/.test(entry.name)) continue;
    const original = await fs.readFile(p, "utf8");
    if (!original.includes(token)) continue;
    await fs.writeFile(p, original.split(token).join(value));
  }
}

await copyDir(TEMPLATE_DIR, targetDir);
await substituteInTree(targetDir, "__N__", String(num));
await fs.rm(path.join(targetDir, "README.md"), { force: true });

const themeId = num - 1;
console.log(`Created src/themes/theme-${num}/`);
console.log("");
console.log("Next steps:");
console.log(`  1. Edit src/themes/theme-${num}/theme.css — palette + fonts`);
console.log(`  2. Edit src/themes/theme-${num}/ProductCard.tsx — card layout`);
console.log(`  3. Edit src/themes/theme-${num}/CategoryTabs.tsx — tab style`);
console.log("");
console.log("  4. Register in src/themes/ThemeRouter.tsx:");
console.log(`       ${themeId}: lazy(() => import("./theme-${num}")),`);
