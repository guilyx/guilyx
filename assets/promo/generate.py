#!/usr/bin/env python3
"""
guilyx — terminal profile promo.

Renders `guilyx-terminal.gif`: a ~13s looping sequence that opens as a terminal,
answers `whoami` with the identity card, turns the falling glyph rain into a
live flocking simulation, lets three of those agents settle into the swarm mark,
traces the trajectory, and signs off.

Palette, type registers and the accent budget come from guilyx/branding
("Ink & Iris"). The accent is the only saturated value in the system, so it is
spent once per scene and nowhere else. The flock reads `--color-agent`, which
tracks `muted` — texture, not decoration.

Deps: pillow >= 10
Run:  python3 assets/promo/generate.py
"""

from __future__ import annotations

import math
import os
import random
from collections import deque

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

# --------------------------------------------------------------------------
# Canvas
# --------------------------------------------------------------------------

W, H = 880, 440           # logical (delivered) size
SS = 2                    # supersample factor; all drawing happens at SS scale
FW, FH = W * SS, H * SS
FRAME_MS = 60             # 60ms/frame ≈ 16.7fps

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "guilyx-terminal.gif")

RNG = random.Random(7)    # fixed seed: regeneration is reproducible


def S(v: float) -> float:
    """Logical unit -> supersampled device unit."""
    return v * SS


# --------------------------------------------------------------------------
# Palette — Ink & Iris (guilyx/branding/tokens/tokens.json)
# --------------------------------------------------------------------------

BG      = (0x0d, 0x0e, 0x12)   # ground
RAISED  = (0x15, 0x17, 0x1d)   # cards, panels
LINE    = (0x25, 0x28, 0x33)   # borders, rules
FAINT   = (0x55, 0x5b, 0x69)   # labels, keys
MUTED   = (0x7c, 0x82, 0x91)   # secondary text — and the flock
BODY    = (0xa5, 0xaa, 0xb8)   # running text
HEADING = (0xe4, 0xe6, 0xec)   # headings
ACCENT  = (0x8b, 0x95, 0xf0)   # the only saturated value
WHITE   = (0xff, 0xff, 0xff)

AGENT = MUTED                  # --color-agent tracks muted


def mix(a, b, t):
    """Linear blend a -> b."""
    t = max(0.0, min(1.0, t))
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def fade(c, t):
    """Fade a colour toward the ground. t=1 is full strength."""
    return mix(BG, c, t)


def ramp(a, b, n):
    return [mix(a, b, k / (n - 1)) for k in range(n)]


def brand_colours():
    """
    The values the design must reproduce exactly — the accent especially, since
    it is the only saturated hue in the system and quantisation drift shows.
    """
    cols: list[tuple[int, int, int]] = []
    cols += ramp((0, 0, 0), BG, 4)
    cols += ramp(BG, LINE, 6)
    cols += ramp(LINE, FAINT, 5)
    cols += ramp(FAINT, MUTED, 5)
    cols += ramp(MUTED, BODY, 4)
    cols += ramp(BODY, HEADING, 5)
    cols += ramp(HEADING, WHITE, 3)
    cols += ramp(BG, ACCENT, 12)
    cols += ramp(ACCENT, (0xd6, 0xdb, 0xff), 5)
    # The flash card is two frames of a bright ground in a piece that is
    # otherwise near-black, so an adaptive palette spends nothing up here and
    # the vignette contours into rings. Reserve the range explicitly.
    cols += ramp(mix(BG, HEADING, 0.5), WHITE, 20)
    cols += ramp(mix(BG, mix(HEADING, BODY, 0.35), 0.5),
                 mix(HEADING, BODY, 0.35), 10)
    cols += [RAISED, ACCENT, HEADING, MUTED, FAINT, LINE, BG, WHITE]
    return cols


