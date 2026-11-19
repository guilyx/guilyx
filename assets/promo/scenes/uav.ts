/**
 * One drone, flown from a ground control station over a C2 link, through
 * airspace that changes while it flies.
 *
 *   zones (ops area, no-fly) → costmap → route v1 → a NOTAM lands → the
 *   route is checked against it → replanned on the costmap → uploaded → flown
 *
 * The route is found by A* on the costmap, not drawn by hand: the no-fly
 * zones and the edge of the ops area are lethal, with a buffer that costs
 * more the closer it gets. When the NOTAM's temporary restriction appears
 * across the route ahead, it goes into the costmap and the rest of the route
 * is planned again from where the drone is.
 */
import { type Palette, type Scene, clamp, mono, rgba, text } from "./kit";
import { type Pt, Path, dot, fillet, hatch, polyline, quad, ring, stage, tw } from "./lib";

const VW = 760;
const VH = 380;
const MAP = { x: 12, y: 22, w: 504, h: 346 };
const PANEL = 540;
const CELL = 10;
const FS = 10.5;
const SPEED = 52; // px/s along the route
const M_PER_PX = 6;

const OPS: Pt[] = [
  [26, 40],
  [250, 32],
  [504, 44],
  [504, 356],
  [26, 356],
];
const NFZ1 = { x: 196, y: 132, r: 50 };
const NFZ2: Pt[] = [
  [318, 306],
  [424, 284],
  [470, 330],
  [356, 352],
];
const HOME: Pt = [54, 318];
const DEST: Pt = [466, 78];
const BUFFER = 20;

