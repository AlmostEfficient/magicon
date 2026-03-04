# magicon

Generate app icons as self-contained HTML files, rendered to PNG via Puppeteer.

## How to work here

1. Read `app.json` to understand the app — name, platform, accent color, vibe description.
2. Create icon concepts as `vibe-N-name.html` in the project root (e.g. `vibe-1-minimal.html`, `vibe-2-bold.html`).
3. Tell the human to run `bun generate.ts [n]` to render a specific vibe to PNG.
4. Iterate based on feedback.

## HTML file format

Each `vibe-N-name.html` must be:
- **Self-contained** — no external URLs, no imports, no web fonts
- **1024×1024** — `<html style="width:1024px;height:1024px">`, body fills it completely
- **System fonts only** — `-apple-system`, `SF Pro`, `Helvetica Neue`, `Arial`, etc.
- **iOS safe zone** — keep meaningful content inside ~780px diameter circle centered in the 1024px canvas (iOS masks icons to a rounded rect; corners get clipped)
- Single `<style>` block, no `<script>` needed unless animating
- No `<!DOCTYPE>` required

## Rendering

```
bun generate.ts        # renders all vibe-*.html in root → ./out/
bun generate.ts 1      # renders vibe-1-*.html → ./out/ (+ copies to Xcode if env set)
```

Output PNGs land in `./out/`. The human opens them to review.

## Xcode auto-copy

If `XCODE_ASSETS_PATH` env var is set to an Xcode `AppIcon.appiconset` directory, running a single vibe automatically copies the PNG there as `AppIcon.png`. The human rebuilds to see it on device.

```
XCODE_ASSETS_PATH=../MyApp/Assets.xcassets/AppIcon.appiconset bun generate.ts 1
```

## Examples

See `examples/wyd/` for 5 icon concepts from the wyd app. Use them as reference for style, structure, and safe-zone handling.

## Iteration loop

1. You write/edit `vibe-N-name.html`
2. Human runs `bun generate.ts N`
3. Human describes what to change
4. Repeat
