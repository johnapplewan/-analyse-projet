// Builds the static GitHub Pages site into ./dist
//   dist/index.html          landing page (paste a project, animation, code gate, demo button)
//   dist/room/               the Roast Room front-end, replay-only, fed by static JSON
//   dist/room/api/*.json     seats + saved councils (from sessions/*/events.json)
//
// The access code is never written to the repo. CODE_KEY comes from the environment
// (GitHub Actions secret); only a salted SHA-256 of it ends up in dist/config.js.
// That is a soft gate: a static site cannot keep a secret (see README-SITE.md).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const PUB = path.join(ROOT, "app", "public");
const ROOM = path.join(DIST, "room");

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(ROOM, { recursive: true });
fs.cpSync(PUB, ROOM, { recursive: true });
fs.cpSync(path.join(ROOT, "site", "landing"), DIST, { recursive: true });

// ---- 1. make the room's absolute paths relative (Pages serves under /<repo>/)
const rewrite = (file) => {
  const p = path.join(ROOM, file);
  const s = fs.readFileSync(p, "utf8").replace(/(["'`(])\/(brand|portraits|vendor)\//g, "$1$2/").replace(/(["'`])\/(app\.js|styles\.css)/g, "$1$2");
  fs.writeFileSync(p, s);
};
["index.html", "app.js", "pdf.js", "styles.css"].forEach(rewrite);

// ---- 2. static "API": seats and saved councils
const roster = JSON.parse(fs.readFileSync(path.join(ROOT, ".claude/skills/roast-room/roster.json"), "utf8"));
const seatList = roster.seats || roster; // roster.json: { seats: [...], board: {...} }
const frame = (key, sh) => ["webp", "png", "jpg"].map((x) => `${key}-${sh}.${x}`).find((f) => fs.existsSync(path.join(PUB, "portraits", f)));
const seats = seatList.map((s) => ({
  ...s,
  portraits: Object.fromEntries(["base", "open", "mid", "blink"].map((sh) => [sh, frame(s.key, sh)]).filter(([, f]) => f).map(([sh, f]) => [sh, `portraits/${f}`])),
}));
const api = path.join(ROOM, "api");
fs.mkdirSync(path.join(api, "sessions"), { recursive: true });
fs.writeFileSync(path.join(api, "seats.json"), JSON.stringify({ seats, board: { default: roster.default || [], mode: roster.board || "ask" }, models: {}, runner: "viewer", hasKey: false }));

const sessions = [];
const SDIR = path.join(ROOT, "sessions");
for (const d of fs.readdirSync(SDIR)) {
  const f = path.join(SDIR, d, "events.json");
  if (!fs.existsSync(f)) continue;
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  fs.writeFileSync(path.join(api, "sessions", `${j.id}.json`), JSON.stringify(j));
  sessions.push({ id: j.id, title: j.title || j.prompt.slice(0, 60), prompt: j.prompt, mode: j.mode, status: j.status });
}
sessions.sort((a, b) => (a.id < b.id ? 1 : -1));
fs.writeFileSync(path.join(api, "sessions.json"), JSON.stringify({ sessions, running: null, live: null }));
fs.writeFileSync(path.join(api, "usage.json"), "{}");

// ---- 3. shim: the room's fetch("/api/...") reads the static JSON; no server, no EventSource
const shim = `(() => {
  const real = window.fetch.bind(window);
  const map = (u) => {
    const m = String(u).match(/^\\/api\\/(seats|usage|sessions)(?:\\/([^?#]+))?/);
    if (!m) return null;
    return m[2] ? "api/sessions/" + m[2] + ".json" : "api/" + m[1] + ".json";
  };
  window.fetch = (u, o) => {
    const t = map(u);
    if (t) return real(t);
    if (String(u).startsWith("/api/")) return Promise.resolve(new Response(JSON.stringify({ error: "Replay only" }), { status: 403 }));
    return real(u, o);
  };
})();
`;
fs.writeFileSync(path.join(ROOM, "static-shim.js"), shim);
const idx = path.join(ROOM, "index.html");
fs.writeFileSync(idx, fs.readFileSync(idx, "utf8").replace('<script src="app.js" type="module"></script>', '<script src="static-shim.js"></script>\n  <script src="app.js" type="module"></script>'));

// ---- 4. config: demo session + salted hash of CODE_KEY
const demoCfg = JSON.parse(fs.readFileSync(path.join(ROOT, "site", "demo.json"), "utf8"));
if (!sessions.some((s) => s.id === demoCfg.session)) {
  console.warn(`WARN demo.json points at "${demoCfg.session}" which is not in sessions/*/events.json; falling back to the newest session.`);
  demoCfg.session = sessions[0]?.id || "";
}
const code = process.env.CODE_KEY || "";
const salt = crypto.randomBytes(8).toString("hex");
const hash = code ? crypto.createHash("sha256").update(`${salt}:${code}`).digest("hex") : "";
if (!code) console.warn("WARN CODE_KEY is not set: the access code gate will refuse every code.");
const config = { demo: demoCfg.session, demoTitle: demoCfg.title || "", salt, hash, repo: process.env.GITHUB_REPOSITORY || "johnapplewan/-analyse-projet" };
fs.writeFileSync(path.join(DIST, "config.js"), `window.SITE_CONFIG=${JSON.stringify(config)};\n`);
fs.writeFileSync(path.join(DIST, ".nojekyll"), "");
console.log(`dist ready: ${seats.length} seats, ${sessions.length} replays, demo=${demoCfg.session}, gate=${code ? "on" : "OFF (no CODE_KEY)"}`);
