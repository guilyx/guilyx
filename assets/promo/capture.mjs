#!/usr/bin/env node
/**
 * Render v4's three Systems scenes frame by frame, from v4's own code.
 *
 *   node assets/promo/capture.mjs --v4 ../v4            # the shots in data/cut.json
 *   node assets/promo/capture.mjs --v4 ../v4 --survey   # one still per second, to plan a cut
 *
 * The promo used to draw its own behaviour tree and agent graph in Pillow. v4
 * draws the same ideas far better, so now the promo shows v4's: this script
 * loads src/scripts/systems/*.ts straight from a v4 checkout (Node strips the
 * types, a tiny server hands them to Chromium), and drives each scene through
 * its own contract — resize(w, h), then frame(dt) — at exact steps. Nothing is
 * screen-recorded and nothing depends on the machine's speed: Math.random is
 * seeded per scene, and time only moves when this script says so. Same v4
 * commit in, same frames out.
 *
 * Needs `npm ci` in the v4 checkout: the scenes draw in JetBrains Mono, and
 * the brand faces come from v4's @fontsource packages. They are copied next to
 * the frames so generate.py uses the same faces for the chrome around them.
 *
 * Writes assets/promo/.frames/ (gitignored): <shot>/NNNN.png, fonts/, and a
 * manifest.json that generate.py reads.
 */
import { createServer } from "node:http";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire, stripTypeScriptTypes } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRAMES = join(HERE, ".frames");
const require = createRequire(import.meta.url);

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const v4 = arg("v4") ? resolve(arg("v4")) : null;
const survey = process.argv.includes("--survey");
if (!v4) {
  console.error("usage: node capture.mjs --v4 <path to a guilyx/v4 checkout> [--survey]");
  process.exit(2);
}

const profile = JSON.parse(readFileSync(join(HERE, "data", "profile.json"), "utf8"));
const cut = JSON.parse(readFileSync(join(HERE, "data", "cut.json"), "utf8"));
const EXPORT = Number(process.env.PROMO_EXPORT ?? cut.export);

const SYSTEMS = join(v4, "src", "scripts", "systems");
const FONTSRC = join(v4, "node_modules", "@fontsource");
const FONTVAR = join(v4, "node_modules", "@fontsource-variable");
if (!existsSync(join(FONTSRC, "jetbrains-mono"))) {
  console.error(`no brand fonts in ${v4}/node_modules — run \`npm ci\` in the v4 checkout first`);
  process.exit(1);
}

// ---------------------------------------------------------------- the page
const MONO_WEIGHTS = [400, 600];
const page = `<!doctype html><meta charset="utf-8"><style>
${MONO_WEIGHTS.map((w) => `@font-face{font-family:"JetBrains Mono";font-weight:${w};src:url(/fonts/jetbrains-mono-latin-${w}-normal.woff2) format("woff2")}`).join("\n")}
html,body{margin:0;background:transparent}
</style><script type="module">
// a seeded Math.random, reseeded for every scene so the capture order can't leak between them
let s = 1;
const rand = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = rand;
let live = null;
window.__mount = async (id, w, h, pal, seed) => {
  s = seed;
  await Promise.all(${JSON.stringify(MONO_WEIGHTS)}.map((wt) => document.fonts.load(wt + ' 12px "JetBrains Mono"')));
  const factory = (await import('/sys/' + id + '.js')).default;
  const dpr = window.devicePixelRatio;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);       // what v4's runner does: the scene draws in CSS px
  const scene = factory(ctx, pal);
  scene.resize(w, h);
  scene.frame(0);
  live = { scene, canvas, t: 0 };
  return scene.poster;
};
// v4's runner never hands a scene more than 0.1 s; 1/60 keeps swarm's fixed-step physics exact
window.__advance = (secs) => {
  let left = secs;
  while (left > 1e-9) { const dt = Math.min(left, 1 / 60); live.scene.frame(dt); left -= dt; live.t += dt; }
  return live.t;
};
window.__grab = () => live.canvas.toDataURL('image/png');
window.__ready = true;
</script>`;

