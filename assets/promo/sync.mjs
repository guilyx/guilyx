#!/usr/bin/env node
/**
 * Snapshot what the promo says and how it looks from guilyx/v4, the portfolio.
 *
 *   node --experimental-strip-types assets/promo/sync.mjs --v4 ../v4
 *
 * v4's src/data/site.ts is the single source of truth for the site's copy, so
 * the promo reads its copy from there instead of keeping its own: role,
 * tagline, the spec block, the career chapters, and the three Systems. The
 * palette comes from v4 too — the @theme block in global.css plus the status
 * colours in the Systems kit — because the Systems scenes are captured from
 * v4's own code and render in v4's palette, so the chrome around them has to
 * match it exactly.
 *
 * Writes assets/promo/data/profile.json, committed, so generating the promo
 * stays offline and reproducible. The v4 commit it came from is recorded in it.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "data", "profile.json");

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const v4 = arg("v4") ? resolve(arg("v4")) : null;
if (!v4) {
  console.error("usage: node --experimental-strip-types sync.mjs --v4 <path to a guilyx/v4 checkout>");
  process.exit(2);
}

const git = (...a) => execFileSync("git", ["-C", v4, ...a], { encoding: "utf8" }).trim();

let site;
try {
  site = await import(pathToFileURL(join(v4, "src/data/site.ts")).href);
} catch (e) {
  console.error(`could not import site.ts (${e.message}).\nRun with: node --experimental-strip-types ...`);
  process.exit(1);
}

/** --color-* tokens from v4's @theme block. */
function themeTokens() {
  const css = readFileSync(join(v4, "src/styles/global.css"), "utf8");
  const theme = css.match(/@theme\s*{([\s\S]*?)\n}/)?.[1] ?? "";
  const out = {};
  for (const [, k, v] of theme.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[k] = v.toLowerCase();
  return out;
}

/** ok / warn / fail: not site tokens, they live in the Systems kit. */
function statusColours() {
  const kit = readFileSync(join(v4, "src/scripts/systems/kit.ts"), "utf8");
  const out = {};
  for (const k of ["ok", "warn", "fail"]) {
    const m = kit.match(new RegExp(`\\b${k}:\\s*"(#[0-9a-fA-F]{6})"`));
    if (!m) throw new Error(`no ${k} colour in kit.ts`);
    out[k] = m[1].toLowerCase();
  }
  return out;
}

const t = themeTokens();
for (const k of ["bg", "bg-raised", "line", "faint", "muted", "body", "heading", "accent"]) {
  if (!t[k]) throw new Error(`--color-${k} missing from v4's @theme`);
}

const profile = {
  source: {
    repo: "guilyx/v4",
    commit: git("rev-parse", "HEAD"),
    dirty: git("status", "--porcelain", "--", "src").length > 0,
  },
  site: {
    name: site.site.name,
    handle: site.site.handle,
    role: site.site.role,
    tagline: site.site.tagline,
    location: site.site.location,
    url: site.site.url,
  },
  spec: site.spec.map(({ key, value }) => ({ key, value })),
  chapters: site.chapters.map(({ tab, years, where, title }) => ({ tab, years, where, title })),
  systems: site.systems.map(({ id, tab, headline, caption }) => ({ id, tab, headline, caption })),
  // the same shape as the Systems kit's Palette, so it can be handed straight to a scene
  palette: {
    bg: t["bg"],
    raised: t["bg-raised"],
    line: t["line"],
    faint: t["faint"],
    muted: t["muted"],
    body: t["body"],
    heading: t["heading"],
    accent: t["accent"],
    ...statusColours(),
  },
};

writeFileSync(OUT, JSON.stringify(profile, null, 2) + "\n");
console.log(`wrote ${OUT}\n  from guilyx/v4 @ ${profile.source.commit.slice(0, 7)}${profile.source.dirty ? " (dirty)" : ""}`);
