/**
 * Exports icon vibes as 1024x1024 PNGs.
 *
 * Usage:
 *   bun generate.ts        → exports all 5 to ./out/
 *   bun generate.ts 1      → exports vibe 1 (and copies to Xcode if XCODE_ASSETS_PATH is set)
 *   bun generate.ts 2      → exports vibe 2 (and copies to Xcode if XCODE_ASSETS_PATH is set)
 *   ...etc
 *
 * Env:
 *   XCODE_ASSETS_PATH  optional path to an Xcode AppIcon.appiconset directory
 */

import puppeteer from "puppeteer";
import { resolve } from "path";
import { mkdirSync, copyFileSync } from "fs";

const ICONS = [
  { name: "vibe-1-bubble",   file: "vibe-1-bubble.html",   label: "The Message" },
  { name: "vibe-2-type",     file: "vibe-2-type.html",     label: "Big Type" },
  { name: "vibe-3-messages", file: "vibe-3-messages.html", label: "Group Chat" },
  { name: "vibe-4-badge",    file: "vibe-4-badge.html",    label: "The Notif" },
  { name: "vibe-5-brat",     file: "vibe-5-brat.html",     label: "brat" },
];

const XCODE_ASSETS = process.env.XCODE_ASSETS_PATH
  ? resolve(process.env.XCODE_ASSETS_PATH)
  : null;

const outDir = resolve(import.meta.dir, "out");
mkdirSync(outDir, { recursive: true });

const arg = Bun.argv[2];
const toExport = arg ? ICONS.filter((_, i) => String(i + 1) === arg) : ICONS;

if (toExport.length === 0) {
  console.error(`Unknown vibe "${arg}". Use 1–5.`);
  process.exit(1);
}

console.log(`Launching browser…`);
const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

for (const icon of toExport) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });

  const url = `file://${resolve(import.meta.dir, icon.file)}`;
  await page.goto(url, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 300));

  const outPath = resolve(outDir, `${icon.name}.png`);
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1024, height: 1024 } });
  await page.close();

  console.log(`✓  ${icon.label.padEnd(14)} → out/${icon.name}.png`);
}

await browser.close();

// Single vibe: auto-copy to Xcode if path is configured
if (toExport.length === 1) {
  if (XCODE_ASSETS) {
    const srcPath = resolve(outDir, `${toExport[0].name}.png`);
    const destPath = resolve(XCODE_ASSETS, "AppIcon.png");
    copyFileSync(srcPath, destPath);
    console.log(`\n→ Copied to Xcode assets. Rebuild to see it on your phone.`);
  } else {
    console.log(`\n→ Set XCODE_ASSETS_PATH to auto-copy to an Xcode project.`);
  }
} else {
  console.log(`
All done. Pick one and run it solo to auto-install:

  bun generate.ts 1   # The Message (blue bubble)
  bun generate.ts 2   # Big Type
  bun generate.ts 3   # Group Chat
  bun generate.ts 4   # The Notif
  bun generate.ts 5   # brat
`);
}
