#!/usr/bin/env python3
"""
guilyx — terminal profile promo.

Renders `guilyx-terminal.gif`: a ~24s looping sequence that opens as a terminal,
answers `whoami` with the identity card, ticks a behaviour tree, runs an agent
orchestration graph and lets three of its nodes settle into the mark, traces the
trajectory, and signs off.

The subject is orchestration — behaviour trees, lifecycle, and the graph of
agents above them. Or, in Erwin's own words, the seams: where a planner meets a
controller and a model meets a tool.

Palette, type registers and the accent budget come from guilyx/branding
("Ink & Iris"). The accent is the only saturated value in the system, so it is
spent once per scene and nowhere else. Everything else lives on the neutral
ramp, which is what lets a single accent read as "this is the live path".

Pacing is per frame, not global: motion runs at FRAME_MS and the frames with
something to read hold for up to two seconds (see HOLD_MS). Nothing here is in a
hurry, and the pause in the middle of the joke is the joke.

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
SS = 2                    # supersample headroom, discarded on export
EXPORT = int(os.environ.get("PROMO_EXPORT", "3"))  # delivered = EXPORT x layout
DS = SS * EXPORT          # device scale: everything is drawn at this multiple
FW, FH = W * DS, H * DS   # internal canvas
OW, OH = W * EXPORT, H * EXPORT   # delivered size
FRAME_MS = 90             # 90ms/frame ≈ 11fps for anything that moves

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "guilyx-terminal.gif")
OUT_WEBP = os.path.join(HERE, "guilyx-terminal.webp")

RNG = random.Random(7)    # fixed seed: regeneration is reproducible


def S(v: float) -> float:
    """Logical layout unit -> internal device unit."""
    return v * DS


# --------------------------------------------------------------------------
# Palette — Ink & Iris (guilyx/branding/tokens/tokens.json)
# --------------------------------------------------------------------------

BG      = (0x0d, 0x0e, 0x12)   # ground
RAISED  = (0x15, 0x17, 0x1d)   # cards, panels
LINE    = (0x25, 0x28, 0x33)   # borders, rules
FAINT   = (0x55, 0x5b, 0x69)   # labels, keys
MUTED   = (0x7c, 0x82, 0x91)   # secondary text, resolved nodes
BODY    = (0xa5, 0xaa, 0xb8)   # running text
HEADING = (0xe4, 0xe6, 0xec)   # headings
ACCENT  = (0x8b, 0x95, 0xf0)   # the only saturated value
WHITE   = (0xff, 0xff, 0xff)


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
    return ImageFont.truetype(path, int(round(size * DS)))


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
    return f.getlength("M") / DS


CW = cw(F_MONO)
CW_S = cw(F_MONO_S)
LH = 19.0            # mono line height, logical


def text(d, x, y, s, f, fill, anchor="la"):
    d.text((S(x), S(y)), s, font=f, fill=fill, anchor=anchor)


def text_w(s, f) -> float:
    return f.getlength(s) / DS


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

    COL_W = 17.0
    TRAIL = 13

    def __init__(self, rng):
        self.rng = rng
        self.ncols = int(W / self.COL_W) + 1
        self.y = [rng.uniform(-H, 0) for _ in range(self.ncols)]
        self.speed = [rng.uniform(1.8, 5.0) for _ in range(self.ncols)]
        self.on = [rng.random() < 0.5 for _ in range(self.ncols)]
        self.chars = [
            [rng.choice(GLYPHS) for _ in range(self.TRAIL)] for _ in range(self.ncols)
        ]

    def step(self):
        for i in range(self.ncols):
            self.y[i] += self.speed[i]
            if self.y[i] > H + self.TRAIL * LH:
                self.y[i] = self.rng.uniform(-H * 0.6, -20)
                self.speed[i] = self.rng.uniform(1.8, 5.0)
                self.on[i] = self.rng.random() < 0.6
            # glyphs mutate rarely: a column that reshuffles every frame is
            # just noise, and noise is what makes the whole thing feel busy
            if self.rng.random() < 0.06:
                self.chars[i][self.rng.randrange(self.TRAIL)] = self.rng.choice(GLYPHS)

    def heads(self):
        """Live head positions. Kept for callers that seed off the rain."""
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
# Behaviour tree
#
# Real notation and real tick semantics: a sequence ticks its children in order,
# a fallback returns as soon as one child succeeds, a parallel keeps its children
# running together. The statuses below are what this tree actually returns —
# `return home` is never reached because `battery ok` succeeds first.
# --------------------------------------------------------------------------

BT_H = 24.0

BT_NODES = {
    "root":    (440.0, 100.0, "\u2192", "sequence"),
    "guard":   (270.0, 172.0, "?", "fallback"),
    "run":     (610.0, 172.0, "\u21c9", "parallel"),
    "battery": (185.0, 244.0, "\u25cb", "battery ok"),
    "rtl":     (355.0, 244.0, "\u25b8", "return home"),
    "track":   (525.0, 244.0, "\u25b8", "track target"),
    "stream":  (695.0, 244.0, "\u25b8", "stream tlm"),
}

BT_EDGES = [
    ("root", "guard"), ("root", "run"),
    ("guard", "battery"), ("guard", "rtl"),
    ("run", "track"), ("run", "stream"),
]

# (node, frame it resolves, status). `rtl` never resolves — it is not ticked.
BT_TICK = [
    ("root", 18, "running"),
    ("guard", 20, "success"),
    ("battery", 22, "success"),
    ("guard", 24, "success"),
    ("run", 26, "running"),
    ("track", 28, "running"),
    ("stream", 30, "running"),
]

# which level each node sits on, for the staggered draw-in
BT_LEVEL = {"root": 0, "guard": 1, "run": 1,
            "battery": 2, "rtl": 2, "track": 2, "stream": 2}


def bt_status(node, t):
    """Status of `node` at local frame `t`, per the tick schedule."""
    out = "idle"
    for name, frame, status in BT_TICK:
        if name == node and t >= frame:
            out = status
    return out


def bt_node_box(node):
    x, y, glyph, label = BT_NODES[node]
    w = text_w(f"{glyph} {label}", F_MONO_XS) + 20.0
    return x - w / 2, y - BT_H / 2, x + w / 2, y + BT_H / 2


def draw_bt_node(d, node, t, k):
    if k <= 0.01:
        return
    x, y, glyph, label = BT_NODES[node]
    x0, y0, x1, y1 = bt_node_box(node)
    st = bt_status(node, t)
    if st == "running":
        border, ink = ACCENT, HEADING
    elif st == "success":
        border, ink = MUTED, BODY
    else:
        border, ink = LINE, FAINT
    d.rounded_rectangle([S(x0), S(y0), S(x1), S(y1)], radius=S(3),
                        fill=fade(RAISED, k * 0.9), outline=fade(border, k),
                        width=max(1, int(S(1))))
    text(d, x, y - 5.5, f"{glyph} {label}", F_MONO_XS, fade(ink, k), anchor="ma")


def draw_bt_edge(d, parent, child, t, k):
    if k <= 0.01:
        return
    px, py, _, _ = BT_NODES[parent]
    cx, cy, _, _ = BT_NODES[child]
    top = cy - BT_H / 2
    bot = py + BT_H / 2
    mid = (bot + top) / 2
    # the edge carries the child's status: a running branch reads all the way up
    st = bt_status(child, t)
    col = ACCENT if st == "running" else (MUTED if st == "success" else LINE)
    strength = k * (1.0 if st != "idle" else 0.85)
    d.line([S(px), S(bot), S(px), S(mid), S(cx), S(mid), S(cx), S(top)],
           fill=fade(col, strength), width=max(1, int(S(1))), joint="curve")


# --------------------------------------------------------------------------
# Agent orchestration graph
#
# Kymatics, in one picture: fleets of agents coordinated the way you would
# orchestrate services. Messages travel the edges; the nodes are the seams.
# --------------------------------------------------------------------------

GRAPH_NODES = [
    ("planner", 236.0, 140.0),
    ("perception", 158.0, 258.0),
    ("navigation", 348.0, 318.0),
    ("mission", 528.0, 132.0),
    ("telemetry", 712.0, 232.0),
    ("operator", 588.0, 330.0),
]

GRAPH_EDGES = [(0, 1), (0, 2), (0, 3), (1, 2), (3, 4), (3, 5), (4, 5), (2, 5)]

# the three that stay and become the mark
GRAPH_KEEP = (0, 3, 2)


def draw_graph(d, t, k, positions, alive):
    """Nodes, edges and the packets moving between them."""
    if k <= 0.01:
        return
    for ei, (a, b) in enumerate(GRAPH_EDGES):
        if not (alive[a] and alive[b]):
            continue
        ax, ay = positions[a]
        bx, by = positions[b]
        d.line([S(ax), S(ay), S(bx), S(by)], fill=fade(LINE, k),
               width=max(1, int(S(1))))
        # packets: a model meeting a tool, repeatedly
        if t >= 12:
            for slot in range(2):
                phase = ((t - 12) * 0.055 + ei * 0.17 + slot * 0.5) % 1.0
                mx = ax + (bx - ax) * phase
                my = ay + (by - ay) * phase
                r = 2.0
                d.ellipse([S(mx - r), S(my - r), S(mx + r), S(my + r)],
                          fill=fade(MUTED, k * 0.9))

    for i, (label, _, _) in enumerate(GRAPH_NODES):
        if not alive[i]:
            continue
        x, y = positions[i]
        r = 4.5
        # one accent moment for this scene: the node the orchestration runs from
        col = ACCENT if i == 0 else BODY
        d.ellipse([S(x - r), S(y - r), S(x + r), S(y + r)], fill=fade(col, k))
        text(d, x, y + 11, label, F_MONO_XS, fade(MUTED, k * 0.95), anchor="ma")


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

def bloom(img, radius=7 * EXPORT, strength=0.55):
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
    m = Image.new("L", (OW, OH), 255)
    px = m.load()
    cx, cy = OW / 2.0, OH / 2.0
    maxd = math.hypot(cx, cy)
    for y in range(OH):
        scan = 0.88 if ((y // EXPORT) % 2) else 1.0
        for x in range(OW):
            d = math.hypot(x - cx, y - cy) / maxd
            vig = 1.0 - 0.14 * (d ** 2.0)
            px[x, y] = max(0, min(255, int(255 * scan * vig)))
    return Image.merge("RGB", (m, m, m))


def build_scanline_mask():
    """Scanlines with no vignette — for the flash card, where a radial falloff
    across a bright ground is the one place this palette visibly contours."""
    m = Image.new("L", (OW, OH), 255)
    px = m.load()
    for y in range(OH):
        v = 214 if ((y // EXPORT) % 2) else 255
        for x in range(OW):
            px[x, y] = v
    return Image.merge("RGB", (m, m, m))


SCREEN_MASK = build_screen_mask()
SCANLINE_MASK = build_scanline_mask()


def slice_glitch(img, amount, rng, band=14 * DS // 2):
    """Horizontal slice displacement + a one-pixel channel split."""
    if amount <= 0:
        return img
    out = img.copy()
    y = 0
    while y < FH:
        h = rng.randint(band, band * 4)
        if rng.random() < 0.45:
            dx = int(rng.uniform(-amount, amount) * DS)
            if dx:
                box = (0, y, FW, min(FH, y + h))
                strip = img.crop(box)
                out.paste(strip, (dx, y))
        y += h
    if amount > 4:
        r, g, b = out.split()
        off = int(max(1, amount * 0.25) * DS)
        r = ImageChops.offset(r, off, 0)
        b = ImageChops.offset(b, -off, 0)
        out = Image.merge("RGB", (r, g, b))
    return out


# --------------------------------------------------------------------------
# Timeline
# --------------------------------------------------------------------------

T_POWER = 0
T_TERM = 11
T_ID = 35
T_JOKE = 60
T_BT = 82
T_GRAPH = 120
T_TRAJ = 152
T_SIGN = 174
T_END = 193

CUTS = (T_ID, T_JOKE, T_BT, T_GRAPH, T_TRAJ, T_SIGN)

# Frames that hold, and for how long.
#
# GIF delays are per frame, so the piece does not have to pick one speed. The
# graph and the typing run at FRAME_MS because they are motion; the frames where
# there is something to *read* sit still for a beat instead. The rain and the
# graph are frozen on a hold, so the pause reads as deliberate rather than as a
# dropped frame — and an unchanged frame costs almost nothing to encode.
HOLD_MS = {
    T_ID - 2: 400, T_ID - 1: 400,                       # after `whoami`
    T_JOKE - 3: 380, T_JOKE - 2: 380, T_JOKE - 1: 380,  # the identity card
    # the joke: a long beat where it still looks like an error, then the answer
    T_JOKE + 16: 460, T_JOKE + 17: 460,
    T_BT - 3: 480, T_BT - 2: 480, T_BT - 1: 480,
    T_GRAPH - 2: 480, T_GRAPH - 1: 480,                 # the ticked tree
    T_TRAJ - 2: 480, T_TRAJ - 1: 480,                   # the mark
    T_SIGN - 2: 400, T_SIGN - 1: 400,                   # the trajectory
    T_END - 7: 480, T_END - 6: 480,                      # sign-off, before fade
}


# --------------------------------------------------------------------------
# Content — every string below traces back to site.ts, the profile README,
# or brand/voice.md. Machine register is lowercase; the person is sentence case.
# --------------------------------------------------------------------------

TERM_LINES = [
    # (start, indent, segments[(text, colour)], typed?)
    (0,  0, [("guilyx", MUTED), (" on ", FAINT), ("master", MUTED),
             (" [!?] ", FAINT), ("took 16s", FAINT)], False),
    (2,  0, [("→ ", ACCENT), ("ssh erwin@elejeune.me", BODY)], True),
    (17, 1, [("handshake ", FAINT), ("·" * 14, LINE), (" ok", BODY)], False),
    (20, 1, [("locale ", FAINT), ("·" * 17, LINE),
             (" abu dhabi, uae · utc+04", BODY)], False),
    (22, 0, [("→ ", ACCENT), ("whoami", BODY)], True),
]

# The joke, and it is true — it is his own line from v4's about copy: "my agents
# get tools instead of instructions". Brand voice allows exactly one joke and it
# has to be true, so this is the one, and it sets up the graph scene after it.
JOKE_LINES = [
    (0,  0, [("guilyx", MUTED), (" on ", FAINT), ("master", MUTED),
             (" [!?]", FAINT)], False),
    (2,  0, [("→ ", ACCENT), ("agent --instructions", BODY)], True),
    (15, 1, [("error: agents take tools,", BODY)], False),
    (18, 1, [("not instructions.", MUTED)], False),
]

# Every value below is lifted from v4's site.ts — the role line, the location,
# the TII bullet on behaviour orchestration and lifecycle management, and the
# Unchained/Kymatics work on agentic orchestration.
SPEC = [
    ("role", "lead architect · robotics & ai systems"),
    ("based", "abu dhabi, uae"),
    ("building", "behaviour orchestration · autonomy stacks"),
    ("also", "agentic ai orchestration · mcp"),
]

TRAJECTORY = [
    (2019.6, "ingeniarius", "robotics"),
    (2020.7, "ecole centrale", "research"),
    (2021.5, "coalescent", "founding eng"),
    (2022.6, "tii", "lead, autonomy"),
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


CPS = 1.7          # characters per frame while typing — deliberate, not frantic


def _cursor(d, x, y, f, k=0.85):
    if (f // 4) % 2 == 0:
        d.rectangle([S(x), S(y + 2), S(x + CW * 0.85), S(y + LH * 0.82)],
                    fill=fade(BODY, k))


def draw_terminal(d, f, t, lines, y0=74.0, tail_from=None):
    """Render a terminal block. `tail_from` blinks a cursor at the end of the
    last line once the local clock passes it."""
    x0 = 54.0
    last_x = last_y = None
    for row, (start, indent, segments, typed) in enumerate(lines):
        if t < start:
            continue
        y = y0 + row * (LH + 4)
        x = x0 + indent * CW * 2
        full = "".join(s for s, _ in segments)
        n = int((t - start) * CPS) if typed else len(full)
        if n <= 0:
            continue

        used = 0
        for s, col in segments:
            if used >= n:
                break
            take = min(len(s), n - used)
            text(d, x + used * CW, y, s[:take], F_MONO, fade(col, 1.0))
            used += take
        last_x, last_y = x + used * CW, y

        # cursor rides whichever line is still being typed
        if typed and used < len(full):
            _cursor(d, x + used * CW, y, f, 0.8)
            return

    if tail_from is not None and t >= tail_from and last_x is not None:
        _cursor(d, last_x, last_y, f, 0.9)


def scene_term(d, f):
    """The handshake. Terminal in the machine register."""
    draw_terminal(d, f, f - T_TERM, TERM_LINES, tail_from=27)


def scene_joke(d, f):
    """`agent --instructions`. The pause before the answer is the joke."""
    draw_terminal(d, f, f - T_JOKE, JOKE_LINES, y0=172.0, tail_from=20)


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
    if t >= 3:
        e = ease_out(seg(t, 3, 8))
        d.line([S(x0), S(172), S(x0 + 300 * e), S(172)],
               fill=fade(ACCENT, 0.9), width=max(1, int(S(1.5))))

    # tagline — his own framing of the work, from the v4 about copy: the seams
    if t >= 5:
        n = int((t - 5) * 3.4)
        l1 = "Where a planner meets a controller."
        l2 = "Where a model meets a tool."
        text(d, x0, 188, l1[:n], F_DISP_M, MUTED)
        if n > len(l1):
            text(d, x0, 214, l2[:n - len(l1)], F_DISP_M, MUTED)

    # spec rows, staggered
    for i, (k, v) in enumerate(SPEC):
        st = 11 + i * 2
        if t < st:
            continue
        a = ease_out(seg(t, st, 5))
        y = 258 + i * 19
        text(d, x0, y, k, F_MONO_S, fade(FAINT, a))
        text(d, x0 + 92, y, v, F_MONO_S, fade(BODY, a))

    if t >= 17:
        draw_mark(d, W - 100, 112, 48, ease_out(seg(t, 17, 5)))


def scene_bt(d, f):
    """A behaviour tree, ticked. Behaviour orchestration is the day job."""
    t = f - T_BT

    if t >= 1:
        text(d, 54, 52, "\u2192 ", F_MONO, fade(ACCENT, 0.9))
        n = int((t - 1) * 1.9)
        text(d, 54 + 2 * CW, 52, "bt tick --mission patrol"[:n], F_MONO, BODY)

    # the tree draws in a level at a time, edges with their child
    for parent, child in BT_EDGES:
        k = ease_out(seg(t, 6 + BT_LEVEL[child] * 3, 5))
        draw_bt_edge(d, parent, child, t, k)
    for node in BT_NODES:
        k = ease_out(seg(t, 6 + BT_LEVEL[node] * 3, 5))
        draw_bt_node(d, node, t, k)

    if t >= 32:
        a = ease_out(seg(t, 32, 5))
        ctext(d, W / 2, 312, "the tick descends. the leaves answer.",
              F_MONO_S, fade(MUTED, a))
    if t >= 34:
        a = ease_out(seg(t, 34, 4))
        ctext(d, W / 2, 334, "behaviour orchestration \u00b7 lifecycle management",
              F_MONO_XS, fade(FAINT, a * 0.9))

    # readout, in the machine register
    if t >= 20:
        a = ease_out(seg(t, 20, 6))
        rows = [
            ("tick", "0042"),
            ("nodes", "7 \u00b7 1 not reached"),
            ("status", "running"),
        ]
        for i, (k, v) in enumerate(rows):
            y = H - 96 + i * 15
            text(d, 54, y, k, F_MONO_XS, fade(FAINT, a))
            text(d, 54 + 54, y, v, F_MONO_XS, fade(MUTED, a))


def scene_graph(d, f, positions, alive):
    """The layer above: agents coordinated the way you'd orchestrate services."""
    t = f - T_GRAPH

    if t >= 1:
        text(d, 54, 52, "\u2192 ", F_MONO, fade(ACCENT, 0.9))
        n = int((t - 1) * 1.9)
        text(d, 54 + 2 * CW, 52, "orchestrate agents"[:n], F_MONO, BODY)

    draw_graph(d, t, ease_out(seg(t, 5, 6)), positions, alive)

    if t >= 24:
        a = ease_out(seg(t, 24, 5))
        ctext(d, W / 2, 314, "a model meets a tool. that seam is the work.",
              F_MONO_S, fade(MUTED, a))
    if t >= 27:
        a = ease_out(seg(t, 27, 4))
        ctext(d, W / 2, 336, "kymatics \u00b7 agentic orchestration \u00b7 mcp",
              F_MONO_XS, fade(FAINT, a * 0.9))


