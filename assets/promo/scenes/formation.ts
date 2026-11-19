/**
 * Five drones in formation, and the radio links that hold them together.
 *
 *   virtual structure → each drone tracks its slot → the shape changes for
 *   the airspace → link quality decides the C2 route → a drone becomes a relay
 *
 * The formation is a virtual structure: a moving frame with a slot per drone,
 * and a controller pulling each drone onto its slot while keeping clear of
 * the others. A corridor between two no-fly zones is too narrow for the wedge,
 * so the slots fold into a column and open again once through. Every pair of
 * radios has a link quality that falls with distance; the C2 route from the
 * ground station is the strongest path through that mesh. When the direct
 * link to the formation thins out, the last drone holds back as a relay.
 */
import { type Palette, type Scene, clamp, lerp, mono, rgba, text } from "./kit";
import { type Pt, dot, hatch, polyline, quad, ring, smooth, stage, tw } from "./lib";

const VW = 760;
const VH = 380;
const MAP = { x: 12, y: 22, w: 504, h: 346 };
const PANEL = 540;
const FS = 10.5;
const GCS: Pt = [40, 300];
const NFZ_TOP: Pt[] = [
  [204, 22],
  [296, 22],
  [282, 170],
  [218, 170],
];
const NFZ_BOT: Pt[] = [
  [218, 230],
  [282, 230],
  [300, 368],
  [200, 368],
];
const LEAD_V = 50;
const X0 = 140;
const X1 = 470;
const RELAY: Pt = [252, 214];

type Shape = Pt[];
const wedge = (s: number): Shape => [
  [0, 0],
  [-s, -s],
  [-s, s],
  [-2 * s, -2 * s],
  [-2 * s, 2 * s],
];
const COLUMN: Shape = [0, 1, 2, 3, 4].map((i): Pt => [-22 * i, 0]);
const DIAMOND: Shape = [
  [0, 0],
  [-26, -26],
  [-26, 26],
  [-52, 0],
  [-52, 0],
];

/** Link quality from range: 1 up close, 0 past ~490 m. */
const quality = (a: Pt, b: Pt) => clamp(1 - (Math.hypot(a[0] - b[0], a[1] - b[1]) - 50) / 460);
/** Too weak to carry C2: drawn, never routed over. */
const ROUTABLE = 0.35;

