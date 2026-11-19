/**
 * A ground robot on a fleet manager's orders, on a store's back-room floor.
 *
 *   FMS order over VDA 5050 → behaviour tree → planner on a layered costmap
 *   (static, inflation, social) → Regulated Pure Pursuit → the wheels
 *
 * The order releases a base and keeps a horizon; the robot drives the base,
 * slows for corners and yields to the person crossing its aisle, docks under
 * a trolley, lifts it, and only then is the rest of the route released. The
 * planner bends the second leg around a person picking from a shelf, because
 * the social layer puts a cost in front of them. An emulated camera tags what
 * it sees; the lidar draws what the costmap is made of.
 */
import { type Palette, type Scene, clamp, easeOut, mono, rgba, span, text } from "./kit";
import { type Pt, Path, brackets, densify, dot, fillet, oriented, polyline, ring, smooth, stage, tw } from "./lib";

const VW = 760;
const VH = 380;
const MAP = { x: 12, y: 22, w: 504, h: 346 };
const PANEL = 540;
const CELL = 8;
const PX_PER_M = 40;
const VMAX = 46; // px/s: 1.15 m/s
const FS = 10.5;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
const RACKS: Rect[] = [];
for (const y of [60, 146, 232])
  for (const [x0, x1] of [
    [96, 236],
    [292, 432],
  ])
    RACKS.push({ x: x0, y, w: x1 - x0, h: 20 });

const NODES: Record<string, Pt> = {
  n1: [54, 318],
  n2: [54, 199],
  n3: [264, 199],
  n4: [474, 199],
  n5: [474, 300],
  n6: [300, 300],
};
const EDGES: [string, string, number][] = [
  ["n1", "n2", 0],
  ["n2", "n3", 0],
  ["n3", "n4", 0],
  ["n4", "n5", 1],
  ["n5", "n6", 1],
];
const PARKED: Pt[] = [
  [474, 113],
  [474, 41],
];
const T07: Pt = NODES.n4;
const PICKER: Pt = [382, 268];

const LEG1 = new Path(fillet([NODES.n1, NODES.n2, NODES.n3, NODES.n4], 26));
// the second leg bends below the person picking from rack C: the social layer
// puts a cost in front of them, and the planner pays to keep clear of it
const LEG2 = new Path(
  densify(fillet([NODES.n4, NODES.n5, NODES.n6], 26)).map(([x, y]): Pt => {
    const d = Math.abs(x - PICKER[0]);
    return y > 280 && d < 64 ? [x, y + 22 * (0.5 + 0.5 * Math.cos((Math.PI * d) / 64))] : [x, y];
  }),
);
// the person crossing aisle 2, down the cross aisle, then off to the packing tables
const WALK = new Path(fillet([[264, 92], [264, 276], [150, 276], [150, 352]], 18));

type Status = "idle" | "run" | "ok";
interface Log {
  t: number;
  dir: "in" | "out" | "";
  topic: string;
  body: string;
}