def build_palette(frames_rgb):
    """
    A global palette derived from the frames themselves, then topped up with the
    brand values.

    Every frame shares it, which is what lets the encoder delta-code between
    frames. Deriving it adaptively matters more than it sounds: almost the whole
    piece lives in the two stops between `#0d0e12` and `#252833`, and a palette
    built from even ramps puts its steps in the wrong places and contours the
    bloom into visible rings.
    """
    tiles = [f.resize((W // 4, H // 4), Image.BILINEAR) for f in frames_rgb[::2]]
    tw, th = W // 4, H // 4
    cols_n = 12
    rows_n = math.ceil(len(tiles) / cols_n)
    mont = Image.new("RGB", (cols_n * tw, rows_n * th), BG)
    for i, t in enumerate(tiles):
        mont.paste(t, ((i % cols_n) * tw, (i // cols_n) * th))

    adaptive = mont.quantize(colors=200, method=Image.Quantize.MEDIANCUT)
    raw = adaptive.getpalette()[: 200 * 3]
    cols = [tuple(raw[i:i + 3]) for i in range(0, len(raw), 3)]
    cols += brand_colours()

    seen, uniq = set(), []
    for c in cols:
        if c not in seen:
            seen.add(c)
            uniq.append(c)
    uniq = uniq[:256]
    flat: list[int] = []
    for c in uniq:
        flat += list(c)
    flat += [0, 0, 0] * (256 - len(uniq))

    pal = Image.new("P", (1, 1))
    pal.putpalette(flat)
    return pal


# --------------------------------------------------------------------------
# Type — the two-register system from brand/voice.md
#   lowercase mono  = the machine talking
#   sentence-case display = the person
# --------------------------------------------------------------------------

MONO_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
MONO_BOLD_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
DISP_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
DISP_REG_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"


def font(path, size):
    return ImageFont.truetype(path, int(round(size * SS)))


F_MONO_XS = font(MONO_PATH, 10)
F_MONO_S = font(MONO_PATH, 12)
F_MONO = font(MONO_PATH, 13.5)
F_MONO_B = font(MONO_BOLD_PATH, 13.5)
F_MONO_L = font(MONO_PATH, 17)
F_MONO_XL = font(MONO_BOLD_PATH, 30)
F_DISP_XL = font(DISP_PATH, 54)
F_DISP_L = font(DISP_PATH, 34)
F_DISP_M = font(DISP_REG_PATH, 21)


def cw(f) -> float:
    """Advance width of one monospace cell, in logical units."""
    return f.getlength("M") / SS


CW = cw(F_MONO)
CW_S = cw(F_MONO_S)
LH = 19.0            # mono line height, logical


def text(d, x, y, s, f, fill, anchor="la"):
    d.text((S(x), S(y)), s, font=f, fill=fill, anchor=anchor)


def text_w(s, f) -> float:
    return f.getlength(s) / SS


def ctext(d, cx, y, s, f, fill):
    """Centred text."""
    d.text((S(cx), S(y)), s, font=f, fill=fill, anchor="ma")


# --------------------------------------------------------------------------
# Easing
# --------------------------------------------------------------------------

def clamp01(t):
    return max(0.0, min(1.0, t))


def ease_out(t):
    t = clamp01(t)
    return 1 - (1 - t) ** 3


def ease_in_out(t):
    t = clamp01(t)
    return 3 * t * t - 2 * t * t * t


def seg(frame, start, length):
    """Local progress 0..1 of a beat starting at `start` and lasting `length`."""
    return clamp01((frame - start) / float(length))


# --------------------------------------------------------------------------
# Glyph rain
#
# No katakana on this box, so the rain runs on the symbol set an engineering
# console would actually have: hex, greek, maths, box drawing. It reads closer
# to the work than cosplay kana would.
# --------------------------------------------------------------------------

GLYPHS = list("0123456789ABCDEF")
GLYPHS += list("λΣΔΘΞΨΩΦΓΠμσπτω")
GLYPHS += list("∞∅≡≈±×÷√∫∂∇⊕⊗<>/\\|=+-*")
GLYPHS += list("░▒▓│┤├┼╱╲◆◇○●□■▲▼")


class Rain:
    """Monochrome cascade. Heads are bright, trails fall away to the hairline."""

    COL_W = 13.0
    TRAIL = 16

    def __init__(self, rng):
        self.rng = rng
        self.ncols = int(W / self.COL_W) + 1
        self.y = [rng.uniform(-H, 0) for _ in range(self.ncols)]
        self.speed = [rng.uniform(4.5, 13.0) for _ in range(self.ncols)]
        self.on = [rng.random() < 0.6 for _ in range(self.ncols)]
        self.chars = [
            [rng.choice(GLYPHS) for _ in range(self.TRAIL)] for _ in range(self.ncols)
        ]

    def step(self):
        for i in range(self.ncols):
            self.y[i] += self.speed[i]
            if self.y[i] > H + self.TRAIL * LH:
                self.y[i] = self.rng.uniform(-H * 0.6, -20)
                self.speed[i] = self.rng.uniform(4.5, 13.0)
                self.on[i] = self.rng.random() < 0.75
            if self.rng.random() < 0.28:
                self.chars[i][self.rng.randrange(self.TRAIL)] = self.rng.choice(GLYPHS)

    def heads(self):
        """Live head positions — used to seed the flock when the rain resolves."""
        out = []
        for i in range(self.ncols):
            if self.on[i] and 0 < self.y[i] < H:
                out.append((i * self.COL_W + self.COL_W * 0.5, self.y[i]))
        return out

    def draw(self, d, k):
        if k <= 0.01:
            return
        for i in range(self.ncols):
            if not self.on[i]:
                continue
            x = i * self.COL_W
            for j in range(self.TRAIL):
                y = self.y[i] - j * LH
                if y < -LH or y > H:
                    continue
                # brightest at the head, dying into the hairline behind it
                f = (1 - j / self.TRAIL) ** 1.7
                if j == 0:
                    col = fade(BODY, 0.95 * k)
                elif j < 3:
                    col = fade(MUTED, f * k)
                else:
                    col = fade(FAINT, f * 0.9 * k)
                if col == BG:
                    continue
                text(d, x, y, self.chars[i][j], F_MONO_S, col)


# --------------------------------------------------------------------------
# Flock
#
# Reynolds' three rules, exactly the ones named in the brand footer:
# separation, alignment, cohesion. Drawn the way the social card draws them —
# small arrowheads with long faint trails.
# --------------------------------------------------------------------------

class Flock:
    R_NEIGHBOUR = 115.0
    R_SEP = 26.0
    MAX_SPEED = 3.4
    MAX_FORCE = 0.13
    TRAIL = 24

    def __init__(self, n, rng):
        self.rng = rng
        self.n = n
        self.pos: list[list[float]] = []
        self.vel: list[list[float]] = []
        self.trail: list[deque] = []
        self.alive = [False] * n
        for _ in range(n):
            self.pos.append([RNG.uniform(0, W), RNG.uniform(0, H)])
            a = rng.uniform(0, math.tau)
            self.vel.append([math.cos(a) * 2.2, math.sin(a) * 2.2])
            self.trail.append(deque(maxlen=self.TRAIL))
        # agents pinned to the mark during the formation beat
        self.pinned: dict[int, tuple[float, float]] = {}

    def spawn(self, i, x, y, falling=True):
        self.pos[i] = [x, y]
        # agents handed over from a rain column keep falling; the rest start on
        # any heading, so alignment has something to negotiate instead of
        # locking the whole flock downward into the floor
        if falling:
            a = self.rng.uniform(math.pi * 0.15, math.pi * 0.85)
        else:
            a = self.rng.uniform(0, math.tau)
        sp = self.rng.uniform(2.4, 3.2)
        self.vel[i] = [math.cos(a) * sp, math.sin(a) * sp]
        self.trail[i].clear()
        self.alive[i] = True

    def step(self, cohesion_boost=0.0):
        live = [i for i in range(self.n) if self.alive[i]]
        for i in live:
            if i in self.pinned:
                continue
            px, py = self.pos[i]
            sep = [0.0, 0.0]
            ali = [0.0, 0.0]
            coh = [0.0, 0.0]
            n_ali = n_coh = n_sep = 0
            for j in live:
                if j == i:
                    continue
                dx = self.pos[j][0] - px
                dy = self.pos[j][1] - py
                d2 = dx * dx + dy * dy
                if d2 <= 1e-6 or d2 > self.R_NEIGHBOUR ** 2:
                    continue
                dist = math.sqrt(d2)
                if dist < self.R_SEP:
                    sep[0] -= dx / dist
                    sep[1] -= dy / dist
                    n_sep += 1
                ali[0] += self.vel[j][0]
                ali[1] += self.vel[j][1]
                n_ali += 1
                coh[0] += self.pos[j][0]
                coh[1] += self.pos[j][1]
                n_coh += 1

            # Reynolds steering: each rule proposes a *desired velocity* at full
            # speed, and the force is the difference from the current one,
            # limited. Steering on the raw offset instead lets cohesion saturate
            # the force limit at every range, and the flock collapses to its own
            # centroid rather than flocking.
            vx0, vy0 = self.vel[i]

            def steer(dx, dy, weight):
                m = math.hypot(dx, dy)
                if m < 1e-6:
                    return 0.0, 0.0
                sx = dx / m * self.MAX_SPEED - vx0
                sy = dy / m * self.MAX_SPEED - vy0
                sm = math.hypot(sx, sy)
                if sm > self.MAX_FORCE:
                    sx = sx / sm * self.MAX_FORCE
                    sy = sy / sm * self.MAX_FORCE
                return sx * weight, sy * weight

            ax = ay = 0.0
            if n_sep:
                s = steer(sep[0], sep[1], 1.75)
                ax += s[0]
                ay += s[1]
            if n_ali:
                s = steer(ali[0] / n_ali, ali[1] / n_ali, 1.05)
                ax += s[0]
                ay += s[1]
            if n_coh:
                s = steer(coh[0] / n_coh - px, coh[1] / n_coh - py,
                          0.85 + cohesion_boost * 1.6)
                ax += s[0]
                ay += s[1]

            # soft walls: steer back rather than wrap, so the flock stays framed
            m = 78.0
            wx = wy = 0.0
            if px < m:
                wx = 1.0
            elif px > W - m:
                wx = -1.0
            if py < m:
                wy = 1.0
            elif py > H - m:
                wy = -1.0
            if wx or wy:
                s = steer(wx, wy, 2.2)
                ax += s[0]
                ay += s[1]

            mag = math.hypot(ax, ay)
            lim = self.MAX_FORCE * 2.2
            if mag > lim:
                ax = ax / mag * lim
                ay = ay / mag * lim

            vx = self.vel[i][0] + ax
            vy = self.vel[i][1] + ay
            sp = math.hypot(vx, vy)
            if sp > self.MAX_SPEED:
                vx = vx / sp * self.MAX_SPEED
                vy = vy / sp * self.MAX_SPEED
            elif sp < 1.2 and sp > 1e-6:
                vx = vx / sp * 1.2
                vy = vy / sp * 1.2
            self.vel[i] = [vx, vy]
            self.pos[i] = [px + vx, py + vy]

        for i in live:
            self.trail[i].append(tuple(self.pos[i]))

    # -- drawing ---------------------------------------------------------

    def draw_links(self, d, k):
        if k <= 0.01:
            return
        live = [i for i in range(self.n) if self.alive[i]]
        for a in range(len(live)):
            i = live[a]
            for b in range(a + 1, len(live)):
                j = live[b]
                dx = self.pos[j][0] - self.pos[i][0]
                dy = self.pos[j][1] - self.pos[i][1]
                d2 = dx * dx + dy * dy
                if d2 > 62.0 ** 2:
                    continue
                t = 1 - math.sqrt(d2) / 62.0
                col = fade(FAINT, t * 0.8 * k)
                if col == BG:
                    continue
                d.line(
                    [S(self.pos[i][0]), S(self.pos[i][1]),
                     S(self.pos[j][0]), S(self.pos[j][1])],
                    fill=col, width=max(1, int(S(0.6))),
                )

    def draw(self, d, k, col=None, size=1.3):
        if k <= 0.01:
            return
        base = col or AGENT
        for i in range(self.n):
            if not self.alive[i]:
                continue
            pts = list(self.trail[i])
            for p in range(1, len(pts)):
                t = p / len(pts)
                c = fade(base, t * 0.46 * k)
                if c == BG:
                    continue
                d.line([S(pts[p - 1][0]), S(pts[p - 1][1]),
                        S(pts[p][0]), S(pts[p][1])],
                       fill=c, width=max(1, int(S(0.7))))
            self._arrow(d, i, fade(base, k), size)

    def _arrow(self, d, i, col, size):
        x, y = self.pos[i]
        vx, vy = self.vel[i]
        sp = math.hypot(vx, vy) or 1.0
        ux, uy = vx / sp, vy / sp
        L = 5.4 * size
        Wd = 2.6 * size
        tip = (x + ux * L, y + uy * L)
        back = (x - ux * L * 0.55, y - uy * L * 0.55)
        left = (back[0] - uy * Wd, back[1] + ux * Wd)
        right = (back[0] + uy * Wd, back[1] - ux * Wd)
        d.polygon(
            [S(tip[0]), S(tip[1]), S(left[0]), S(left[1]), S(right[0]), S(right[1])],
            fill=col,
        )


# --------------------------------------------------------------------------
# The mark — three agents holding a formation (guilyx/branding/brand/logo.md)
# Geometry is the SVG's, on a 32x32 grid, about the centroid.
# --------------------------------------------------------------------------

MARK_NODES = ((16.0, 8.5), (8.5, 21.0), (23.5, 21.0))
MARK_CENTROID = (16.0, (8.5 + 21.0 + 21.0) / 3.0)
MARK_R = 2.1
MARK_STROKE = 1.1


def mark_points(cx, cy, size):
    """Node centres for a mark of `size` logical units, centred on (cx, cy)."""
    s = size / 32.0
    return [
        (cx + (x - MARK_CENTROID[0]) * s, cy + (y - MARK_CENTROID[1]) * s)
        for (x, y) in MARK_NODES
    ]


def draw_mark(d, cx, cy, size, k=1.0, nodes_only=False):
    pts = mark_points(cx, cy, size)
    s = size / 32.0
    if not nodes_only:
        # the link path is deliberately weaker than the nodes: the agents are
        # the subject, the formation is the consequence
        col = fade(ACCENT, 0.45 * k)
        if col != BG:
            d.line([S(pts[0][0]), S(pts[0][1]), S(pts[1][0]), S(pts[1][1]),
                    S(pts[2][0]), S(pts[2][1]), S(pts[0][0]), S(pts[0][1])],
                   fill=col, width=max(1, int(S(MARK_STROKE * s))), joint="curve")
    r = MARK_R * s
    for (x, y) in pts:
        d.ellipse([S(x - r), S(y - r), S(x + r), S(y + r)], fill=fade(ACCENT, k))


# --------------------------------------------------------------------------
# Chrome
# --------------------------------------------------------------------------

def corner_ticks(d, k, inset=16.0, arm=26.0):
    col = fade(LINE, k)
    if col == BG:
        return
    wpx = max(1, int(S(1)))
    for cx, cy, sx, sy in ((inset, inset, 1, 1), (W - inset, inset, -1, 1),
                           (inset, H - inset, 1, -1), (W - inset, H - inset, -1, -1)):
        d.line([S(cx), S(cy), S(cx + sx * arm), S(cy)], fill=col, width=wpx)
        d.line([S(cx), S(cy), S(cx), S(cy + sy * arm)], fill=col, width=wpx)


def status_bar(d, k, label):
    """Bottom hairline plus a lowercase machine-register label."""
    col = fade(LINE, k * 0.9)
    if col != BG:
        d.line([S(28), S(H - 30), S(W - 28), S(H - 30)], fill=col, width=max(1, int(S(1))))
    text(d, 28, H - 24, label, F_MONO_XS, fade(FAINT, k))
    text(d, W - 28, H - 24, "elejeune.me", F_MONO_XS, fade(FAINT, k), anchor="ra")


# --------------------------------------------------------------------------
# Post-processing
# --------------------------------------------------------------------------

def bloom(img, radius=7, strength=0.62):
    """Glow, computed small and scaled back up — cheap and smoother than a
    full-resolution blur."""
    small = img.resize((FW // 4, FH // 4), Image.BILINEAR)
    small = ImageChops.subtract(small, Image.new("RGB", small.size, (46, 46, 46)))
    small = small.filter(ImageFilter.GaussianBlur(radius))
    up = small.resize((FW, FH), Image.BILINEAR)
    up = up.point(lambda v: int(v * strength))
    return ImageChops.screen(img, up)


def build_screen_mask():
    """Scanlines and a light vignette, baked into one multiply mask.

    The vignette stays gentle on purpose: the ground is already near-black, so
    anything heavier reads as a smudge rather than a screen.
    """
    m = Image.new("L", (W, H), 255)
    px = m.load()
    cx, cy = W / 2.0, H / 2.0
    maxd = math.hypot(cx, cy)
    for y in range(H):
        scan = 0.84 if (y % 2) else 1.0
        for x in range(W):
            d = math.hypot(x - cx, y - cy) / maxd
            vig = 1.0 - 0.17 * (d ** 2.0)
            px[x, y] = max(0, min(255, int(255 * scan * vig)))
    return Image.merge("RGB", (m, m, m))


def build_scanline_mask():
    """Scanlines with no vignette — for the flash card, where a radial falloff
    across a bright ground is the one place this palette visibly contours."""
    m = Image.new("L", (W, H), 255)
    px = m.load()
    for y in range(H):
        v = 214 if (y % 2) else 255
        for x in range(W):
            px[x, y] = v
    return Image.merge("RGB", (m, m, m))


SCREEN_MASK = build_screen_mask()
SCANLINE_MASK = build_scanline_mask()


def slice_glitch(img, amount, rng, band=14):
    """Horizontal slice displacement + a one-pixel channel split."""
    if amount <= 0:
        return img
    out = img.copy()
    y = 0
    while y < FH:
        h = rng.randint(band, band * 4)
        if rng.random() < 0.45:
            dx = int(rng.uniform(-amount, amount) * SS)
            if dx:
                box = (0, y, FW, min(FH, y + h))
                strip = img.crop(box)
                out.paste(strip, (dx, y))
        y += h
    if amount > 4:
        r, g, b = out.split()
        off = int(max(1, amount * 0.25) * SS)
        r = ImageChops.offset(r, off, 0)
        b = ImageChops.offset(b, -off, 0)
        out = Image.merge("RGB", (r, g, b))
    return out


# --------------------------------------------------------------------------
# Timeline
# --------------------------------------------------------------------------

T_POWER = 0
T_TERM = 11
T_ID = 53
T_SWARM = 95
T_TRAJ = 153
T_SIGN = 191
T_END = 219

CUTS = (T_ID, T_SWARM, T_TRAJ, T_SIGN)


# --------------------------------------------------------------------------
# Content — every string below traces back to site.ts, the profile README,
# or brand/voice.md. Machine register is lowercase; the person is sentence case.
# --------------------------------------------------------------------------

TERM_LINES = [
    # (start, indent, segments[(text, colour)], typed?)
    (0,  0, [("guilyx", MUTED), (" on ", FAINT), ("master", MUTED),
             (" [!?] ", FAINT), ("took 16s", FAINT)], False),
    (3,  0, [("→ ", ACCENT), ("ssh erwin@elejeune.me", BODY)], True),
    (15, 1, [("handshake ", FAINT), ("·"*14, LINE), (" ok", BODY)], False),
    (19, 1, [("locale ", FAINT), ("·"*17, LINE), (" abu dhabi, uae · utc+04", BODY)], False),
    (23, 1, [("stack ", FAINT), ("·"*18, LINE), (" c++ · python · go · rust · ros 2", BODY)], False),
    (29, 0, [("→ ", ACCENT), ("whoami", BODY)], True),
]

SPEC = [
    ("role", "lead architect · robotics & ai systems"),
    ("based", "abu dhabi, uae"),
    ("building", "decentralized swarm autonomy"),
]

TRAJECTORY = [
    (2019.6, "ingeniarius", "robotics"),
    (2020.7, "ecole centrale", "research"),
    (2021.5, "coalescent", "founding eng"),
    (2022.6, "tii", "lead, swarms"),
    (2024.3, "unchained", "agentic ai"),
    (2026.3, "sirb.ai", "lead, autonomy"),
]
TRAJ_T0, TRAJ_T1 = 2018.6, 2026.9


# --------------------------------------------------------------------------
# Scenes
# --------------------------------------------------------------------------

def scene_power(d, f):
    """CRT power-on: a bright line opens vertically into the screen."""
    t = seg(f, 1, 8)
    if t <= 0:
        return
    e = ease_out(t)
    half = max(1.0, e * H * 0.55)
    cy = H / 2.0

    # banded gradient rather than a filled rectangle — a hard edge on the
    # opening band reads as a box, not as a tube warming up
    steps = 30
    for i in range(steps):
        f0 = i / steps
        f1 = (i + 1) / steps
        v = ((1 - f0) ** 2.4) * 0.62 * (1 - e)
        col = mix(BG, HEADING, v)
        if col == BG:
            continue
        d.rectangle([0, S(cy - half * f1), FW, S(cy - half * f0)], fill=col)
        d.rectangle([0, S(cy + half * f0), FW, S(cy + half * f1)], fill=col)

    if t < 0.95:
        lw = max(1, int(S(2.2 * (1 - e) + 0.7)))
        d.line([0, S(cy), FW, S(cy)], fill=mix(HEADING, WHITE, 1 - e), width=lw)


def scene_term(d, f):
    """The handshake. Terminal in the machine register."""
    t = f - T_TERM
    x0, y0 = 54.0, 74.0
    for (start, indent, segments, typed) in TERM_LINES:
        if t < start:
            continue
        row = TERM_LINES.index((start, indent, segments, typed))
        y = y0 + row * (LH + 4)
        x = x0 + indent * CW * 2

        full = "".join(s for s, _ in segments)
        if typed:
            n = int((t - start) * 2.6)
            if n <= 0:
                continue
        else:
            n = len(full)
            # response lines snap in, with a single frame of overshoot
            if t - start < 1:
                n = len(full)

        used = 0
        for s, col in segments:
            if used >= n:
                break
            take = min(len(s), n - used)
            text(d, x + used * CW, y, s[:take], F_MONO, fade(col, 1.0))
            used += take

        # cursor rides the last visible line
        if typed and used < len(full) and (f // 3) % 2 == 0:
            d.rectangle([S(x + used * CW), S(y + 2),
                         S(x + used * CW + CW * 0.85), S(y + LH * 0.82)],
                        fill=fade(BODY, 0.8))

    if t > 38 and (f // 3) % 2 == 0:
        last_y = y0 + (len(TERM_LINES) - 1) * (LH + 4)
        cx = x0 + (2 + len("whoami")) * CW
        d.rectangle([S(cx), S(last_y + 2), S(cx + CW * 0.85), S(last_y + LH * 0.82)],
                    fill=fade(BODY, 0.9))


def scene_identity(d, f):
    """`whoami` answered: the identity card. Display face for the person,
    mono for the machine."""
    t = f - T_ID
    x0 = 54.0

    # name — the person, so display face and sentence case
    if t >= 1:
        text(d, x0, 78, "Erwin Lejeune", F_DISP_XL, HEADING)

    # accent moment for this scene: the rule under the name. Sits clear of the
    # descender on the "j".
    if t >= 5:
        e = ease_out(seg(t, 5, 10))
        d.line([S(x0), S(172), S(x0 + 300 * e), S(172)],
               fill=fade(ACCENT, 0.9), width=max(1, int(S(1.5))))

    # tagline, revealed left to right
    if t >= 7:
        tag = "I make robot swarms think for themselves."
        n = int((t - 7) * 2.2)
        text(d, x0, 190, tag[:n], F_DISP_M, MUTED)

    # spec rows, staggered
    for i, (k, v) in enumerate(SPEC):
        st = 15 + i * 3
        if t < st:
            continue
        a = ease_out(seg(t, st, 5))
        y = 252 + i * 22
        text(d, x0, y, k, F_MONO_S, fade(FAINT, a))
        text(d, x0 + 92, y, v, F_MONO_S, fade(BODY, a))

    if t >= 26:
        draw_mark(d, W - 100, 112, 48, ease_out(seg(t, 26, 8)))


def scene_swarm(d, f, flock, rain):
    """The rain resolves into the thing it was always standing in for."""
    t = f - T_SWARM

    if t >= 2:
        text(d, 54, 52, "→ ", F_MONO, fade(ACCENT, 0.9))
        line = "swarm.spawn(agents=64, leader=none)"
        n = int((t - 2) * 3.0)
        text(d, 54 + 2 * CW, 52, line[:n], F_MONO, BODY)

    # hud
    if t >= 12:
        a = ease_out(seg(t, 12, 8))
        rows = [
            ("agents", "064"),
            ("leader", "none"),
            ("rules", "separation · alignment · cohesion"),
        ]
        for i, (k, v) in enumerate(rows):
            y = H - 110 + i * 17
            text(d, 54, y, k, F_MONO_XS, fade(FAINT, a))
            text(d, 54 + 68, y, v, F_MONO_XS, fade(MUTED, a))

    # the formation resolves; caption lands after it
    if t >= 44:
        a = ease_out(seg(t, 44, 8))
        ctext(d, W / 2, H / 2 + 74, "no leader. the shape is a consequence.",
              F_MONO_S, fade(MUTED, a))
    if t >= 50:
        a = ease_out(seg(t, 50, 6))
        ctext(d, W / 2, H / 2 + 96, "iros 2024 · decentralized acceleration-based flocking",
              F_MONO_XS, fade(FAINT, a * 0.9))


def scene_trajectory(d, f):
    """Experience is called Trajectory here because it is literally one."""
    t = f - T_TRAJ
    ax0, ax1 = 74.0, W - 74.0
    ay = 214.0

    text(d, 54, 54, "→ ", F_MONO, fade(ACCENT, 0.9))
    n = int(max(0, t) * 3.0)
    text(d, 54 + 2 * CW, 54, "trajectory --since 2018"[:n], F_MONO, BODY)

    def px(year):
        return ax0 + (year - TRAJ_T0) / (TRAJ_T1 - TRAJ_T0) * (ax1 - ax0)

    # the path is planned first, then followed
    e = ease_in_out(seg(t, 4, 20))
    if e > 0:
        d.line([S(ax0), S(ay), S(ax0 + (ax1 - ax0) * e), S(ay)],
               fill=fade(LINE, 1.0), width=max(1, int(S(1.4))))

    for i, (year, name, role) in enumerate(TRAJECTORY):
        x = px(year)
        reach = (x - ax0) / (ax1 - ax0)
        if e < reach:
            continue
        # fade in over a fixed beat once the head passes, rather than off the
        # remaining path — the last waypoint has almost no path left and would
        # never resolve to full strength
        a = ease_out(seg(t, 4 + reach * 20, 5))
        up = i % 2 == 0
        stem = 26.0
        d.line([S(x), S(ay), S(x), S(ay - stem if up else ay + stem)],
               fill=fade(LINE, a), width=max(1, int(S(1))))
        r = 3.0
        d.ellipse([S(x - r), S(ay - r), S(x + r), S(ay + r)], fill=fade(MUTED, a))
        ly = ay - stem - 30 if up else ay + stem + 8
        ctext(d, x, ly, name, F_MONO_S, fade(BODY, a))
        ctext(d, x, ly + 15, role, F_MONO_XS, fade(FAINT, a * 0.9))

    # the agent that follows the planned path — accent moment for this scene
    if e > 0.02:
        hx = ax0 + (ax1 - ax0) * e
        d.ellipse([S(hx - 4), S(ay - 4), S(hx + 4), S(ay + 4)], fill=fade(ACCENT, 1.0))

    if t >= 24:
        a = ease_out(seg(t, 24, 8))
        ctext(d, W / 2, H - 66,
              "2,551 hrs tracked · 3,850 contributions in 2026 · 83 public repos",
              F_MONO_XS, fade(FAINT, a))


def scene_sign(d, f):
    t = f - T_SIGN
    cx = W / 2.0

    a = ease_out(seg(t, 1, 8))
    draw_mark(d, cx, 158, 62, a)

    if t >= 5:
        b = ease_out(seg(t, 5, 6))
        ctext(d, cx, 206, "guilyx", F_MONO_XL, fade(HEADING, b))

    if t >= 10:
        b = ease_out(seg(t, 10, 6))
        ctext(d, cx, 256, "Erwin Lejeune — lead architect, robotics & ai systems",
              F_MONO_S, fade(MUTED, b))

    if t >= 14:
        b = ease_out(seg(t, 14, 6))
        w = 210 * b
        d.line([S(cx - w), S(284), S(cx + w), S(284)],
               fill=fade(LINE, b), width=max(1, int(S(1))))

    if t >= 16:
        b = ease_out(seg(t, 16, 6))
        left = "github.com/guilyx"
        right = "elejeune.me"
        gap = 4.0
        total = text_w(left, F_MONO_S) + text_w(" · ", F_MONO_S) + text_w(right, F_MONO_S)
        x = cx - total / 2
        text(d, x, 302, left, F_MONO_S, fade(BODY, b))
        x += text_w(left, F_MONO_S)
        text(d, x, 302, " · ", F_MONO_S, fade(FAINT, b))
        x += text_w(" · ", F_MONO_S)
        text(d, x, 302, right, F_MONO_S, fade(ACCENT, b))
        _ = gap

    if t >= 20 and (f // 3) % 2 == 0:
        half = text_w("guilyx", F_MONO_XL) / 2.0
        cwx = cw(F_MONO_XL)
        x = cx + half + cwx * 0.35
        d.rectangle([S(x), S(214), S(x + cwx * 0.8), S(240)],
                    fill=fade(HEADING, 0.55))


def flash_card(img, f):
    """
    The one hard cut that earns a full-frame beat: `whoami` answered by
    inverting the screen for two frames. A designed invert, not a channel
    flip, so it stays inside the palette.
    """
    t = f - T_ID
    if t not in (-2, -1):
        return None
    ground = HEADING if t == -2 else mix(HEADING, BODY, 0.35)
    card = Image.new("RGB", (FW, FH), ground)
    d = ImageDraw.Draw(card)
    ctext(d, W / 2, H / 2 - 22, "whoami", F_MONO_XL, BG)
    col = mix(ground, BG, 0.55)
    for cx, cy, sx, sy in ((16, 16, 1, 1), (W - 16, 16, -1, 1),
                           (16, H - 16, 1, -1), (W - 16, H - 16, -1, -1)):
        d.line([S(cx), S(cy), S(cx + sx * 26), S(cy)], fill=col, width=max(1, int(S(1))))
        d.line([S(cx), S(cy), S(cx), S(cy + sy * 26)], fill=col, width=max(1, int(S(1))))
    return card


# --------------------------------------------------------------------------
# Render
# --------------------------------------------------------------------------

def render():
    rain = Rain(RNG)
    flock = Flock(64, RNG)
    mark_targets: list[tuple[float, float]] = []
    chosen: list[int] = []
    frames: list[Image.Image] = []

    for f in range(T_END):
        img = Image.new("RGB", (FW, FH), BG)
        d = ImageDraw.Draw(img)

        # ---- rain intensity per scene ---------------------------------
        if f < T_TERM:
            k_rain = seg(f, 5, 8) * 0.30
        elif f < T_ID:
            k_rain = 0.30
        elif f < T_SWARM:
            k_rain = 0.16
        elif f < T_SWARM + 10:
            # the rain hands over to the flock
            k_rain = 0.16 * (1 - seg(f, T_SWARM, 9))
        elif f < T_TRAJ:
            k_rain = 0.0
        elif f < T_SIGN:
            k_rain = 0.07
        else:
            k_rain = 0.10 * (1 - seg(f, T_SIGN + 14, 10))
        rain.step()
        rain.draw(d, k_rain)

        # ---- flock lifecycle ------------------------------------------
        if f == T_SWARM:
            heads = rain.heads()
            RNG.shuffle(heads)
            # Every live rain head becomes an agent; the rest of the flock fills
            # the frame. Spawning the remainder in a strip above the top edge
            # instead makes them descend as one rigid row and they never flock.
            for i in range(flock.n):
                if i < len(heads):
                    flock.spawn(i, heads[i][0], heads[i][1])
                else:
                    flock.spawn(i, RNG.uniform(70, W - 70), RNG.uniform(60, H - 90),
                                falling=False)

        t_sw = f - T_SWARM
        if T_SWARM <= f:
            boost = ease_in_out(seg(t_sw, 30, 12)) if t_sw < 44 else 1.0
            if f >= T_TRAJ:
                boost = 0.0
            flock.step(cohesion_boost=boost * 0.55)

        # three agents settle into the mark
        if t_sw == 34:
            cx, cy = W / 2.0, H / 2.0 - 6
            mark_targets[:] = mark_points(cx, cy, 132)
            live = [i for i in range(flock.n) if flock.alive[i]]
            chosen[:] = []
            for tgt in mark_targets:
                best = min(
                    (i for i in live if i not in chosen),
                    key=lambda i: (flock.pos[i][0] - tgt[0]) ** 2
                    + (flock.pos[i][1] - tgt[1]) ** 2,
                )
                chosen.append(best)

        if chosen and 34 <= t_sw:
            a = ease_in_out(seg(t_sw, 34, 12))
            for i, idx in enumerate(chosen):
                tx, ty = mark_targets[i]
                sx, sy = flock.pos[idx]
                flock.pos[idx] = [sx + (tx - sx) * a * 0.55,
                                  sy + (ty - sy) * a * 0.55]
                flock.trail[idx].append(tuple(flock.pos[idx]))
            # the rest of the flock stands down
            fade_out = seg(t_sw, 38, 10)
            if fade_out >= 1.0:
                for i in range(flock.n):
                    if i not in chosen:
                        flock.alive[i] = False

        # ---- draw the flock -------------------------------------------
        if T_SWARM <= f < T_TRAJ:
            k_flock = ease_out(seg(t_sw, 0, 8))
            if t_sw >= 38:
                others = 1 - seg(t_sw, 38, 10)
            else:
                others = 1.0
            flock.draw_links(d, min(k_flock, others) * ease_out(seg(t_sw, 14, 10)))
            flock.draw(d, k_flock * others)
            if chosen:
                a = ease_in_out(seg(t_sw, 36, 10))
                if a > 0:
                    draw_mark(d, W / 2, H / 2 - 6, 132, a)
        elif f >= T_SIGN:
            pass

        # ---- scene ------------------------------------------------------
        if f < T_TERM:
            scene_power(d, f)
        elif f < T_ID:
            scene_term(d, f)
        elif f < T_SWARM:
            scene_identity(d, f)
        elif f < T_TRAJ:
            scene_swarm(d, f, flock, rain)
        elif f < T_SIGN:
            scene_trajectory(d, f)
        else:
            scene_sign(d, f)

        # ---- chrome -----------------------------------------------------
        if f >= T_ID:
            corner_ticks(d, 0.9)
            labels = {
                T_ID: "identity",
                T_SWARM: "swarm",
                T_TRAJ: "trajectory",
                T_SIGN: "open channel",
            }
            key = max(k for k in labels if k <= f)
            status_bar(d, 0.85, labels[key])

        # ---- glitch on the cuts ----------------------------------------
        amount = 0.0
        for c in CUTS:
            if c <= f < c + 3:
                amount = max(amount, 13.0 * (1 - (f - c) / 3.0))
        if T_ID <= f < T_ID + 6:
            amount = max(amount, 9.0 * (1 - (f - T_ID) / 6.0))
        if amount > 0.3:
            img = slice_glitch(img, amount, RNG)

        # the invert beat replaces the frame wholesale
        card = flash_card(img, f)
        if card is not None:
            img = card

        # ---- post -------------------------------------------------------
        # the flash card skips bloom: it is already at full brightness, and
        # glowing it just rings
        if card is None:
            img = bloom(img)
        small = img.resize((W, H), Image.LANCZOS)
        small = ImageChops.multiply(
            small, SCANLINE_MASK if card is not None else SCREEN_MASK
        )

        # fade out at the tail so the loop reads as a power cycle
        if f >= T_END - 6:
            k = 1 - seg(f, T_END - 6, 6)
            small = ImageChops.multiply(
                small, Image.new("RGB", (W, H), (int(255 * k),) * 3)
            )

        frames.append(small)

        if f % 20 == 0:
            print(f"  frame {f}/{T_END}")

    print("  building palette")
    palette = build_palette(frames)

    print(f"  encoding {len(frames)} frames -> {OUT}")
    quantised = [
        fr.quantize(palette=palette, dither=Image.Dither.NONE) for fr in frames
    ]
    quantised[0].save(
        OUT,
        save_all=True,
        append_images=quantised[1:],
        duration=FRAME_MS,
        loop=0,
        optimize=True,
        disposal=1,
    )
    size = os.path.getsize(OUT)
    print(f"  done: {OUT} ({size / 1024 / 1024:.2f} MB, "
          f"{len(frames)} frames, {len(frames) * FRAME_MS / 1000:.1f}s)")


if __name__ == "__main__":
    render()
