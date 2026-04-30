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

## Harness (live refinement)

```
bun serve.ts           # starts dev server on localhost:3333
bun serve.ts 4000      # custom port
```

The harness at `harness.html` shows a sidebar of vibes, live iframe preview at multiple sizes, and parameter sliders. Hot-reloads on file changes via WebSocket.

### Adding params to an icon

When an icon is ready for refinement, add CSS variables to `:root` and a param declaration block:

```html
<style>
  :root {
    --stroke-width: 4px;
    --glow-opacity: 0.6;
  }
  /* ...use var(--stroke-width) etc in styles... */
</style>

<script type="application/json" id="params">
[
  { "name": "Stroke Width", "var": "--stroke-width", "type": "range",
    "min": 1, "max": 12, "step": 0.5, "default": 4, "unit": "px" },
  { "name": "Glow Opacity", "var": "--glow-opacity", "type": "range",
    "min": 0, "max": 1, "step": 0.05, "default": 0.6 },
  { "name": "Line Join", "var": "--line-join", "type": "select",
    "options": ["miter", "round", "bevel"], "default": "round" },
  { "name": "Accent Color", "var": "--accent", "type": "color",
    "default": "#4094FF" }
]
</script>
```

Param types: `range` (slider), `select` (dropdown), `color` (picker).

The harness Save button writes current slider values back into the HTML file's `:root` CSS variables, so `bun generate.ts N` renders exactly what the harness shows.

## Iteration loop

1. You write/edit `vibe-N-name.html`
2. Human runs `bun serve.ts` and tweaks params in browser
3. Human runs `bun generate.ts N` to export PNG when happy
4. Human describes what to change, or pastes the Copy text from harness
5. Repeat