def scene_trajectory(d, f):
    """Experience is called Trajectory here because it is literally one."""
    t = f - T_TRAJ
    ax0, ax1 = 74.0, W - 74.0
    ay = 214.0

    text(d, 54, 54, "→ ", F_MONO, fade(ACCENT, 0.9))
    n = int(max(0, t) * 2.4)
    text(d, 54 + 2 * CW, 54, "trajectory --since 2018"[:n], F_MONO, BODY)

    def px(year):
        return ax0 + (year - TRAJ_T0) / (TRAJ_T1 - TRAJ_T0) * (ax1 - ax0)

    # the path is planned first, then followed
    e = ease_in_out(seg(t, 3, 16))
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
        a = ease_out(seg(t, 3 + reach * 16, 4))
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

    if t >= 20:
        a = ease_out(seg(t, 20, 6))
        ctext(d, W / 2, H - 66,
              "2,551 hrs tracked · 3,850 contributions in 2026 · 83 public repos",
              F_MONO_XS, fade(FAINT, a))


def scene_sign(d, f):
    t = f - T_SIGN
    cx = W / 2.0

    a = ease_out(seg(t, 1, 5))
    draw_mark(d, cx, 158, 62, a)

    if t >= 3:
        b = ease_out(seg(t, 3, 4))
        ctext(d, cx, 206, "guilyx", F_MONO_XL, fade(HEADING, b))

    if t >= 5:
        b = ease_out(seg(t, 5, 4))
        ctext(d, cx, 256, "Erwin Lejeune — lead architect, robotics & ai systems",
              F_MONO_S, fade(MUTED, b))

    if t >= 7:
        b = ease_out(seg(t, 7, 3))
        w = 210 * b
        d.line([S(cx - w), S(284), S(cx + w), S(284)],
               fill=fade(LINE, b), width=max(1, int(S(1))))

    if t >= 9:
        b = ease_out(seg(t, 9, 3))
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

    if t >= 11 and (f // 4) % 2 == 0:
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
    frames: list[Image.Image] = []
    durations: list[int] = []

    # graph node positions, mutated when three of them collapse into the mark
    positions = [[x, y] for (_, x, y) in GRAPH_NODES]
    home = [(x, y) for (_, x, y) in GRAPH_NODES]
    alive = [True] * len(GRAPH_NODES)
    mark_targets = mark_points(W / 2.0, 196.0, 124.0)

    for f in range(T_END):
        frozen = f in HOLD_MS
        durations.append(HOLD_MS.get(f, FRAME_MS))
        img = Image.new("RGB", (FW, FH), BG)
        d = ImageDraw.Draw(img)

        # ---- rain intensity per scene ---------------------------------
        if f < T_TERM:
            k_rain = seg(f, 5, 8) * 0.17
        elif f < T_ID:
            k_rain = 0.17
        elif f < T_JOKE:
            k_rain = 0.10
        elif f < T_BT:
            k_rain = 0.12
        elif f < T_BT + 8:
            # the rain gets out of the way of the diagram
            k_rain = 0.12 * (1 - seg(f, T_BT, 7))
        elif f < T_TRAJ:
            k_rain = 0.0
        elif f < T_SIGN:
            k_rain = 0.05
        else:
            k_rain = 0.07 * (1 - seg(f, T_SIGN + 8, 8))
        if not frozen:
            rain.step()
        rain.draw(d, k_rain)

        # ---- three graph nodes settle into the mark --------------------
        t_gr = f - T_GRAPH
        if T_GRAPH <= f:
            a = ease_in_out(seg(t_gr, 22, 8))
            for slot, idx in enumerate(GRAPH_KEEP):
                hx, hy = home[idx]
                tx, ty = mark_targets[slot]
                positions[idx] = [hx + (tx - hx) * a, hy + (ty - hy) * a]
            for i in range(len(alive)):
                alive[i] = i in GRAPH_KEEP or seg(t_gr, 22, 6) < 1.0
            if a >= 1.0:
                for i in range(len(alive)):
                    alive[i] = False

        if T_GRAPH <= f < T_TRAJ:
            k_mark = ease_in_out(seg(t_gr, 24, 8))
            if k_mark > 0:
                draw_mark(d, W / 2, 196.0, 124.0, k_mark)

        # ---- scene ------------------------------------------------------
        if f < T_TERM:
            scene_power(d, f)
        elif f < T_ID:
            scene_term(d, f)
        elif f < T_JOKE:
            scene_identity(d, f)
        elif f < T_BT:
            scene_joke(d, f)
        elif f < T_GRAPH:
            scene_bt(d, f)
        elif f < T_TRAJ:
            scene_graph(d, f, positions, alive)
        elif f < T_SIGN:
            scene_trajectory(d, f)
        else:
            scene_sign(d, f)

        # ---- chrome -----------------------------------------------------
        if f >= T_ID:
            corner_ticks(d, 0.9)
            labels = {
                T_ID: "identity",
                T_JOKE: "agents",
                T_BT: "behaviour tree",
                T_GRAPH: "orchestration",
                T_TRAJ: "trajectory",
                T_SIGN: "open channel",
            }
            key = max(k for k in labels if k <= f)
            status_bar(d, 0.85, labels[key])

        # ---- glitch on the cuts ----------------------------------------
        amount = 0.0
        for c in CUTS:
            if c <= f < c + 2:
                amount = max(amount, 6.0 * (1 - (f - c) / 2.0))
        if T_ID <= f < T_ID + 4:
            amount = max(amount, 4.5 * (1 - (f - T_ID) / 4.0))
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
        small = img.resize((OW, OH), Image.LANCZOS)
        small = ImageChops.multiply(
            small, SCANLINE_MASK if card is not None else SCREEN_MASK
        )

        # fade out at the tail so the loop reads as a power cycle
        if f >= T_END - 5:
            k = 1 - seg(f, T_END - 5, 5)
            small = ImageChops.multiply(
                small, Image.new("RGB", (OW, OH), (int(255 * k),) * 3)
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
        duration=durations,
        loop=0,
        optimize=True,
        disposal=1,
    )

    # The same sequence in full colour. GIF caps at 256 entries, and on a piece
    # that is mostly one long ramp out of near-black that ceiling — not the
    # resolution — is what shows as banding around the glow.
    print(f"  encoding {len(frames)} frames -> {OUT_WEBP}")
    frames[0].save(
        OUT_WEBP,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        quality=90,
        method=4,
    )

    for path in (OUT, OUT_WEBP):
        size = os.path.getsize(path)
        print(f"  done: {path} ({OW}x{OH}, {size / 1024 / 1024:.2f} MB, "
              f"{len(frames)} frames, {sum(durations) / 1000:.1f}s)")


if __name__ == "__main__":
    render()