export default function formation(ctx: CanvasRenderingContext2D, pal: Palette): Scene {
  const st = stage(VW, VH);
  let t = 0;
  let lead = X0;
  let shapeName = "wedge";
  let spacing = 30;
  let colAt = -1;
  let relayAt = -1;
  let reformAt = -1;
  const drones = wedge(30).map(([ox, oy]) => ({ x: X0 + ox, y: 200 + oy, vx: LEAD_V, vy: 0 }));
  const slots: Pt[] = drones.map((d) => [d.x, d.y]);
  const log: { t: number; v: string; col: string }[] = [];
  const say = (v: string, col: string, dt = 0) => log.push({ t: t + dt, v, col });
  say("wedge · 5 drones · 30 m", pal.body);

  let tree: [number, number][] = [];
  let toLead: number[] = [0, 1];
  let minLink = 1;
  const names = ["gcs", "d1", "d2", "d3", "d4", "d5"];
  const nodes = (): Pt[] => [GCS, ...drones.map((d): Pt => [d.x, d.y])];

  function route() {
    // the C2 route: Dijkstra on −log(quality), plus a little per hop so a
    // good direct link beats a relay; links too weak to carry C2 are skipped
    const P = nodes();
    const n = P.length;
    const dist = new Array(n).fill(Infinity);
    const prev = new Array(n).fill(-1);
    const done = new Array(n).fill(false);
    dist[0] = 0;
    for (let k = 0; k < n; k++) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || dist[u] === Infinity) break;
      done[u] = true;
      for (let v = 0; v < n; v++) {
        if (v === u) continue;
        const q = quality(P[u], P[v]);
        if (q < ROUTABLE) continue;
        const c = -Math.log(q) + 0.25;
        if (dist[u] + c < dist[v]) {
          dist[v] = dist[u] + c;
          prev[v] = u;
        }
      }
    }
    tree = [];
    minLink = 1;
    for (let v = 1; v < n; v++) if (prev[v] >= 0) {
      tree.push([prev[v], v]);
      minLink = Math.min(minLink, quality(P[prev[v]], P[v]));
    }
    toLead = [1];
    for (let u = 1; prev[u] >= 0; u = prev[u]) toLead.unshift(prev[u]);
  }

  function update(dt: number) {
    t += dt;
    const k = clamp((X1 - lead) / 30, 0, 1);
    const v = LEAD_V * Math.max(0.12, k);
    lead = Math.min(X1, lead + v * dt);

    // the shape follows the airspace: column through the gap, diamond after
    if (colAt < 0 && lead >= 178) {
      colAt = t;
      shapeName = "column";
      spacing = 22;
      say("corridor 60 m ahead → column", pal.accent);
    }
    if (relayAt < 0 && drones[4].x >= RELAY[0] - 4) {
      relayAt = t;
      const q = quality(GCS, [drones[0].x, drones[0].y]);
      say(`c2 to d1 ${q.toFixed(2)} · margin low`, pal.warn);
      say("d5 holds in the gap · relay", pal.accent, 0.45);
    }
    if (reformAt < 0 && relayAt >= 0 && drones[3].x > 300) {
      reformAt = t;
      shapeName = "diamond";
      spacing = 26;
      say("clear → diamond · 4 drones", pal.body);
    }
    const b1 = colAt < 0 ? 0 : smooth((t - colAt) / 1.0);
    const b2 = reformAt < 0 ? 0 : smooth((t - reformAt) / 1.2);
    const W0 = wedge(30);
    for (let i = 0; i < 5; i++) {
      const cx = lerp(lerp(W0[i][0], COLUMN[i][0], b1), DIAMOND[i][0], b2);
      const cy = lerp(lerp(W0[i][1], COLUMN[i][1], b1), DIAMOND[i][1], b2);
      slots[i] = [lead + cx, 200 + cy];
    }
    if (relayAt >= 0) slots[4] = RELAY;

    // each drone: feed-forward of the structure's motion, P on the slot error,
    // and a short-range repulsion so no slot change ever crosses two drones
    for (let i = 0; i < 5; i++) {
      const d = drones[i];
      const ff = i === 4 && relayAt >= 0 ? 0 : v;
      let ax = (ff + 2.6 * (slots[i][0] - d.x) - d.vx) * 4;
      let ay = (2.6 * (slots[i][1] - d.y) - d.vy) * 4;
      for (let j = 0; j < 5; j++) {
        if (i === j) continue;
        const dx = d.x - drones[j].x;
        const dy = d.y - drones[j].y;
        const r = Math.hypot(dx, dy);
        if (r < 16 && r > 0.01) {
          ax += (dx / r) * (16 - r) * 30;
          ay += (dy / r) * (16 - r) * 30;
        }
      }
      d.vx += ax * dt;
      d.vy += ay * dt;
      const sp = Math.hypot(d.vx, d.vy);
      if (sp > 90) {
        d.vx *= 90 / sp;
        d.vy *= 90 / sp;
      }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    }
    route();
    if (reformAt >= 0 && log.length === 5 && t > reformAt + 1.3)
      say(`c2 ${toLead.map((i) => names[i]).join("→")} · min ${minLink.toFixed(2)}`, pal.ok);
  }

  // ------------------------------------------------------------- drawing
  const F = (k = 1) => mono(FS * k);
  const qcol = (q: number) => (q >= 0.6 ? pal.ok : q >= 0.35 ? pal.warn : pal.fail);

  function map() {
    ctx.strokeStyle = rgba(pal.body, 0.07);
    ctx.lineWidth = 1;
    for (const [hx, hy, ph] of [
      [96, 96, 1.2],
      [420, 290, 0.3],
    ])
      for (const r0 of [24, 48, 72, 96]) {
        ctx.beginPath();
        for (let k = 0; k <= 72; k++) {
          const th = (k / 72) * Math.PI * 2;
          const r = r0 * (1 + 0.15 * Math.sin(3 * th + ph) + 0.07 * Math.sin(5 * th + ph * 2));
          const x = hx + Math.cos(th) * r * 1.35;
          const y = hy + Math.sin(th) * r;
          if (k) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    ctx.font = F(0.78);
    for (const poly of [NFZ_TOP, NFZ_BOT]) {
      const p = () => {
        ctx.moveTo(poly[0][0], poly[0][1]);
        for (const q of poly.slice(1)) ctx.lineTo(q[0], q[1]);
        ctx.closePath();
      };
      hatch(ctx, p, rgba(pal.fail, 0.28), 6);
      ctx.strokeStyle = rgba(pal.fail, 0.7);
      ctx.beginPath();
      p();
      ctx.stroke();
    }
    text(ctx, "no-fly", 250, 150, pal.fail, "center");
    text(ctx, "no-fly", 250, 252, pal.fail, "center");

    // the ground station
    const [gx, gy] = GCS;
    polyline(ctx, [[gx - 6, gy + 9], [gx, gy - 7], [gx + 6, gy + 9]], pal.body, 1.3);
    for (const r of [6, 11]) {
      ctx.strokeStyle = rgba(pal.body, 0.6);
      ctx.beginPath();
      ctx.arc(gx, gy - 7, r, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.stroke();
    }
    text(ctx, "gcs", gx, gy + 19, pal.faint, "center");
  }

  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, 99999, 99999);
    st.apply(ctx);
    ctx.font = F(0.82);
    text(ctx, "formation · c2 mesh", MAP.x, 11, pal.muted);
    let lx = MAP.x + tw(ctx, "formation · c2 mesh") + 16;
    for (const [c, l] of [
      [pal.ok, "link ≥ 0.6"],
      [pal.warn, "≥ 0.35"],
      [pal.fail, "weak"],
    ]) {
      polyline(ctx, [[lx, 11], [lx + 9, 11]], c, 1.6);
      text(ctx, l, lx + 13, 11, pal.faint);
      lx += 13 + tw(ctx, l) + 12;
    }
    polyline(ctx, [[lx, 11], [lx + 9, 11]], pal.accent, 2);
    text(ctx, "c2 route", lx + 13, 11, pal.faint);

    ctx.save();
    ctx.beginPath();
    ctx.rect(MAP.x, MAP.y, MAP.w, MAP.h);
    ctx.clip();
    map();

    // the mesh: every pair in range, weaker links thinner and dashed
    const P = nodes();
    for (let i = 0; i < P.length; i++)
      for (let j = i + 1; j < P.length; j++) {
        const q = quality(P[i], P[j]);
        if (q < 0.06) continue;
        polyline(ctx, [P[i], P[j]], rgba(qcol(q), 0.25 + 0.4 * q), 0.6 + 1.2 * q, q < 0.35 ? [3, 3] : []);
      }
    // the C2 route over it
    for (const [u, v] of tree) polyline(ctx, [P[u], P[v]], rgba(pal.accent, 0.9), 2);
    ctx.font = F(0.74);
    for (const [u, v] of tree) {
      // label the hops on the way to the leader
      const on = toLead.indexOf(v);
      if (on < 1 || toLead[on - 1] !== u) continue;
      const q = quality(P[u], P[v]);
      const mx = (P[u][0] + P[v][0]) / 2;
      const my = (P[u][1] + P[v][1]) / 2 - 7;
      ctx.fillStyle = rgba(pal.bg, 0.75);
      ctx.fillRect(mx - 12, my - 5.5, 24, 11);
      text(ctx, q.toFixed(2), mx, my, qcol(q), "center");
    }

    // slots of the virtual structure, and each drone's error to its slot
    for (let i = 0; i < 5; i++) {
      const d = drones[i];
      const [sx, sy] = slots[i];
      ring(ctx, sx, sy, 5, rgba(pal.muted, 0.6), 1, [2, 2]);
      if (Math.hypot(sx - d.x, sy - d.y) > 4) polyline(ctx, [[d.x, d.y], [sx, sy]], rgba(pal.muted, 0.6), 1);
    }
    ctx.font = F(0.76);
    drones.forEach((d, i) => {
      quad(ctx, d.x, d.y, Math.atan2(d.vy, Math.max(1, d.vx)), 12, i === 4 && relayAt >= 0 ? pal.accent : pal.heading);
      text(ctx, `d${i + 1}`, d.x + 9, d.y - 10, pal.muted);
    });
    ctx.restore();
    ctx.strokeStyle = rgba(pal.body, 0.35);
    ctx.strokeRect(MAP.x, MAP.y, MAP.w, MAP.h);
    panel();
    ctx.restore();
  }

  function panel() {
    const x0 = PANEL;
    const W = VW - PANEL - 6;
    ctx.font = F(0.85);
    text(ctx, "formation", x0, 11, pal.muted);
    text(ctx, "virtual structure", x0 + W, 11, pal.faint, "right");
    ctx.strokeStyle = rgba(pal.body, 0.3);
    ctx.strokeRect(x0 + 0.5, 22.5, W - 1, 76);
    ctx.font = F(0.86);
    const rows: [string, string, string][] = [
      ["shape", shapeName, pal.heading],
      ["spacing", `${spacing} m`, pal.body],
      ["c2 to d1", toLead.map((i) => names[i]).join("→"), toLead.length > 2 ? pal.accent : pal.body],
      ["min link", minLink.toFixed(2), qcol(minLink)],
    ];
    rows.forEach(([k, v, c], i) => {
      const y = 36 + i * 16.5;
      text(ctx, k, x0 + 9, y, pal.faint);
      text(ctx, v, x0 + 76, y, c);
    });

    // link quality, every pair
    const my = 112;
    ctx.font = F(0.85);
    text(ctx, "link quality", x0, my, pal.muted);
    const labels = ["gcs", "d1", "d2", "d3", "d4", "d5"];
    const cs = 15;
    const gx = x0 + 34;
    const gy = my + 12;
    const P = nodes();
    ctx.font = F(0.72);
    labels.forEach((l, i) => {
      text(ctx, l, gx - 6, gy + i * cs + cs / 2, pal.faint, "right");
      text(ctx, l, gx + i * cs + cs / 2, gy + 6 * cs + 8, pal.faint, "center");
    });
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++) {
        if (i === j) {
          ctx.fillStyle = rgba(pal.line, 1);
        } else {
          const q = quality(P[i], P[j]);
          ctx.fillStyle = rgba(qcol(q), 0.15 + 0.6 * q);
        }
        ctx.fillRect(gx + j * cs + 0.5, gy + i * cs + 0.5, cs - 1, cs - 1);
      }
    // the log
    const ly = 254;
    ctx.font = F(0.85);
    text(ctx, "events", x0, ly, pal.muted);
    ctx.strokeStyle = rgba(pal.body, 0.3);
    ctx.strokeRect(x0 + 0.5, ly + 10.5, W - 1, 104);
    ctx.font = F(0.82);
    log.forEach((l, i) => {
      const a = clamp((t - l.t) / 0.25);
      ctx.globalAlpha = a;
      text(ctx, l.v, x0 + 9, ly + 24 + i * 16.5, l.col);
      ctx.globalAlpha = 1;
    });
  }

  function frame(dt: number) {
    update(dt);
    draw();
  }

  return {
    resize(w: number, h: number) {
      st.resize(w, h);
    },
    frame,
    poster: 7,
  };
}