export default function amr(ctx: CanvasRenderingContext2D, pal: Palette): Scene {
  const st = stage(VW, VH);
  let t = 0;

  // the robot
  let phase: "idle" | "drive1" | "lift" | "turn" | "drive2" | "lower" | "exit" | "done" = "idle";
  let pt = 0; // time in phase
  let leg = LEG1;
  let s = 0;
  let v = 0;
  let heading = -Math.PI / 2;
  let carrying = false;
  let trolley: Pt = [T07[0], T07[1]];
  let trolleyA = 0;
  let limit = "—";
  let look = 20;
  let released = 0; // edges released: 0 → base only, 1 → all
  let passed = new Set<string>(["n1"]);
  let planned = 0; // 0..1, the plan drawing itself on
  let lidar: Pt[] = [];

  // the people
  let walkS = 0;
  let walking = false;
  const people = [
    { x: WALK.pts[0][0], y: WALK.pts[0][1], a: Math.PI / 2, moving: false },
    { x: PICKER[0], y: PICKER[1], a: -Math.PI / 2, moving: false },
  ];

  const bt: Status[] = ["idle", "idle", "idle", "idle", "idle", "idle"];
  const log: Log[] = [{ t: -9, dir: "out", topic: "conn", body: "ONLINE" }];
  const say = (dir: Log["dir"], topic: string, body: string, dt = 0) => log.push({ t: t + dt, dir, topic, body });

  // the static layers, computed once: distance to the nearest rack or wall
  const cols = Math.floor(MAP.w / CELL);
  const rows = Math.floor(MAP.h / CELL);
  const inflation = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const x = MAP.x + (i + 0.5) * CELL;
      const y = MAP.y + (j + 0.5) * CELL;
      let d = Math.min(x - MAP.x, MAP.x + MAP.w - x, y - MAP.y, MAP.y + MAP.h - y);
      for (const r of [...RACKS, ...PARKED.map(([px, py]) => ({ x: px - 15, y: py - 11, w: 30, h: 22 }))]) {
        const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
        const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
        d = Math.min(d, dx === 0 && dy === 0 ? -1 : Math.hypot(dx, dy));
      }
      inflation[j * cols + i] = d < 0 ? -1 : d < 9 ? 0.9 : d < 24 ? 0.9 * Math.exp(-0.17 * (d - 9)) : 0;
    }

  function social(x: number, y: number) {
    let c = 0;
    for (const p of people) {
      const dx = x - p.x;
      const dy = y - p.y;
      const f = dx * Math.cos(p.a) + dy * Math.sin(p.a);
      const l = -dx * Math.sin(p.a) + dy * Math.cos(p.a);
      const sf = f > 0 ? (p.moving ? 30 : 20) : 11;
      const sl = p.moving ? 15 : 12;
      c = Math.max(c, Math.exp(-(f * f) / (2 * sf * sf) - (l * l) / (2 * sl * sl)));
    }
    return c;
  }

  function solid(x: number, y: number) {
    if (x < MAP.x || x > MAP.x + MAP.w || y < MAP.y || y > MAP.y + MAP.h) return true;
    for (const r of RACKS) if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return true;
    for (const p of people) if (Math.hypot(x - p.x, y - p.y) < 5) return true;
    for (const [px, py] of PARKED) if (Math.abs(x - px) < 15 && Math.abs(y - py) < 11) return true;
    return false;
  }

  const pose = () => leg.at(s);

  function drive(dt: number) {
    const [rx, ry] = pose();
    look = clamp(v * 1.1, 20, 44);
    const [cx, cy] = leg.at(s + look);
    // pure pursuit: the arc through the carrot, in the robot's frame
    const dx = cx - rx;
    const dy = cy - ry;
    const ld = Math.hypot(dx, dy) || 1;
    const lat = -dx * Math.sin(heading) + dy * Math.cos(heading);
    const kappa = (2 * lat) / (ld * ld);
    const fc = clamp(1 / Math.max(Math.abs(kappa), 1e-6) / 40, 0.3, 1); // below a 1 m radius, slow down
    let cmax = 0;
    for (let d = 6; d <= 64; d += 6) {
      const [qx, qy] = leg.at(s + d);
      cmax = Math.max(cmax, social(qx, qy) * (1.15 - d / 140));
    }
    let fp = clamp(1 - 1.25 * cmax);
    if (fp < 0.12) fp = 0;
    const fa = clamp((leg.length - s) / 44, 0.3, 1);
    const f = Math.min(fc, fp, fa);
    const target = VMAX * f;
    v += clamp(target - v, -90 * dt, 45 * dt);
    if (v < 0.5 && target === 0) v = 0;
    limit =
      f > 0.97 ? "—" : f === fp ? (fp === 0 ? "social layer · yield" : "social layer") : f === fc ? "curvature" : "approach";
    s = Math.min(leg.length, s + v * dt);
    const [, , a] = leg.at(s);
    let da = a - heading;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    heading += da * clamp(dt * 14);
    return leg.length - s < 0.6;
  }

  function update(dt: number) {
    t += dt;
    pt += dt;

    // the person in the cross aisle sets off when the robot turns into aisle 2
    if (!walking && phase === "drive1" && pose()[0] > 125) walking = true;
    if (walking && walkS < WALK.length) {
      walkS = Math.min(WALK.length, walkS + 44 * dt);
      const [x, y, a] = WALK.at(walkS);
      Object.assign(people[0], { x, y, a, moving: walkS < WALK.length });
    }
    if (walkS >= WALK.length) people[0].a = Math.PI / 2;

    if (phase === "idle") {
      if (pt > 0.5 && log.length === 1) {
        say("in", "order", "o-4127 · upd 0");
        say("", "", "base n1→n4 · horizon n5 n6", 0.15);
      }
      if (pt > 0.9) planned = clamp((pt - 0.9) / 0.5);
      if (pt > 1.0) bt[0] = bt[1] = "run";
      if (pt > 1.6) {
        phase = "drive1";
        pt = 0;
        say("out", "state", "driving · last n1");
      }
    } else if (phase === "drive1" || phase === "drive2") {
      const done = drive(dt);
      const [x, y] = pose();
      for (const n of ["n2", "n3", "n5"])
        if (!passed.has(n) && Math.hypot(x - NODES[n][0], y - NODES[n][1]) < 16) {
          passed.add(n);
          say("out", "state", `last ${n}`);
        }
      if (phase === "drive1" && bt[1] === "run" && x > 436) {
        bt[1] = "ok";
        bt[2] = "run";
      }
      if (done) {
        v = 0;
        pt = 0;
        if (phase === "drive1") {
          phase = "lift";
          passed.add("n4");
          bt[2] = "ok";
          bt[3] = "run";
          say("out", "state", "pick RUNNING · n4");
        } else {
          phase = "lower";
          passed.add("n6");
          bt[4] = "ok";
          bt[5] = "run";
          say("out", "state", "drop RUNNING · n6");
        }
      }
    } else if (phase === "lift") {
      limit = "—";
      look = 20;
      if (pt > 1.3 && !carrying) {
        carrying = true;
        bt[3] = "ok";
        say("out", "state", "pick FINISHED · T-07");
      }
      if (pt > 1.75 && released === 0) {
        released = 1;
        say("in", "order", "o-4127 · upd 1");
        say("", "", "released n5 n6", 0.15);
      }
      if (pt > 2.2) {
        phase = "turn";
        pt = 0;
        leg = LEG2;
        s = 0;
        planned = 0;
        bt[4] = "run";
      }
    } else if (phase === "turn") {
      // rotate to heading before pursuing: RPP does this in place
      planned = clamp(pt / 0.4);
      const goal = LEG2.at(4)[2];
      let da = goal - heading;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      heading += clamp(da, -1.6 * dt, 1.6 * dt);
      limit = "rotate to heading";
      if (Math.abs(da) < 0.01 && pt > 0.5) {
        phase = "drive2";
        pt = 0;
      }
    } else if (phase === "lower") {
      limit = "—";
      look = 20;
      if (pt > 1.2 && carrying) {
        carrying = false;
        bt[5] = "ok";
        bt[0] = "ok";
        say("out", "state", "drop FINISHED");
        say("out", "state", "order done · idle", 0.35);
      }
      if (pt > 1.6) {
        phase = "exit";
        pt = 0;
      }
    } else if (phase === "exit") {
      // back out from under the trolley, and leave it where it was ordered
      v = 0;
      limit = "—";
      s = Math.max(leg.length - 30, s - 22 * dt);
      if (s <= leg.length - 30) {
        phase = "done";
        pt = 0;
      }
    }

    const [rx, ry] = pose();
    if (carrying) {
      trolley = [rx, ry];
      trolleyA = heading;
    }

    // a 270° scan, short range: what the costmap's obstacle layer is made of
    lidar = [];
    for (let k = 0; k < 54; k++) {
      const a = heading - (Math.PI * 0.75) + (k / 53) * Math.PI * 1.5;
      for (let d = 14; d < 96; d += 2) {
        const x = rx + Math.cos(a) * d;
        const y = ry + Math.sin(a) * d;
        if (solid(x, y)) {
          lidar.push([x, y]);
          break;
        }
      }
    }
  }

  // ------------------------------------------------------------- drawing
  const F = (k = 1, wt = 400) => mono(FS * k, wt);

  function legend() {
    ctx.font = F(0.82);
    let x = MAP.x;
    const y = 11;
    text(ctx, "store floor", x, y, pal.muted);
    x += tw(ctx, "store floor") + 16;
    const item = (draw: (x: number) => void, label: string) => {
      draw(x);
      x += 12;
      text(ctx, label, x, y, pal.faint);
      x += tw(ctx, label) + 12;
    };
    item((x) => {
      ctx.fillStyle = rgba(pal.accent, 0.4);
      ctx.fillRect(x, y - 3.5, 7, 7);
    }, "inflation");
    item((x) => {
      ctx.fillStyle = rgba(pal.warn, 0.55);
      ctx.fillRect(x, y - 3.5, 7, 7);
    }, "social");
    item((x) => polyline(ctx, [[x, y], [x + 8, y]], pal.accent, 1.6), "plan");
    item((x) => ring(ctx, x + 4, y, 4, rgba(pal.accent, 0.7), 1, [2, 2]), "lookahead");
    item((x) => dot(ctx, x + 4, y, 1.5, pal.body), "lidar");
  }

  function costmap() {
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const c = inflation[j * cols + i];
        const x = MAP.x + i * CELL;
        const y = MAP.y + j * CELL;
        const sc = social(x + CELL / 2, y + CELL / 2);
        if (sc > 0.07) {
          ctx.fillStyle = rgba(pal.warn, 0.06 + 0.4 * sc);
          ctx.fillRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
        } else if (c > 0.07) {
          ctx.fillStyle = rgba(pal.accent, 0.05 + 0.24 * c);
          ctx.fillRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
        }
      }
  }

  function floor() {
    ctx.strokeStyle = rgba(pal.body, 0.35);
    ctx.lineWidth = 1;
    ctx.strokeRect(MAP.x, MAP.y, MAP.w, MAP.h);
    for (const r of RACKS) {
      ctx.fillStyle = rgba(pal.body, 0.1);
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = rgba(pal.body, 0.45);
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      ctx.strokeStyle = rgba(pal.body, 0.16);
      ctx.beginPath();
      for (let x = r.x + 20; x < r.x + r.w - 4; x += 20) {
        ctx.moveTo(x, r.y + 2);
        ctx.lineTo(x, r.y + r.h - 2);
      }
      ctx.stroke();
    }
    // zones
    const zone = (x: number, y: number, w: number, h: number, label: string, lx: number, ly: number) => {
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = rgba(pal.muted, 0.5);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
      ctx.font = F(0.78);
      text(ctx, label, lx, ly, pal.faint);
    };
    zone(446, 26, 64, 196, "trolley bay", 444, 236 - 4);
    zone(268, 280, 64, 42, "outbound", 274, 330);
    // the dock, against the west wall
    ctx.fillStyle = rgba(pal.ok, 0.18);
    ctx.fillRect(MAP.x + 1, 306, 8, 24);
    ctx.font = F(0.78);
    text(ctx, "dock", MAP.x + 14, 346, pal.faint);
  }

  function graph() {
    ctx.font = F(0.74);
    for (const [a, b, h] of EDGES) {
      const base = h <= released;
      polyline(ctx, [NODES[a], NODES[b]], base ? rgba(pal.body, 0.28) : rgba(pal.faint, 0.55), 1, base ? [] : [3, 4]);
    }
    for (const [id, [x, y]] of Object.entries(NODES)) {
      const horizon = (id === "n5" || id === "n6") && released === 0;
      if (horizon) ring(ctx, x, y, 3, rgba(pal.faint, 0.8));
      else dot(ctx, x, y, 2.6, passed.has(id) ? rgba(pal.body, 0.75) : rgba(pal.body, 0.45));
      text(ctx, id, x + 6, y - 7, pal.faint);
    }
  }

  function trolleyAt(x: number, y: number, a: number, col: string, lw = 1) {
    oriented(ctx, x, y, a, 30, 22, rgba(col, 0.06), rgba(col, 0.75), lw);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    for (const [sx, sy] of [
      [-12, -8],
      [12, -8],
      [-12, 8],
      [12, 8],
    ])
      dot(ctx, sx, sy, 1.6, rgba(col, 0.85));
    ctx.restore();
  }

  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, 99999, 99999);
    st.apply(ctx);
    legend();
    ctx.save();
    ctx.beginPath();
    ctx.rect(MAP.x, MAP.y, MAP.w, MAP.h);
    ctx.clip();
    costmap();
    floor();
    graph();

    const [rx, ry] = pose();

    // the plan, from the robot on
    if (phase !== "done" && phase !== "lift" && phase !== "lower" && phase !== "exit") {
      const span0 = phase === "idle" || phase === "turn" ? 0 : s;
      const full = leg.between(span0);
      const n = Math.max(2, Math.round(full.length * (phase === "idle" || phase === "turn" ? planned : 1)));
      polyline(ctx, full.slice(0, n), rgba(pal.accent, 0.95), 1.6);
    }

    // camera (emulated): a 70° frustum, and what it tags
    const fov = (35 * Math.PI) / 180;
    const range = 120;
    ctx.fillStyle = rgba(pal.accent, 0.05);
    ctx.strokeStyle = rgba(pal.accent, 0.2);
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.arc(rx, ry, range, heading - fov, heading + fov);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    for (const [x, y] of lidar) dot(ctx, x, y, 1.15, rgba(pal.body, 0.85));

    // parked trolleys, and T-07 until it is lifted
    for (const [x, y] of PARKED) trolleyAt(x, y, 0, pal.muted);
    if (!carrying) trolleyAt(trolley[0], trolley[1], trolleyA, phase === "done" ? pal.body : pal.muted);

    // the people
    for (const p of people) {
      dot(ctx, p.x, p.y, 5, rgba(pal.heading, 0.9));
      polyline(ctx, [[p.x, p.y], [p.x + Math.cos(p.a) * 8, p.y + Math.sin(p.a) * 8]], rgba(pal.heading, 0.9), 1.4);
    }

    // the robot, and its footprint — which grows when it carries a trolley
    oriented(ctx, rx, ry, heading, 24, 18, rgba(pal.accent, 0.28), pal.accent, 1.3);
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(heading);
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(5, -4);
    ctx.lineTo(5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (carrying) trolleyAt(rx, ry, heading, pal.body, 1.2);
    oriented(ctx, rx, ry, heading, carrying ? 38 : 30, carrying ? 30 : 24, "rgba(0,0,0,0)", rgba(pal.faint, 0.8), 1, [2, 3]);

    // RPP: the lookahead circle, the carrot on the path, and the arc to it
    if (phase === "drive1" || phase === "drive2") {
      ring(ctx, rx, ry, look, rgba(pal.accent, 0.55), 1, [2, 3]);
      const [cx, cy] = leg.at(s + look);
      ctx.strokeStyle = rgba(pal.accent, 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(rx + Math.cos(heading) * look * 0.5, ry + Math.sin(heading) * look * 0.5, cx, cy);
      ctx.stroke();
      dot(ctx, cx, cy, 2.6, pal.accent);
    }

    // detections: whatever is in the frustum, with a clear line of sight
    ctx.font = F(0.76);
    const seen: [number, number, number, number, string][] = [];
    for (const p of people) seen.push([p.x, p.y, 9, 9, "person"]);
    if (!carrying && phase !== "done") seen.push([trolley[0], trolley[1], 17, 13, "trolley"]);
    for (const [x, y, hw, hh, label] of seen) {
      const d = Math.hypot(x - rx, y - ry);
      let da = Math.atan2(y - ry, x - rx) - heading;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      if (d > range || d < 16 || Math.abs(da) > fov) continue;
      let clear = true;
      for (let k = 0.15; k < 0.9; k += 0.05) {
        const qx = rx + (x - rx) * k;
        const qy = ry + (y - ry) * k;
        for (const r of RACKS) if (qx > r.x && qx < r.x + r.w && qy > r.y && qy < r.y + r.h) clear = false;
      }
      if (!clear) continue;
      const conf = (0.8 + 0.18 * (1 - d / range)).toFixed(2);
      brackets(ctx, x - hw, y - hh, hw * 2, hh * 2, pal.heading, 3.5);
      const s2 = `${label} ${conf}`;
      ctx.fillStyle = rgba(pal.bg, 0.75);
      ctx.fillRect(x - hw, y - hh - 11, tw(ctx, s2) + 4, 9.5);
      text(ctx, s2, x - hw + 2, y - hh - 6, pal.heading);
    }

    ctx.restore();
    panel();
    ctx.restore();
  }

  function panel() {
    const x0 = PANEL;
    const W = VW - PANEL - 6;
    // FMS ↔ robot
    ctx.font = F(0.85);
    text(ctx, "fms ↔ robot", x0, 11, pal.muted);
    text(ctx, "vda 5050 · mqtt", x0 + W, 11, pal.faint, "right");
    const L = { y: 22, h: 150, lh: 16.5 };
    ctx.strokeStyle = rgba(pal.body, 0.3);
    ctx.strokeRect(x0 + 0.5, L.y + 0.5, W - 1, L.h);
    const shown = log.filter((l) => l.t <= t);
    const max = Math.floor((L.h - 8) / L.lh);
    const tail = shown.slice(-max);
    ctx.font = F(0.82);
    tail.forEach((l, i) => {
      const y = L.y + 12 + i * L.lh;
      const age = t - l.t;
      const newest = i >= tail.length - 2 && age < 2.5;
      const a = clamp(age / 0.2) * (newest ? 1 : 0.62);
      ctx.globalAlpha = a;
      const arrow = l.dir === "in" ? "←" : l.dir === "out" ? "→" : "";
      text(ctx, arrow, x0 + 7, y, l.dir === "in" ? pal.accent : pal.muted);
      text(ctx, l.topic, x0 + 20, y, pal.faint);
      text(ctx, l.body, x0 + 62, y, l.dir === "" ? pal.muted : pal.body);
      ctx.globalAlpha = 1;
    });

    // the controller
    const cy = 192;
    ctx.font = F(0.85);
    text(ctx, "controller", x0, cy, pal.muted);
    text(ctx, "regulated pure pursuit", x0 + W, cy, pal.faint, "right");
    ctx.font = F(0.82);
    const row = (k: string, val: string, y: number, col = pal.body) => {
      text(ctx, k, x0 + 7, y, pal.faint);
      text(ctx, val, x0 + 82, y, col);
    };
    const ms = (v / PX_PER_M).toFixed(2);
    row("v", `${ms} m/s`, cy + 17);
    ctx.fillStyle = rgba(pal.line, 1);
    ctx.fillRect(x0 + 150, cy + 14, W - 156, 5);
    ctx.fillStyle = rgba(pal.accent, 0.85);
    ctx.fillRect(x0 + 150, cy + 14, (W - 156) * clamp(v / VMAX), 5);
    row("lookahead", `${(look / PX_PER_M).toFixed(2)} m`, cy + 33);
    row("limited by", limit, cy + 49, limit === "—" ? pal.faint : limit.startsWith("social") ? pal.warn : pal.body);

    // the behaviour tree
    const by = 268;
    ctx.font = F(0.85);
    text(ctx, "behavior tree", x0, by, pal.muted);
    text(ctx, "o-4127", x0 + W, by, pal.faint, "right");
    const nodes: [number, string, string][] = [
      [0, "Sequence", "mission"],
      [1, "NavigateToPose", "bay"],
      [1, "DockUnder", "T-07"],
      [1, "Lift", ""],
      [1, "NavigateToPose", "outbound"],
      [1, "Lower", ""],
    ];
    ctx.font = F(0.82);
    nodes.forEach(([depth, name, arg], i) => {
      const y = by + 17 + i * 15.5;
      const x = x0 + 10 + depth * 14;
      if (depth) {
        ctx.strokeStyle = rgba(pal.faint, 0.5);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0 + 13, y - 15.5 + 4);
        ctx.lineTo(x0 + 13, y);
        ctx.lineTo(x - 3, y);
        ctx.stroke();
      }
      const stt = bt[i];
      if (stt === "run") dot(ctx, x + 3, y, 3, pal.accent);
      else if (stt === "ok") {
        ctx.strokeStyle = pal.ok;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 2.5, y + 2.5);
        ctx.lineTo(x + 6.5, y - 3);
        ctx.stroke();
      } else ring(ctx, x + 3, y, 2.6, rgba(pal.faint, 0.9));
      text(ctx, name, x + 11, y, stt === "run" ? pal.heading : stt === "ok" ? pal.body : pal.muted);
      if (arg) text(ctx, arg, x0 + W - 4, y, pal.faint, "right");
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
    poster: 12,
  };
}
