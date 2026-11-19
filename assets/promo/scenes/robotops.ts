/**
 * RobotOps: what happens to a change between "PR opened" and "mergeable".
 *
 *   PR on the feature repo → CI builds, tests and pushes an image → a bot
 *   opens a PR on the dev-environment repo pinning that image → the dev
 *   environment deploys to a cloud simulation cluster → every scenario runs
 *   across seeds → the result comes back to the original PR as a check
 *
 * Nobody opens the second PR or starts the simulations by hand. The scenario
 * tiles are small replays of the other scenes in this promo: the same stack,
 * exercised before it ships.
 */
import { type Palette, type Scene, clamp, easeOut, lerp, mono, rgba, text } from "./kit";
import { type Pt, dot, polyline, quad, ring, stage, tw } from "./lib";

const VW = 760;
const VH = 380;
const FS = 10.5;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  start: number;
  done: number;
}
const LANE = [
  { y: 60, name: "feature", repo: "nav-stack repo" },
  { y: 148, name: "dev environment", repo: "dev-env repo" },
  { y: 278, name: "cloud simulation", repo: "6 × 50 seeds" },
];
const T = {
  pr: 0.2,
  ci: 0.9,
  checks: [1.6, 2.1, 2.5],
  image: 2.9,
  imageDone: 3.4,
  bot: 3.9,
  botDone: 4.4,
  deploy: 4.9,
  deployDone: 5.6,
  sims: 6.0,
  report: 11.6,
  check: 12.2,
};
const BOX: Record<string, Box> = {
  pr: { x: 112, y: 40, w: 112, h: 40, title: "PR #218", sub: "feat: social layer", start: T.pr, done: T.ci },
  ci: { x: 250, y: 40, w: 112, h: 40, title: "ci", sub: "", start: T.ci, done: T.image },
  image: { x: 388, y: 40, w: 136, h: 40, title: "image", sub: "nav-stack:3f9c1e2", start: T.image, done: T.imageDone },
  check: { x: 604, y: 40, w: 144, h: 40, title: "check", sub: "sim-integration", start: T.report, done: T.check },
  bot: { x: 388, y: 128, w: 160, h: 40, title: "dev-env#64", sub: "bump nav-stack → 3f9c1e2", start: T.bot, done: T.botDone },
  deploy: { x: 572, y: 128, w: 112, h: 40, title: "deploy", sub: "sim cluster · ×6", start: T.deploy, done: T.deployDone },
};

interface Tile {
  name: string;
  metric: string;
  x: number;
  y: number;
  rate: number;
}
const TILES: Tile[] = [
  ["aisle-yield", "min gap 0.52 m"],
  ["trolley-pick", "dock err 9 mm"],
  ["notam-reroute", "replan 41 ms"],
  ["geofence-edge", "0 breaches"],
  ["formation-gap", "min sep 11 m"],
  ["link-relay", "c2 loss 0.0 %"],
].map(([name, metric], i) => ({
  name,
  metric,
  x: 112 + (i % 3) * 214,
  y: 208 + Math.floor(i / 3) * 84,
  rate: [1, 0.86, 0.93, 1.08, 0.8, 0.9][i],
}));
const TW = 200;
const TH = 70;
const SEEDS = 50;