function inPoly(p: Pt, poly: Pt[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function distSeg(p: Pt, a: Pt, b: Pt) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function distPoly(p: Pt, poly: Pt[]) {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) d = Math.min(d, distSeg(p, poly[i], poly[(i + 1) % poly.length]));
  return inPoly(p, poly) ? -d : d;
}

type Kind = 0 | 1 | 2 | 3; // free, fence, no-fly, notam

export default function uav(ctx: CanvasRenderingContext2D, pal: Palette): Scene {
  const st = stage(VW, VH);
  let t = 0;
  const cols = Math.floor(MAP.w / CELL);
  const rows = Math.floor(MAP.h / CELL);
  const cost = new Float32Array(cols * rows);
  const kind = new Uint8Array(cols * rows);
  let tfr: { x: number; y: number; r: number } | null = null;
  let tfrAt = 0;

  function fill() {
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const p: Pt = [MAP.x + (i + 0.5) * CELL, MAP.y + (j + 0.5) * CELL];
        const zones: [number, Kind][] = [
          [-distPoly(p, OPS), 1],
          [Math.hypot(p[0] - NFZ1.x, p[1] - NFZ1.y) - NFZ1.r, 2],
          [distPoly(p, NFZ2), 2],
        ];
        if (tfr) zones.push([Math.hypot(p[0] - tfr.x, p[1] - tfr.y) - tfr.r, 3]);
        let c = 0;
        let k: Kind = 0;
        for (const [d, kk] of zones) {
          const v = d <= 0 ? 1 : d < BUFFER ? 0.75 * (1 - d / BUFFER) ** 1.5 : 0;
          if (v > c) {
            c = v;
            k = kk;
          }
        }
        cost[j * cols + i] = c;
        kind[j * cols + i] = k;
      }
  }

  const cellOf = (p: Pt): [number, number] => [
    clamp(Math.floor((p[0] - MAP.x) / CELL), 0, cols - 1),
    clamp(Math.floor((p[1] - MAP.y) / CELL), 0, rows - 1),
  ];
  const centre = (i: number, j: number): Pt => [MAP.x + (i + 0.5) * CELL, MAP.y + (j + 0.5) * CELL];

  /** A* over the costmap, then string-pulled and filleted into something flyable. */
  function plan(from: Pt, to: Pt): Path {
    const [si, sj] = cellOf(from);
    const [gi, gj] = cellOf(to);
    const n = cols * rows;
    const g = new Float32Array(n).fill(Infinity);
    const came = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const open: number[] = [sj * cols + si];
    g[sj * cols + si] = 0;
    const h = (k: number) => Math.hypot((k % cols) - gi, Math.floor(k / cols) - gj);
    while (open.length) {
      let bi = 0;
      for (let q = 1; q < open.length; q++) if (g[open[q]] + h(open[q]) < g[open[bi]] + h(open[bi])) bi = q;
      const cur = open.splice(bi, 1)[0];
      if (cur === gj * cols + gi) break;
      closed[cur] = 1;
      const ci = cur % cols;
      const cj = Math.floor(cur / cols);
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = ci + di;
          const nj = cj + dj;
          if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
          const k = nj * cols + ni;
          if (closed[k] || cost[k] >= 1) continue;
          const step = Math.hypot(di, dj) * (1 + 7 * cost[k]);
          if (g[cur] + step < g[k]) {
            g[k] = g[cur] + step;
            came[k] = cur;
            if (!open.includes(k)) open.push(k);
          }
        }
    }
    const cells: Pt[] = [];
    for (let k = gj * cols + gi; k !== -1; k = came[k]) cells.push(centre(k % cols, Math.floor(k / cols)));
    cells.reverse();
    cells[0] = from;
    cells[cells.length - 1] = to;
    // string pulling: skip ahead while the straight line stays in cheap air
    const clearLine = (a: Pt, b: Pt) => {
      const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4);
      for (let q = 0; q <= steps; q++) {
        const [i, j] = cellOf([a[0] + ((b[0] - a[0]) * q) / steps, a[1] + ((b[1] - a[1]) * q) / steps]);
        if (cost[j * cols + i] > 0.12) return false;
      }
      return true;
    };
    const way: Pt[] = [cells[0]];
    let at = 0;
    while (at < cells.length - 1) {
      let next = at + 1;
      for (let q = cells.length - 1; q > at + 1; q--)
        if (clearLine(cells[at], cells[q])) {
          next = q;
          break;
        }
      way.push(cells[next]);
      at = next;
    }
    return new Path(fillet(way, 26));
  }

  fill();
  const v1 = plan(HOME, DEST);
  let route = v1;
  let old: Path | null = null;
  let oldFrom = 0;
  let replanAt = 0;
  let s = 0;
  let heading = v1.at(0)[2];
  let alt = 0;
  let mode = "ARMED";
  const trail: Pt[] = [];
  let conflict: [number, number] | null = null; // the stretch of v1 inside the restriction
  const feed: { t: number; k: string; v: string; col: string }[] = [];
  const say = (k: string, v: string, col: string) => feed.push({ t, k, v, col });
  say("notam", "feed live · 3 active", pal.body);

  const T = { takeoff: 0.6, roll: 1.4, notam: 3.6, check: 4.3, replan: 5.0, upload: 5.6 };

  function update(dt: number) {
    t += dt;
    if (t > T.takeoff && mode === "ARMED") mode = "TAKEOFF";
    if (mode === "TAKEOFF") alt = Math.min(80, alt + dt * 90);
    if (t > T.roll && mode === "TAKEOFF") mode = "AUTO · MISSION";

    if (t > T.roll && mode !== "AUTO · LOITER") {
      const [, , a0] = route.at(s);
      const [, , a1] = route.at(s + 20);
      let bend = a1 - a0;
      while (bend > Math.PI) bend -= 2 * Math.PI;
      while (bend < -Math.PI) bend += 2 * Math.PI;
      const v = SPEED * clamp(1 - Math.abs(bend) * 0.5, 0.55, 1) * clamp((route.length - s) / 40, 0.25, 1);
      s = Math.min(route.length, s + v * dt);
      if (route.length - s < 0.5) {
        mode = "AUTO · LOITER";
        say("c2", "on station · loiter", pal.ok);
      }
    }
    const [x, y, a] = route.at(s);
    let da = a - heading;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    heading += da * clamp(dt * 8);
    if (t > T.roll && (trail.length === 0 || Math.hypot(x - trail[trail.length - 1][0], y - trail[trail.length - 1][1]) > 5))
      trail.push([x, y]);

    // the NOTAM: a temporary restriction, right across the route ahead
    if (!tfr && t > T.notam) {
      const [cx, cy, ca] = route.at(s + 112);
      tfr = { x: cx - Math.sin(ca) * 10, y: cy + Math.cos(ca) * -10, r: 40 };
      tfrAt = t;
      say("new", "A0417/26 · temp. restriction", pal.warn);
      say("", "r 240 m · sfc–150 m · 2 h", pal.muted);
      fill();
    }
    if (tfr && !conflict && t > T.check) {
      let a0 = -1;
      let a1 = -1;
      for (let q = s; q < route.length; q += 2) {
        const [qx, qy] = route.at(q);
        if (Math.hypot(qx - tfr.x, qy - tfr.y) < tfr.r) {
          if (a0 < 0) a0 = q;
          a1 = q;
        }
      }
      conflict = [a0, a1];
      say("check", "route v1 crosses it", pal.fail);
    }
    if (conflict && !old && t > T.replan) {
      old = route;
      oldFrom = s;
      const [px, py] = route.at(s);
      route = plan([px, py], DEST);
      s = 0;
      replanAt = t;
      const extra = ((route.length - (old.length - oldFrom)) * M_PER_PX) / 1000;
      say("plan", `route v2 · +${extra.toFixed(1)} km · clear`, pal.ok);
    }
    if (old && t > T.upload && feed[feed.length - 1].k === "plan") say("c2", "v2 uploaded · ack", pal.body);
  }

  // ------------------------------------------------------------- drawing
  const F = (k = 1) => mono(FS * k);

  function terrain() {
    // contour rings around two rises: texture that reads as a map, not copy
    ctx.strokeStyle = rgba(pal.body, 0.07);
    ctx.lineWidth = 1;
    for (const [hx, hy, ph] of [
      [118, 150, 0.4],
      [372, 168, 2.1],
    ])
      for (const r0 of [22, 44, 66, 88, 110]) {
        ctx.beginPath();
        for (let k = 0; k <= 72; k++) {
          const th = (k / 72) * Math.PI * 2;
          const r = r0 * (1 + 0.16 * Math.sin(3 * th + ph) + 0.08 * Math.sin(5 * th + ph * 2));
          const x = hx + Math.cos(th) * r * 1.3;
          const y = hy + Math.sin(th) * r;
          if (k) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    // a road and a track
    polyline(ctx, [[12, 250], [140, 238], [260, 262], [380, 250], [516, 214]], rgba(pal.body, 0.12), 2);
    polyline(ctx, [[300, 22], [292, 120], [312, 230], [300, 368]], rgba(pal.body, 0.08), 1.5, [5, 4]);
  }

  function costmap() {
    const col = [pal.faint, pal.faint, pal.fail, pal.warn];
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const c = cost[j * cols + i];
        if (c < 0.05 || c >= 1) continue;
        ctx.fillStyle = rgba(col[kind[j * cols + i]], 0.06 + 0.3 * c);
        ctx.fillRect(MAP.x + i * CELL + 0.5, MAP.y + j * CELL + 0.5, CELL - 1, CELL - 1);
      }
  }

  function zones() {
    ctx.font = F(0.78);
    // ops area: where it may fly
    const ops = () => {
      ctx.moveTo(OPS[0][0], OPS[0][1]);
      for (const p of OPS.slice(1)) ctx.lineTo(p[0], p[1]);
      ctx.closePath();
    };
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = rgba(pal.ok, 0.6);
    ctx.beginPath();
    ops();
    ctx.stroke();
    ctx.restore();
    text(ctx, "ops area · 120 m agl", OPS[0][0] + 6, OPS[0][1] + 10, rgba(pal.ok, 0.85));

    const nfz1 = () => ctx.arc(NFZ1.x, NFZ1.y, NFZ1.r, 0, Math.PI * 2);
    hatch(ctx, nfz1, rgba(pal.fail, 0.3), 6);
    ctx.strokeStyle = rgba(pal.fail, 0.75);
    ctx.beginPath();
    nfz1();
    ctx.stroke();
    text(ctx, "no-fly · heliport", NFZ1.x, NFZ1.y - NFZ1.r - 8, pal.fail, "center");

    const nfz2 = () => {
      ctx.moveTo(NFZ2[0][0], NFZ2[0][1]);
      for (const p of NFZ2.slice(1)) ctx.lineTo(p[0], p[1]);
      ctx.closePath();
    };
    hatch(ctx, nfz2, rgba(pal.fail, 0.3), 6);
    ctx.strokeStyle = rgba(pal.fail, 0.75);
    ctx.beginPath();
    nfz2();
    ctx.stroke();
    text(ctx, "no-fly · plant", 360, 274, pal.fail, "center");

    if (tfr) {
      const k = clamp((t - tfrAt) / 0.5);
      const r = tfr.r;
      const z = () => ctx.arc(tfr!.x, tfr!.y, r, 0, Math.PI * 2);
      hatch(ctx, z, rgba(pal.warn, 0.32 * k), 5);
      ctx.strokeStyle = rgba(pal.warn, 0.9 * k);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      z();
      ctx.stroke();
      ctx.lineWidth = 1;
      if (k < 1) ring(ctx, tfr.x, tfr.y, r * (1 + 0.8 * k), rgba(pal.warn, 0.7 * (1 - k)), 1.2);
      ctx.fillStyle = rgba(pal.bg, 0.78);
      const label = "NOTAM A0417/26";
      ctx.fillRect(tfr.x - tw(ctx, label) / 2 - 3, tfr.y - r - 15, tw(ctx, label) + 6, 11);
      text(ctx, label, tfr.x, tfr.y - r - 9.5, rgba(pal.warn, k), "center");
    }

    // home and destination
    ctx.strokeStyle = rgba(pal.body, 0.8);
    ctx.strokeRect(HOME[0] - 7, HOME[1] - 7, 14, 14);
    text(ctx, "H", HOME[0], HOME[1] + 0.5, pal.body, "center");
    text(ctx, "gcs", HOME[0] + 12, HOME[1] + 16, pal.faint);
    ring(ctx, DEST[0], DEST[1], 7, rgba(pal.body, 0.8));
    dot(ctx, DEST[0], DEST[1], 2, pal.body);
    text(ctx, "inspect", DEST[0] - 12, DEST[1] + 16, pal.faint, "right");

    // north
    polyline(ctx, [[MAP.x + MAP.w - 18, 58], [MAP.x + MAP.w - 18, 40]], rgba(pal.muted, 0.8), 1.2);
    polyline(ctx, [[MAP.x + MAP.w - 22, 45], [MAP.x + MAP.w - 18, 40], [MAP.x + MAP.w - 14, 45]], rgba(pal.muted, 0.8), 1.2);
    text(ctx, "N", MAP.x + MAP.w - 18, 66, pal.muted, "center");
  }

  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, 99999, 99999);
    st.apply(ctx);

    ctx.font = F(0.82);
    text(ctx, "c2 · ground control", MAP.x, 11, pal.muted);
    const lg = [
      [pal.ok, "fly zone"],
      [pal.fail, "no-fly"],
      [pal.warn, "notam"],
    ];
    let lx = MAP.x + tw(ctx, "c2 · ground control") + 16;
    for (const [c, l] of lg) {
      ctx.fillStyle = rgba(c, 0.6);
      ctx.fillRect(lx, 7.5, 7, 7);
      text(ctx, l, lx + 11, 11, pal.faint);
      lx += 11 + tw(ctx, l) + 12;
    }
    ctx.fillStyle = rgba(pal.faint, 0.5);
    ctx.fillRect(lx, 7.5, 7, 7);
    text(ctx, "costmap buffer", lx + 11, 11, pal.faint);

    ctx.save();
    ctx.beginPath();
    ctx.rect(MAP.x, MAP.y, MAP.w, MAP.h);
    ctx.clip();
    terrain();
    costmap();
    zones();

    const [x, y] = route.at(s);
    // the route: v1 until the NOTAM, then v2, with v1's dead stretch marked
    if (old) {
      const fadeOld = 1 - clamp((t - replanAt) / 2.5);
      if (fadeOld > 0) polyline(ctx, old.between(oldFrom), rgba(pal.faint, 0.8 * fadeOld), 1.2, [4, 4]);
      const draw = clamp((t - replanAt) / 0.5);
      const pts = route.between(s);
      polyline(ctx, pts.slice(0, Math.max(2, Math.round(pts.length * draw))), rgba(pal.accent, 0.95), 1.6);
    } else {
      const draw = clamp(t / 0.6);
      const pts = route.between(s);
      polyline(ctx, pts.slice(0, Math.max(2, Math.round(pts.length * draw))), rgba(pal.accent, 0.95), 1.6);
      if (conflict && conflict[0] >= 0) polyline(ctx, route.between(conflict[0], conflict[1]), pal.fail, 2.2);
    }
    polyline(ctx, trail, rgba(pal.heading, 0.35), 1);

    // the C2 link, ground station to aircraft
    polyline(ctx, [HOME, [x, y]], rgba(pal.accent, 0.3), 1, [2, 4]);
    // the drone, with its own geofence buffer ring
    ring(ctx, x, y, 13, rgba(pal.heading, 0.25), 1);
    quad(ctx, x, y, heading, 15, pal.heading);
    ctx.restore();
    ctx.strokeStyle = rgba(pal.body, 0.35);
    ctx.strokeRect(MAP.x, MAP.y, MAP.w, MAP.h);

    panel(x, y);
    ctx.restore();
  }

  function panel(x: number, y: number) {
    const x0 = PANEL;
    const W = VW - PANEL - 6;
    ctx.font = F(0.85);
    text(ctx, "telemetry", x0, 11, pal.muted);
    text(ctx, "c2 link ok · 38 ms", x0 + W, 11, pal.ok, "right");
    ctx.strokeStyle = rgba(pal.body, 0.3);
    ctx.strokeRect(x0 + 0.5, 22.5, W - 1, 136);
    const hdg = Math.round(((Math.atan2(Math.cos(heading), -Math.sin(heading)) * 180) / Math.PI + 360) % 360);
    const gs = mode.startsWith("AUTO") && mode !== "AUTO · LOITER" ? 13.6 + 0.8 * Math.sin(t * 0.9) : 0;
    const togo = Math.max(0, ((route.length - s) * M_PER_PX) / 1000);
    const rows: [string, string, string][] = [
      ["mode", mode, mode === "AUTO · LOITER" ? pal.ok : pal.heading],
      ["alt", `${alt.toFixed(0).padStart(3)} m agl`, pal.body],
      ["gs", `${gs.toFixed(1).padStart(4)} m/s`, pal.body],
      ["hdg", `${String(hdg).padStart(3, "0")}°`, pal.body],
      ["route", `${old ? "v2" : "v1"} · ${togo.toFixed(1)} km to go`, old ? pal.accent : pal.body],
      ["batt", `${(81 - t * 0.35).toFixed(0)} %`, pal.body],
    ];
    ctx.font = F(0.86);
    rows.forEach(([k, v, c], i) => {
      const yy = 38 + i * 20;
      text(ctx, k, x0 + 9, yy, pal.faint);
      text(ctx, v, x0 + 60, yy, c);
    });

    const fy = 178;
    ctx.font = F(0.85);
    text(ctx, "airspace", x0, fy, pal.muted);
    text(ctx, "notam · geofence", x0 + W, fy, pal.faint, "right");
    ctx.strokeStyle = rgba(pal.body, 0.3);
    ctx.strokeRect(x0 + 0.5, fy + 10.5, W - 1, 178);
    ctx.font = F(0.82);
    feed.forEach((l, i) => {
      const yy = fy + 24 + i * 19;
      const a = clamp((t - l.t) / 0.25);
      ctx.globalAlpha = a;
      text(ctx, l.k, x0 + 9, yy, pal.faint);
      text(ctx, l.v, x0 + 52, yy, l.col);
      ctx.globalAlpha = 1;
    });
    void x;
    void y;
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
