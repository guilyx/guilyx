/**
 * Helpers shared by the promo's own scenes. The palette, the type and the
 * Scene contract come from v4's Systems kit (served next to these files by
 * capture.mjs), so the promo's scenes and the site's draw alike.
 */
import { clamp, rgba } from "./kit";

export type Pt = [number, number];

/** Fit a VW × VH stage into w × h, centred: draw in stage units after apply(). */
export function stage(VW: number, VH: number) {
  const st = { s: 1, ox: 0, oy: 0 };
  return {
    resize(w: number, h: number) {
      st.s = Math.min(w / VW, h / VH);
      st.ox = (w - VW * st.s) / 2;
      st.oy = (h - VH * st.s) / 2;
    },
    apply(ctx: CanvasRenderingContext2D) {
      ctx.translate(st.ox, st.oy);
      ctx.scale(st.s, st.s);
    },
  };
}

const hyp = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const unit = (x: number, y: number): Pt => {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
};

/** Points every `step` along a polyline. */
export function densify(pts: Pt[], step = 2): Pt[] {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const n = Math.max(1, Math.ceil(hyp(a, b) / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

/** Round every interior corner of a polyline with an arc of radius r. */
export function fillet(pts: Pt[], r: number, step = 2): Pt[] {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const u1 = unit(a[0] - b[0], a[1] - b[1]);
    const u2 = unit(c[0] - b[0], c[1] - b[1]);
    const th = Math.acos(clamp(u1[0] * u2[0] + u1[1] * u2[1], -1, 1));
    if (th > Math.PI - 1e-3 || th < 1e-3) {
      out.push(b);
      continue;
    }
    const t = Math.min(r / Math.tan(th / 2), 0.5 * hyp(a, b), 0.5 * hyp(b, c));
    const rr = t * Math.tan(th / 2);
    const p1: Pt = [b[0] + u1[0] * t, b[1] + u1[1] * t];
    const p2: Pt = [b[0] + u2[0] * t, b[1] + u2[1] * t];
    const bis = unit(u1[0] + u2[0], u1[1] + u2[1]);
    const d = rr / Math.sin(th / 2);
    const cx = b[0] + bis[0] * d;
    const cy = b[1] + bis[1] * d;
    const a1 = Math.atan2(p1[1] - cy, p1[0] - cx);
    let da = Math.atan2(p2[1] - cy, p2[0] - cx) - a1;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    out.push(p1);
    const n = Math.max(2, Math.ceil((Math.abs(da) * rr) / step));
    for (let k = 1; k < n; k++) out.push([cx + rr * Math.cos(a1 + (da * k) / n), cy + rr * Math.sin(a1 + (da * k) / n)]);
    out.push(p2);
  }
  out.push(pts[pts.length - 1]);
  return densify(out, step);
}

/** A polyline parameterised by arc length. */
export class Path {
  pts: Pt[];
  cum: number[];
  length: number;
  constructor(pts: Pt[]) {
    this.pts = pts;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + hyp(pts[i - 1], pts[i]));
    this.length = this.cum[this.cum.length - 1];
  }
  private seg(s: number) {
    let lo = 0;
    let hi = this.cum.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (this.cum[m] <= s) lo = m;
      else hi = m;
    }
    return lo;
  }
  /** [x, y, heading] at arc length s. */
  at(s: number): [number, number, number] {
    const q = clamp(s, 0, this.length);
    const i = Math.min(this.seg(q), this.pts.length - 2);
    const a = this.pts[i];
    const b = this.pts[i + 1];
    const l = this.cum[i + 1] - this.cum[i] || 1;
    const f = (q - this.cum[i]) / l;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0])];
  }
  /** The stretch of the path between two arc lengths. */
  between(s0: number, s1 = this.length): Pt[] {
    const a = clamp(s0, 0, this.length);
    const b = clamp(s1, a, this.length);
    const out: Pt[] = [];
    const p0 = this.at(a);
    out.push([p0[0], p0[1]]);
    for (let i = this.seg(a) + 1; i < this.pts.length && this.cum[i] < b; i++) out.push(this.pts[i]);
    const p1 = this.at(b);
    out.push([p1[0], p1[1]]);
    return out;
  }
}

export function polyline(ctx: CanvasRenderingContext2D, pts: Pt[], color: string, lw = 1, dash: number[] = []) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.setLineDash(dash);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.restore();
}

export function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, lw = 1, dash: number[] = []) {
  ctx.save();
  ctx.setLineDash(dash);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Diagonal hatching inside the current path (call after building it). */
export function hatch(ctx: CanvasRenderingContext2D, build: () => void, color: string, gap = 6, lw = 1) {
  ctx.save();
  ctx.beginPath();
  build();
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (let x = -1200; x < 1200; x += gap) {
    ctx.moveTo(x, -50);
    ctx.lineTo(x + 900, 850);
  }
  ctx.stroke();
  ctx.restore();
}

/** Corner brackets around a box: how a detector marks what it sees. */
export function brackets(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, arm = 4) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (const [cx, cy, sx, sy] of [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ]) {
    ctx.moveTo(cx + sx * arm, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * arm);
  }
  ctx.stroke();
  ctx.restore();
}

/** A box rotated about its centre. */
export function oriented(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  a: number,
  w: number,
  h: number,
  fill: string,
  stroke: string,
  lw = 1,
  dash: number[] = [],
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 2.5);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
}

/** A quadcopter seen from above, nose along `a`. */
export function quad(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, size: number, color: string, body = 0.9) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  const r = size * 0.5;
  ctx.strokeStyle = rgba(color, body);
  ctx.lineWidth = Math.max(1, size * 0.09);
  ctx.beginPath();
  for (const k of [1, 3, 5, 7]) {
    const t = (k * Math.PI) / 4;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r);
  }
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, size * 0.07);
  for (const k of [1, 3, 5, 7]) {
    const t = (k * Math.PI) / 4;
    ctx.beginPath();
    ctx.arc(Math.cos(t) * r, Math.sin(t) * r, size * 0.24, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size * 0.26, 0);
  ctx.lineTo(-size * 0.12, size * 0.14);
  ctx.lineTo(-size * 0.12, -size * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Width of a string in the current font. */
export const tw = (ctx: CanvasRenderingContext2D, s: string) => ctx.measureText(s).width;

export const smooth = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