export default function robotops(ctx: CanvasRenderingContext2D, pal: Palette): Scene {
  const st = stage(VW, VH);
  let t = 0;
  const F = (k = 1) => mono(FS * k);

  const state = (b: Box) => (t < b.start ? "idle" : t < b.done ? "run" : "ok");

  function boxDraw(b: Box) {
    const s = state(b);
    const a = s === "idle" ? 0.35 : 1;
    const stroke = s === "run" ? pal.accent : s === "ok" ? rgba(pal.ok, 0.85) : rgba(pal.faint, 0.7);
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 4);
    ctx.fillStyle = s === "run" ? rgba(pal.accent, 0.1) : rgba(pal.bg, 0.35);
    ctx.fill();
    ctx.lineWidth = s === "run" ? 1.4 : 1;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.globalAlpha = a;
    ctx.font = F(0.92);
    text(ctx, b.title, b.x + 9, b.y + 13, pal.heading);
    ctx.font = F(0.78);
    if (b.sub) text(ctx, b.sub, b.x + 9, b.y + 28, pal.muted);
    ctx.globalAlpha = 1;
    mark(b.x + b.w - 11, b.y + 13, s);
  }

  function mark(x: number, y: number, s: string) {
    if (s === "run") dot(ctx, x, y, 3, pal.accent);
    else if (s === "ok") {
      ctx.strokeStyle = pal.ok;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 3.5, y);
      ctx.lineTo(x - 1, y + 2.8);
      ctx.lineTo(x + 3.5, y - 3);
      ctx.stroke();
    } else ring(ctx, x, y, 2.6, rgba(pal.faint, 0.8));
  }

  /** An edge, and a token running along it while the hand-off happens. */
  function edge(pts: Pt[], t0: number, dur = 0.5) {
    const on = t >= t0;
    polyline(ctx, pts, on ? rgba(pal.body, 0.45) : rgba(pal.faint, 0.35), 1, on ? [] : [3, 3]);
    const [x1, y1] = pts[pts.length - 1];
    const [x0, y0] = pts[pts.length - 2];
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(a);
    ctx.fillStyle = on ? rgba(pal.body, 0.7) : rgba(pal.faint, 0.5);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-5, 2.8);
    ctx.lineTo(-5, -2.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const u = (t - t0) / dur;
    if (u > 0 && u < 1) {
      // position along the polyline
      const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
      let left = easeOut(u) * segs.reduce((x, y) => x + y, 0);
      for (let i = 0; i < segs.length; i++) {
        if (left <= segs[i]) {
          const f = left / segs[i];
          dot(ctx, lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f), 3.2, pal.accent);
          break;
        }
        left -= segs[i];
      }
    }
  }

  // tiny replays of the other scenes, one per scenario
  function replay(i: number, x: number, y: number, w: number, h: number, u: number) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const k = (u * 3) % 1; // each seed loops the scenario
    const P = (fx: number, fy: number): Pt => [x + fx * w, y + fy * h];
    const col = rgba(pal.body, 0.5);
    if (i === 0) {
      polyline(ctx, [P(0.05, 0.3), P(0.95, 0.3)], col, 1);
      polyline(ctx, [P(0.05, 0.7), P(0.95, 0.7)], col, 1);
      const px = 0.55;
      const py = lerp(0.05, 0.95, clamp(k * 1.6 - 0.2));
      const rx = k < 0.45 ? lerp(0.08, 0.42, k / 0.45) : k < 0.6 ? 0.42 : lerp(0.42, 0.92, (k - 0.6) / 0.4);
      dot(ctx, ...P(px, py), 2.2, pal.heading);
      ctx.fillStyle = pal.accent;
      ctx.fillRect(...P(rx, 0.5), 7, 5);
    } else if (i === 1) {
      ctx.strokeStyle = rgba(pal.muted, 0.8);
      ctx.strokeRect(...P(0.66, 0.32), 14, 11);
      const rx = lerp(0.08, 0.66, clamp(k / 0.6));
      ctx.fillStyle = pal.accent;
      ctx.fillRect(P(rx, 0.38)[0] + 3, P(rx, 0.38)[1], 8, 6);
    } else if (i === 2 || i === 3) {
      if (i === 2) {
        ctx.strokeStyle = rgba(pal.warn, 0.8);
        ring(ctx, ...P(0.5, 0.5), h * 0.24, rgba(pal.warn, 0.8));
      } else {
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = rgba(pal.ok, 0.7);
        ctx.strokeRect(...P(0.08, 0.15), w * 0.84, h * 0.7);
        ctx.restore();
      }
      const a = k * Math.PI;
      const [cx, cy] = P(0.5, 0.5);
      const pos: Pt =
        i === 2 ? [cx - Math.cos(a) * w * 0.4, cy + Math.sin(a) * h * 0.38] : [lerp(x + w * 0.14, x + w * 0.86, k), y + h * 0.24];
      quad(ctx, pos[0], pos[1], i === 2 ? -a + Math.PI / 2 - Math.PI / 2 : 0, 8, pal.heading);
    } else if (i === 4) {
      ctx.fillStyle = rgba(pal.fail, 0.25);
      ctx.fillRect(...P(0.45, 0), w * 0.1, h * 0.36);
      ctx.fillRect(...P(0.45, 0.64), w * 0.1, h * 0.36);
      const fold = clamp(1 - Math.abs(k - 0.5) * 4);
      for (let d = 0; d < 3; d++) {
        const ox = (d - 1) * 0.06;
        const oy = (d - 1) * 0.22 * (1 - fold);
        dot(ctx, ...P(lerp(0.08, 0.92, k) + ox, 0.5 + oy), 2.2, pal.heading);
      }
    } else {
      const g = P(0.08, 0.8);
      const r = P(0.45, 0.5);
      const f = P(lerp(0.6, 0.9, k), 0.3);
      polyline(ctx, [g, r, f], rgba(pal.accent, 0.8), 1.2);
      polyline(ctx, [g, f], rgba(pal.fail, 0.5), 1, [2, 2]);
      dot(ctx, ...g, 2.2, pal.body);
      dot(ctx, ...r, 2.2, pal.accent);
      dot(ctx, ...f, 2.2, pal.heading);
    }
    ctx.restore();
    void col;
  }

  function tiles() {
    TILES.forEach((tl, i) => {
      const u = clamp(((t - T.sims - i * 0.12) * tl.rate) / 4.6);
      const seeds = Math.floor(u * SEEDS);
      const done = u >= 1;
      const running = t >= T.sims && !done;
      ctx.beginPath();
      ctx.roundRect(tl.x, tl.y, TW, TH, 4);
      ctx.fillStyle = rgba(pal.bg, 0.35);
      ctx.fill();
      ctx.lineWidth = running ? 1.3 : 1;
      ctx.strokeStyle = done ? rgba(pal.ok, 0.8) : running ? pal.accent : rgba(pal.faint, 0.6);
      ctx.stroke();
      ctx.font = F(0.82);
      text(ctx, tl.name, tl.x + 8, tl.y + 11, t >= T.sims ? pal.heading : pal.muted);
      mark(tl.x + TW - 10, tl.y + 11, done ? "ok" : running ? "run" : "idle");
      // the replay, on the left
      ctx.strokeStyle = rgba(pal.line, 1);
      ctx.strokeRect(tl.x + 8, tl.y + 20, 92, 42);
      if (t >= T.sims) replay(i, tl.x + 8, tl.y + 20, 92, 42, done ? 0.999 : u);
      // the numbers, on the right
      ctx.font = F(0.78);
      text(ctx, "seeds", tl.x + 110, tl.y + 28, pal.faint);
      text(ctx, `${String(seeds).padStart(2)}/${SEEDS}`, tl.x + TW - 9, tl.y + 28, done ? pal.ok : pal.body, "right");
      ctx.fillStyle = rgba(pal.line, 1);
      ctx.fillRect(tl.x + 110, tl.y + 37, TW - 119, 4);
      ctx.fillStyle = done ? rgba(pal.ok, 0.8) : rgba(pal.accent, 0.85);
      ctx.fillRect(tl.x + 110, tl.y + 37, (TW - 119) * u, 4);
      if (done) text(ctx, tl.metric, tl.x + 110, tl.y + 53, pal.body);
    });
  }

  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, 99999, 99999);
    st.apply(ctx);
    ctx.font = F(0.82);
    text(ctx, "robotops", 12, 11, pal.muted);
    text(ctx, "pr → image → bot pr → cloud sim → check", 12 + tw(ctx, "robotops") + 16, 11, pal.faint);

    // lanes
    for (const [i, l] of LANE.entries()) {
      ctx.font = F(0.82);
      text(ctx, l.name, 12, l.y - 6, pal.muted);
      ctx.font = F(0.76);
      text(ctx, l.repo, 12, l.y + 8, pal.faint);
      if (i) {
        ctx.strokeStyle = rgba(pal.line, 1);
        ctx.beginPath();
        ctx.moveTo(12, i === 1 ? 104 : 192);
        ctx.lineTo(748, i === 1 ? 104 : 192);
        ctx.stroke();
      }
    }

    // hand-offs
    const B = BOX;
    const midY = (b: Box) => b.y + b.h / 2;
    edge([[B.pr.x + B.pr.w, midY(B.pr)], [B.ci.x, midY(B.ci)]], T.ci - 0.5);
    edge([[B.ci.x + B.ci.w, midY(B.ci)], [B.image.x, midY(B.image)]], T.image - 0.5);
    edge([[B.image.x + 40, B.image.y + B.image.h], [B.bot.x + 40, B.bot.y]], T.bot - 0.5);
    edge([[B.bot.x + B.bot.w, midY(B.bot)], [B.deploy.x, midY(B.deploy)]], T.deploy - 0.5);
    // the fan-out to the scenarios, and the report back up to the PR
    const busY = 188;
    const dx = B.deploy.x + B.deploy.w / 2;
    polyline(ctx, [[dx, B.deploy.y + B.deploy.h], [dx, busY]], t >= T.sims - 0.4 ? rgba(pal.body, 0.45) : rgba(pal.faint, 0.35), 1);
    for (const tl of TILES.slice(0, 3)) edge([[dx, busY], [tl.x + TW / 2, busY], [tl.x + TW / 2, tl.y]], T.sims - 0.4, 0.4);
    edge([[TILES[2].x + TW + 0, TILES[5].y + TH / 2], [756, TILES[5].y + TH / 2], [756, B.check.y + B.check.h / 2], [B.check.x + B.check.w, B.check.y + B.check.h / 2]], T.report - 0.6, 0.6);

    for (const b of Object.values(B)) boxDraw(b);

    // CI's three checks
    const ci = B.ci;
    ctx.font = F(0.76);
    ["build", "unit", "lint"].forEach((k, i) => {
      const x = ci.x + 9 + i * 34;
      const s = t < T.ci ? "idle" : t < T.checks[i] ? "run" : "ok";
      ctx.globalAlpha = t < T.ci ? 0.4 : 1;
      text(ctx, k, x, ci.y + 28, s === "ok" ? pal.body : pal.muted);
      ctx.globalAlpha = 1;
    });

    // who opened what: the second PR is the bot's
    ctx.font = F(0.74);
    if (t >= T.bot) text(ctx, "opened by robotops-bot", B.bot.x, B.bot.y - 8, rgba(pal.accent, clamp((t - T.bot) / 0.3)));
    if (t >= T.check) {
      const a = clamp((t - T.check) / 0.3);
      text(ctx, "300/300 runs · mergeable", B.check.x, B.check.y + B.check.h + 10, rgba(pal.ok, a));
      text(ctx, "checks ✓ · ready to merge", B.pr.x, B.pr.y + B.pr.h + 10, rgba(pal.ok, a));
    }
    tiles();
    ctx.restore();
  }

  return {
    resize(w: number, h: number) {
      st.resize(w, h);
    },
    frame(dt: number) {
      t += dt;
      draw();
    },
    poster: 13,
  };
}
