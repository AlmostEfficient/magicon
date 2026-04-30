/**
 * Dev server + live harness for icon refinement.
 *
 * Usage:
 *   bun serve.ts          → starts on localhost:3333
 *   bun serve.ts 4000     → starts on custom port
 */

import { readFileSync, readdirSync, writeFileSync, watch } from "fs";
import { resolve, join } from "path";

const PORT = parseInt(Bun.argv[2] || "3333", 10);
const ROOT = import.meta.dir;

// ── Vibe discovery (same regex as generate.ts) ──────────────

function discoverVibes() {
  return readdirSync(ROOT)
    .filter((f) => /^vibe-\d+-[^/]+\.html$/.test(f))
    .map((file) => {
      const m = file.match(/^vibe-(\d+)-(.+)\.html$/);
      if (!m) return null;
      return { index: parseInt(m[1], 10), slug: m[2], file };
    })
    .filter(Boolean)
    .sort((a, b) => a!.index - b!.index) as {
    index: number;
    slug: string;
    file: string;
  }[];
}

// ── WebSocket clients ────────────────────────────────────────

const wsClients = new Set<any>();

function broadcast(msg: object) {
  const data = JSON.stringify(msg);
  for (const ws of wsClients) {
    try {
      ws.send(data);
    } catch {}
  }
}

// ── File watcher ─────────────────────────────────────────────

let debounce: ReturnType<typeof setTimeout> | null = null;
let lastVibeList = JSON.stringify(discoverVibes());
// Track saves we triggered to avoid reload loops
let selfSaves = new Set<string>();

watch(ROOT, { recursive: false }, (_event, filename) => {
  if (!filename || filename.startsWith(".")) return;
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => {
    if (filename === "harness.html") {
      broadcast({ type: "reload" });
      return;
    }

    const isVibe = /^vibe-\d+-[^/]+\.html$/.test(filename as string);

    if (isVibe) {
      // Check if this was a self-triggered save
      if (selfSaves.has(filename as string)) {
        selfSaves.delete(filename as string);
        broadcast({ type: "save-ok", file: filename });
        return;
      }

      const newList = JSON.stringify(discoverVibes());
      if (newList !== lastVibeList) {
        lastVibeList = newList;
        broadcast({ type: "vibes-changed" });
      } else {
        broadcast({ type: "file-changed", file: filename });
      }
    }
  }, 100);
});

// ── Save params logic ────────────────────────────────────────

function saveParams(
  file: string,
  vars: Record<string, string>
): { ok: boolean; error?: string } {
  const filePath = resolve(ROOT, file);
  if (!file.match(/^vibe-\d+-[^/]+\.html$/)) {
    return { ok: false, error: "Invalid file name" };
  }

  let html: string;
  try {
    html = readFileSync(filePath, "utf-8");
  } catch {
    return { ok: false, error: "File not found" };
  }

  // Replace each CSS variable value in the :root block
  for (const [varName, value] of Object.entries(vars)) {
    // Match the variable declaration inside any :root { ... } block
    const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(${escaped}\\s*:\\s*)([^;]+)(;)`,
      "g"
    );
    html = html.replace(regex, `$1${value}$3`);
  }

  selfSaves.add(file);
  writeFileSync(filePath, html);
  return { ok: true };
}

// ── HTTP + WebSocket server ──────────────────────────────────

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // WebSocket upgrade
    if (path === "/ws") {
      const upgraded = server.upgrade(req);
      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return undefined as any;
    }

    // API routes
    if (path === "/" || path === "/index.html") {
      const html = readFileSync(resolve(ROOT, "harness.html"), "utf-8");
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (path === "/api/vibes") {
      return Response.json(discoverVibes());
    }

    if (path === "/api/app") {
      try {
        const app = readFileSync(resolve(ROOT, "app.json"), "utf-8");
        return Response.json(JSON.parse(app));
      } catch {
        return Response.json({ name: "magicon", accent: "#0A84FF" });
      }
    }

    if (req.method === "POST" && path.startsWith("/api/save-params/")) {
      const file = decodeURIComponent(path.split("/api/save-params/")[1]);
      try {
        const body = (await req.json()) as { vars: Record<string, string> };
        const result = saveParams(file, body.vars);
        return Response.json(result, { status: result.ok ? 200 : 400 });
      } catch (e: any) {
        return Response.json(
          { ok: false, error: e.message },
          { status: 400 }
        );
      }
    }

    // Serve vibe HTML files and other static files
    const safePath = path.replace(/^\/+/, "");
    if (safePath && !safePath.includes("..")) {
      const filePath = resolve(ROOT, safePath);
      try {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          return new Response(file);
        }
      } catch {}
    }

    return new Response("Not found", { status: 404 });
  },

  websocket: {
    open(ws) {
      wsClients.add(ws);
    },
    close(ws) {
      wsClients.delete(ws);
    },
    message(ws, msg) {
      try {
        const data = JSON.parse(msg as string);
        if (data.type === "save-params" && data.file && data.vars) {
          const result = saveParams(data.file, data.vars);
          ws.send(JSON.stringify({ type: "save-ok", ...result }));
        }
      } catch {}
    },
  },
});

console.log(`\n  magicon harness → http://localhost:${PORT}\n`);
