The iteration loop as it actually happened:

  1. Claude wrote an icon as a 1024×1024 self-contained HTML file (SVG + CSS filters + bg glow)
  2. User opened it in browser / refreshed preview.html manually
  3. User gave feedback ("cut off at top", "doesn't hit", "still cut off")
  4. Claude edited the file — sometimes a parameter tweak, sometimes a full redesign
  5. Repeat from 2

  What "parameters" looked like in practice — two categories:

  Continuous (slider-worthy):
  - SVG path coordinates (apex Y position, arm horizontal spread → encodes angle)
  - Stroke width per chevron
  - Opacity per chevron (the fade curve across 3 elements)
  - Glow blur radii + opacity in CSS filter
  - Background radial gradient position + intensity
  - ViewBox dimensions (indirectly controls padding/clipping)

  Discrete (toggle/select):
  - stroke-linejoin: miter vs round — a fundamental aesthetic choice, not a continuum
  - stroke-linecap: butt vs round
  - Color scheme (blue vs amber etc.)

  The version problem we hit:
  - User wanted to "scrub through iterations" — we had 3 versions of the kiki icon
  - They were stored as separate files (kiki-1, kiki-2, kiki-3) added manually
  - No structured way to compare or move between them

  Key constraint Opus should know:
  - Parameters are currently implicit in SVG/CSS — not declared anywhere
  - For the harness, they need to be declared explicitly so the harness can generate UI and Claude can find + update them by name without parsing the whole file

  The other Sonnet instance context:
  - Separate tab ran a generate script + copied final icon to the Xcode project
  - That's process #3 — out of scope for the harness, just a terminal handoff

  Focus for Opus: design the param declaration format + the iteration UI (slider generation, version history, side-by-side compare). The file format and the harness are the two things to
   spec.

   claude --resume cbb33d63-a92e-4a6c-80df-15318b4cd8da