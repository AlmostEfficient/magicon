/**
 * Exports icon vibes as 1024x1024 PNGs.
 *
 * Usage:
 *   bun generate.ts        → exports all vibe-*.html in project root to ./out/
 *   bun generate.ts 1      → exports vibe-1-*.html (and copies to Xcode if XCODE_ASSETS_PATH is set)
 *   bun generate.ts 2      → exports vibe-2-*.html (and copies to Xcode if XCODE_ASSETS_PATH is set)
 *   ...etc
 *
 * Env:
 *   XCODE_ASSETS_PATH  optional path to an Xcode AppIcon.appiconset directory
 */

import puppeteer from "puppeteer";
import { resolve } from "path";
import { mkdirSync, copyFileSync, readdirSync } from "fs";

// Auto-discover vibe-N-name.html files in the project root
const allFiles = readdirSync(import.meta.dir).filter((f) =>
  /^vibe-\d+-[^/]+\.html$/.test(f)
);

const ICONS = allFiles
  .map((file) => {
    const match = file.match(/^vibe-(\d+)-(.+)\.html$/);
    if (!match) return null;
    const index = parseInt(match[1], 10);
    const slug = match[2];
    return { index, name: `vibe-${match[1]}-${slug}`, file, label: slug };
  })
  .filter(Boolean)
  .sort((a, b) => a!.index - b!.index) as {
  index: number;
  name: string;
  file: string;
  label: string;
}[];

const XCODE_ASSETS = process.env.XCODE_ASSETS_PATH
  ? resolve(process.env.XCODE_ASSETS_PATH)
  : null;

const outDir = resolve(import.meta.dir, "out");
mkdirSync(outDir, { recursive: true });

const arg = Bun.argv[2];

if (ICONS.length === 0) {
  console.log("No vibes found. Create a vibe-1-name.html file in the project root to get started.");
  process.exit(0);
}

const toExport = arg
  ? ICONS.filter((icon) => String(icon.index) === arg)
  : ICONS;

if (toExport.length === 0) {
  const available = ICONS.map((i) => i.index).join(", ");
  console.error(`No vibe "${arg}" found. Available: ${available}`);
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
  const lines = ICONS.map((i) => `  bun generate.ts ${i.index}   # ${i.label}`).join("\n");
  console.log(`\nAll done. Pick one and run it solo to auto-install:\n\n${lines}\n`);
}