const serve = (req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  try {
    if (url === "/") return send(res, "text/html", page);
    if (url.startsWith("/sys/")) {
      const name = url.slice(5).replace(/\.js$/, "");
      if (!/^[a-z]+$/.test(name)) throw new Error("bad module");
      const ts = readFileSync(join(SYSTEMS, `${name}.ts`), "utf8");
      // erase the types, and give the browser full specifiers for the kit
      const js = stripTypeScriptTypes(ts).replace(/from\s+"\.\/([a-z]+)"/g, 'from "./$1.js"');
      return send(res, "text/javascript", js);
    }
    if (url.startsWith("/fonts/")) {
      const f = url.slice(7);
      if (!/^[a-z0-9-]+\.woff2$/.test(f)) throw new Error("bad font");
      return send(res, "font/woff2", readFileSync(join(FONTSRC, "jetbrains-mono", "files", f)));
    }
    res.writeHead(404).end();
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
};
const send = (res, type, body) => res.writeHead(200, { "content-type": type }).end(body);

// ---------------------------------------------------------------- run
const server = createServer(serve);
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const { chromium } = require("playwright");
const browser = await chromium.launch();
const tab = await browser.newPage({ deviceScaleFactor: EXPORT, viewport: { width: 400, height: 300 } });
const errors = [];
tab.on("pageerror", (e) => errors.push(e.message));
tab.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await tab.goto(origin);
await tab.waitForFunction(() => window.__ready === true);

const writePng = (path, dataUrl) => writeFileSync(path, Buffer.from(dataUrl.split(",")[1], "base64"));
const { w: SW, h: SH } = cut.scene;
const pal = profile.palette;

if (survey) {
  // --size WxH tries a scene size before committing it to cut.json; --at 4,13.5 picks moments
  const [w, h] = (arg("size") ?? `${SW}x${SH}`).split("x").map(Number);
  const at = arg("at")?.split(",").map(Number) ?? Array.from({ length: Number(arg("seconds") ?? 32) + 1 }, (_, i) => i);
  const out = join(FRAMES, "survey");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const sys of profile.systems) {
    const poster = await tab.evaluate(([id, w, h, p]) => window.__mount(id, w, h, p, 7), [sys.id, w, h, pal]);
    let t = 0;
    for (const target of at) {
      t = await tab.evaluate((dt) => window.__advance(dt), target - t);
      writePng(join(out, `${sys.id}_${String(target).padStart(4, "0")}.png`), await tab.evaluate(() => window.__grab()));
    }
    console.log(`survey ${sys.id} @${w}x${h}: ${at.length} stills, poster at ${poster}s`);
  }
} else {
  rmSync(FRAMES, { recursive: true, force: true });
  mkdirSync(join(FRAMES, "fonts"), { recursive: true });
  const manifest = { source: profile.source, export: EXPORT, fps: cut.fps, scene: cut.scene, shots: [] };
  for (const [i, shot] of cut.shots.entries()) {
    const dir = join(FRAMES, `${i}_${shot.id}`);
    mkdirSync(dir, { recursive: true });
    await tab.evaluate(([id, w, h, p, seed]) => window.__mount(id, w, h, p, seed), [shot.id, SW, SH, pal, 7 + i]);
    await tab.evaluate((t) => window.__advance(t), shot.from);
    const fps = shot.fps ?? cut.fps;     // slow-changing scenes can afford fewer frames
    const n = Math.round(shot.seconds * fps);
    const step = shot.speed / fps;
    for (let f = 0; f < n; f++) {
      if (f) await tab.evaluate((dt) => window.__advance(dt), step);
      writePng(join(dir, `${String(f).padStart(4, "0")}.png`), await tab.evaluate(() => window.__grab()));
    }
    manifest.shots.push({ ...shot, fps, dir: `${i}_${shot.id}`, frames: n });
    console.log(`shot ${i} ${shot.id}: ${n} frames @${fps}fps, scene time ${shot.from}s → ${(shot.from + (n - 1) * step).toFixed(1)}s at ${shot.speed}×`);
  }
  // the brand faces, so the chrome around the scenes is set in the same type
  const fonts = {
    "mono-400.woff2": join(FONTSRC, "jetbrains-mono", "files", "jetbrains-mono-latin-400-normal.woff2"),
    "mono-700.woff2": join(FONTSRC, "jetbrains-mono", "files", "jetbrains-mono-latin-700-normal.woff2"),
    "display.woff2": join(FONTVAR, "space-grotesk", "files", "space-grotesk-latin-wght-normal.woff2"),
    "sans.woff2": join(FONTVAR, "inter", "files", "inter-latin-wght-normal.woff2"),
  };
  for (const [name, src] of Object.entries(fonts)) copyFileSync(src, join(FRAMES, "fonts", name));
  manifest.fonts = Object.keys(fonts);
  writeFileSync(join(FRAMES, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

await browser.close();
server.close();
if (errors.length) {
  console.error("page errors:\n  " + errors.join("\n  "));
  process.exit(1);
}
