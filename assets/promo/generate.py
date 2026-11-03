#!/usr/bin/env python3
"""
guilyx — terminal profile promo.

Renders `guilyx-terminal.gif` (and a full-colour `.webp` of the same loop): an
identity card, a joke, three systems from the portfolio, the career so far,
and a `whoami` that lands back on the card.

Nothing here is hand-copied from elsewhere any more. Three steps, each owning
one kind of input:

    sync.mjs     v4's site.ts + palette   ->  data/profile.json   (committed)
    capture.mjs  v4's Systems scenes      ->  .frames/            (gitignored)
    generate.py  both of the above        ->  the gif and the webp

The copy — name, role, tagline, the spec block, the chapters, each system's
headline — comes from profile.json, which sync.mjs reads out of v4's
`src/data/site.ts`. The three systems are v4's own canvas scenes, rendered
frame by frame by capture.mjs. The palette and the brand faces come from v4
as well. When the site changes, the promo is three commands away from
matching it, and never drifts in between.

What this file still owns is the part that is the promo's own: the terminal,
the joke, the identity card and the order things happen in.

Two rules shaped the timeline:

- **Frame 0 is the card.** It is what loads first, and what GitHub shows when
  animated images are paused (reduced motion, or autoplay turned off). So the
  loop opens on a finished identity card, not on a black screen.
- **`whoami` sits at the seam.** The power cycle, the ssh handshake and the
  `whoami` come at the *end*; the card that answers it resolves into exactly
  frame 0, so the loop closes without a jump.

Pacing is derived from the frame, not hand-tuned: `text()` counts the legible
characters it draws, a frame that puts new words on screen gets longer than one
that only moves, and a held frame is scaled by how much there is on it to read.

Deps: pillow >= 10. Run sync.mjs and capture.mjs first (see README).
"""

from __future__ import annotations

import json
import math
import os
import random
import sys
from dataclasses import dataclass, field
from typing import Callable

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FRAMES = os.path.join(HERE, ".frames")
OUT = os.path.join(HERE, "guilyx-terminal.gif")
OUT_WEBP = os.path.join(HERE, "guilyx-terminal.webp")

# --------------------------------------------------------------------------
# Inputs
# --------------------------------------------------------------------------

PROFILE = json.load(open(os.path.join(HERE, "data", "profile.json")))
_manifest = os.path.join(FRAMES, "manifest.json")
if not os.path.exists(_manifest):
    sys.exit("no .frames/ — run capture.mjs first:\n"
             "  node assets/promo/capture.mjs --v4 <path to a guilyx/v4 checkout>")
MANIFEST = json.load(open(_manifest))
if MANIFEST["source"]["commit"] != PROFILE["source"]["commit"]:
    sys.exit("profile.json and .frames/ come from different v4 commits — re-run capture.mjs")

# --------------------------------------------------------------------------
# Canvas
# --------------------------------------------------------------------------

W, H = 880, 480           # layout units; 2:1 for the scenes, with a band above them
SS = 2                    # supersample headroom for Pillow's drawing, discarded on export
EXPORT = MANIFEST["export"]   # the captured scenes fix this; the chrome follows them
DS = SS * EXPORT          # device scale: Pillow draws at this multiple
FW, FH = W * DS, H * DS
OW, OH = W * EXPORT, H * EXPORT

# where the captured scenes sit, in layout units
SCENE = (60, 58, MANIFEST["scene"]["w"], MANIFEST["scene"]["h"])

# Pillow's beats are authored against a "layout frame" clock; Q subdivides it.
# A captured scene frame is one sub-frame, shown for 1000/fps of its shot.
Q = 2
MOTION_MS = 40            # per sub-frame: 25fps while something is only moving
READ_MS = 50              # per sub-frame while new words are landing
HOLD_SCALE = 1.95         # a frame being read holds about twice its base

INK_REF = 95.0
INK_MIN, INK_MAX = 0.8, 1.7

RNG = random.Random(7)    # fixed seed: regeneration is reproducible


def read_time(chars: int) -> float:
    return max(INK_MIN, min(INK_MAX, chars / INK_REF))


def S(v: float) -> float:
    """Layout unit -> internal device unit."""
    return v * DS


# --------------------------------------------------------------------------
# Palette — read from v4, which matches guilyx/branding's tokens
# --------------------------------------------------------------------------

def _hex(h: str) -> tuple[int, int, int]:
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


_P = {k: _hex(v) for k, v in PROFILE["palette"].items()}
BG, RAISED, LINE = _P["bg"], _P["raised"], _P["line"]
FAINT, MUTED, BODY, HEADING = _P["faint"], _P["muted"], _P["body"], _P["heading"]
ACCENT = _P["accent"]
OK, WARN, FAIL = _P["ok"], _P["warn"], _P["fail"]
WHITE = (0xff, 0xff, 0xff)


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def fade(c, t):
    """Fade a colour toward the ground. t=1 is full strength."""
    return mix(BG, c, t)


def ramp(a, b, n):
    return [mix(a, b, k / (n - 1)) for k in range(n)]


def brand_colours():
    """
    Values the palette must reproduce exactly: the neutrals, the accent, and
    the status colours the scenes use. Quantisation drift shows first on the
    saturated ones.
    """
    cols: list[tuple[int, int, int]] = []
    cols += ramp((0, 0, 0), BG, 4)
    cols += ramp(BG, LINE, 6)
    cols += ramp(LINE, FAINT, 5)
    cols += ramp(FAINT, MUTED, 4)
    cols += ramp(MUTED, BODY, 4)
    cols += ramp(BODY, HEADING, 4)
    cols += ramp(BG, ACCENT, 8)
    for c in (OK, WARN, FAIL):
        cols += ramp(BG, c, 5)
    # the flash card: a bright ground in a piece that is otherwise near-black
    cols += ramp(mix(BG, HEADING, 0.5), WHITE, 14)
    cols += [RAISED, ACCENT, HEADING, MUTED, FAINT, LINE, BG, WHITE, OK, WARN, FAIL]
    return cols


def build_palette(frames_rgb):
    """
    One palette for every frame, so the encoder can delta-code between them:
    derived from the frames themselves, then topped up with the brand values.
    """
    tw, th = W // 4, H // 4
    tiles = [f.resize((tw, th), Image.BILINEAR) for f in frames_rgb[::2]]
    cols_n = 12
    rows_n = math.ceil(len(tiles) / cols_n)
    mont = Image.new("RGB", (cols_n * tw, rows_n * th), BG)
    for i, t in enumerate(tiles):
        mont.paste(t, ((i % cols_n) * tw, (i // cols_n) * th))

    n_adaptive = 190
    adaptive = mont.quantize(colors=n_adaptive, method=Image.Quantize.MEDIANCUT)
    raw = adaptive.getpalette()[: n_adaptive * 3]
    cols = [tuple(raw[i:i + 3]) for i in range(0, len(raw), 3)] + brand_colours()

    seen, uniq = set(), []
    for c in cols:
        if c not in seen:
            seen.add(c)
            uniq.append(c)
    uniq = uniq[:256]
    flat = [v for c in uniq for v in c] + [0, 0, 0] * (256 - len(uniq))
    pal = Image.new("P", (1, 1))
    pal.putpalette(flat)
    return pal


# --------------------------------------------------------------------------
# Type — the brand faces, from v4's @fontsource packages
#   lowercase mono         = the machine talking   (JetBrains Mono)
#   sentence-case display  = the person            (Space Grotesk)
# --------------------------------------------------------------------------

_FONTS = os.path.join(FRAMES, "fonts")
_FALLBACK_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
_FALLBACK_SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


@dataclass(frozen=True)
class Face:
    """A sized font plus the font that covers what its subset doesn't."""
    main: ImageFont.FreeTypeFont
    fallback: ImageFont.FreeTypeFont


def face(name: str, size: float, weight: int | None = None, fallback=_FALLBACK_MONO) -> Face:
    px = int(round(size * DS))
    f = ImageFont.truetype(os.path.join(_FONTS, f"{name}.woff2"), px)
    if weight is not None:
        f.set_variation_by_axes([weight])
    return Face(f, ImageFont.truetype(fallback, px))


F_MONO_XS = face("mono-400", 10)
F_MONO_S = face("mono-400", 12)
F_MONO = face("mono-400", 13.5)
F_MONO_L = face("mono-400", 16)
F_MONO_XL = face("mono-700", 30)
F_DISP_XL = face("display", 56, 700, _FALLBACK_SANS)
F_DISP_HEAD = face("display", 19, 500, _FALLBACK_SANS)
F_DISP_M = face("display", 23, 400, _FALLBACK_SANS)
F_DISP_S = face("display", 19, 400, _FALLBACK_SANS)
_rain_font = ImageFont.truetype(_FALLBACK_MONO, int(round(12 * DS)))
F_RAIN = Face(_rain_font, _rain_font)


def cw(f: Face) -> float:
    """Advance width of one monospace cell, in layout units."""
    return f.main.getlength("M") / DS


CW = cw(F_MONO)
LH = 19.0            # mono line height, layout units

# The brand fonts ship as latin subsets, which leave out a few glyphs this file
# draws — `→` most of all. The browser falls back per glyph on the site; this
# does the same, so a missing glyph never renders as a box.
_covers: dict[tuple[int, str], bool] = {}


def _glyph(font, ch):
    im = Image.new("L", (font.size * 2, font.size * 2), 0)
    ImageDraw.Draw(im).text((font.size // 2, 0), ch, font=font, fill=255)
    return im.tobytes()


def covers(font, ch: str) -> bool:
    key = (id(font), ch)
    if key not in _covers:
        _covers[key] = ch.isspace() or _glyph(font, ch) != _glyph(font, "")
    return _covers[key]


def runs(s: str, f: Face):
    """Split `s` into stretches that one font can draw."""
    out: list[tuple[str, ImageFont.FreeTypeFont]] = []
    for ch in s:
        fnt = f.main if covers(f.main, ch) else f.fallback
        if out and out[-1][1] is fnt:
            out[-1] = (out[-1][0] + ch, fnt)
        else:
            out.append((ch, fnt))
    return out


def text_w(s: str, f: Face) -> float:
    return sum(fnt.getlength(r) for r, fnt in runs(s, f)) / DS


# How much legible text a frame carries — what the pacing is derived from.
# The rain is texture and is never counted.
_ink = 0
_reading = True
_INK_FLOOR = 60


def ink() -> int:
    return _ink


def reset_ink() -> None:
    global _ink
    _ink = 0


def text(d, x, y, s, f: Face, fill, anchor="la"):
    """Draw `s` with its top at y; anchor l/m/r is the horizontal alignment."""
    global _ink
    if not s:
        return
    if _reading and sum(fill) / 3.0 >= _INK_FLOOR:
        _ink += len(s.strip())
    parts = runs(s, f)
    if len(parts) == 1 and parts[0][1] is f.main:
        d.text((S(x), S(y)), s, font=f.main, fill=fill, anchor=anchor)
        return
    # mixed fonts: lay the runs along the main face's baseline
    total = sum(fnt.getlength(r) for r, fnt in parts)
    px = S(x) - {"l": 0, "m": total / 2, "r": total}[anchor[0]]
    base = S(y) + f.main.getmetrics()[0]
    for r, fnt in parts:
        d.text((px, base), r, font=fnt, fill=fill, anchor="ls")
        px += fnt.getlength(r)


def ctext(d, cx, y, s, f: Face, fill):
    text(d, cx, y, s, f, fill, anchor="ma")


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


def seg(t, start, length):
    """Local progress 0..1 of a beat starting at `start` and lasting `length`."""
    return clamp01((t - start) / float(length))


# --------------------------------------------------------------------------
# Glyph rain — hex, greek, maths and box drawing: an engineering console's
# symbol set rather than katakana. Texture, not copy.
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
        self.chars = [[rng.choice(GLYPHS) for _ in range(self.TRAIL)] for _ in range(self.ncols)]

    def step(self, dt=1.0):
        for i in range(self.ncols):
            self.y[i] += self.speed[i] * dt
            if self.y[i] > H + self.TRAIL * LH:
                self.y[i] = self.rng.uniform(-H * 0.6, -20)
                self.speed[i] = self.rng.uniform(1.8, 5.0)
                self.on[i] = self.rng.random() < 0.6
            # glyphs mutate rarely: a column that reshuffles every frame is noise
            if self.rng.random() < 0.06 * dt:
                self.chars[i][self.rng.randrange(self.TRAIL)] = self.rng.choice(GLYPHS)

    def draw(self, d, k):
        global _reading
        if k <= 0.01:
            return
        _reading = False
        try:
            for i in range(self.ncols):
                if not self.on[i]:
                    continue
                x = i * self.COL_W
                for j in range(self.TRAIL):
                    y = self.y[i] - j * LH
                    if y < -LH or y > H:
                        continue
                    f = (1 - j / self.TRAIL) ** 1.7
                    if j == 0:
                        col = fade(BODY, 0.95 * k)
                    elif j < 3:
                        col = fade(MUTED, f * k)
                    else:
                        col = fade(FAINT, f * 0.9 * k)
                    if col != BG:
                        d.text((S(x), S(y)), self.chars[i][j], font=_rain_font, fill=col)
        finally:
            _reading = True


# --------------------------------------------------------------------------
# The mark — three agents holding a formation (guilyx/branding/brand/logo.md)
# --------------------------------------------------------------------------

MARK_NODES = ((16.0, 8.5), (8.5, 21.0), (23.5, 21.0))
MARK_CENTROID = (16.0, (8.5 + 21.0 + 21.0) / 3.0)


def draw_mark(d, cx, cy, size, k=1.0):
    s = size / 32.0
    pts = [(cx + (x - MARK_CENTROID[0]) * s, cy + (y - MARK_CENTROID[1]) * s) for (x, y) in MARK_NODES]
    # the link path is deliberately weaker than the nodes: the agents are the
    # subject, the formation is the consequence
    col = fade(ACCENT, 0.45 * k)
    if col != BG:
        d.line([S(p) for pt in pts + pts[:1] for p in pt], fill=col,
               width=max(1, int(S(1.1 * s))), joint="curve")
    r = 2.1 * s
    for (x, y) in pts:
        d.ellipse([S(x - r), S(y - r), S(x + r), S(y + r)], fill=fade(ACCENT, k))


# --------------------------------------------------------------------------
# Chrome
# --------------------------------------------------------------------------

HOST = PROFILE["site"]["url"].split("://", 1)[-1].rstrip("/")


def corner_ticks(d, k, inset=16.0, arm=26.0):
    col = fade(LINE, k)
    wpx = max(1, int(S(1)))
    for cx, cy, sx, sy in ((inset, inset, 1, 1), (W - inset, inset, -1, 1),
                           (inset, H - inset, 1, -1), (W - inset, H - inset, -1, -1)):
        d.line([S(cx), S(cy), S(cx + sx * arm), S(cy)], fill=col, width=wpx)
        d.line([S(cx), S(cy), S(cx), S(cy + sy * arm)], fill=col, width=wpx)


def status_bar(d, k, label):
    """Bottom hairline plus a lowercase machine-register label."""
    d.line([S(28), S(H - 30), S(W - 28), S(H - 30)], fill=fade(LINE, k * 0.9), width=max(1, int(S(1))))
    text(d, 28, H - 24, label, F_MONO_XS, fade(FAINT, k))
    text(d, W - 28, H - 24, HOST, F_MONO_XS, fade(FAINT, k), anchor="ra")


# --------------------------------------------------------------------------
# Post-processing
# --------------------------------------------------------------------------

def bloom(img, radius=7 * EXPORT, strength=0.55):
    """Glow, computed small and scaled back up."""
    small = img.resize((FW // 4, FH // 4), Image.BILINEAR)
    small = ImageChops.subtract(small, Image.new("RGB", small.size, (46, 46, 46)))
    small = small.filter(ImageFilter.GaussianBlur(radius))
    up = small.resize((FW, FH), Image.BILINEAR).point(lambda v: int(v * strength))
    return ImageChops.screen(img, up)


def _mask(vignette: bool):
    """Scanlines pinned to one *layout* pixel, plus an optional light vignette."""
    m = Image.new("L", (OW, OH), 255)
    px = m.load()
    cx, cy = OW / 2.0, OH / 2.0
    maxd = math.hypot(cx, cy)
    for y in range(OH):
        scan = 0.88 if ((y // EXPORT) % 2) else 1.0
        for x in range(OW):
            vig = 1.0 - 0.14 * (math.hypot(x - cx, y - cy) / maxd) ** 2 if vignette else 1.0
            px[x, y] = max(0, min(255, int(255 * scan * vig)))
    return Image.merge("RGB", (m, m, m))


SCREEN_MASK = _mask(vignette=True)
SCANLINE_MASK = _mask(vignette=False)   # the flash card: a vignette contours a bright ground


def slice_glitch(img, amount, rng):
    """Horizontal slice displacement + a channel split, at whatever size `img` is."""
    s = img.width / W
    out = img.copy()
    y = 0
    band = max(2, int(7 * s))
    while y < img.height:
        h = rng.randint(band, band * 4)
        if rng.random() < 0.45:
            dx = int(rng.uniform(-amount, amount) * s)
            if dx:
                out.paste(img.crop((0, y, img.width, min(img.height, y + h))), (dx, y))
        y += h
    if amount > 4:
        r, g, b = out.split()
        off = int(max(1, amount * 0.25) * s)
        out = Image.merge("RGB", (ImageChops.offset(r, off, 0), g, ImageChops.offset(b, -off, 0)))
    return out


# --------------------------------------------------------------------------
# Copy — everything below is either from profile.json, or the promo's own
# (the terminal, and the joke). Machine register is lowercase; the person is
# sentence case.
# --------------------------------------------------------------------------

SITE = PROFILE["site"]
SPEC = [(r["key"], r["value"]) for r in PROFILE["spec"]]
SYSTEMS = {s["id"]: s for s in PROFILE["systems"]}
CHAPTERS = PROFILE["chapters"]

TERM_LINES = [
    # (start, indent, segments[(text, colour)], typed?)
    (0,  0, [("guilyx", MUTED), (" on ", FAINT), ("master", MUTED),
             (" [!?] ", FAINT), ("took 16s", FAINT)], False),
    (2,  0, [("→ ", ACCENT), (f"ssh erwin@{HOST}", BODY)], True),
    (18, 1, [("handshake ", FAINT), ("·" * 14, LINE), (" ok", BODY)], False),
    (20, 1, [("locale ", FAINT), ("·" * 17, LINE),
             (f" {SITE['location'].lower()} · utc+04", BODY)], False),
    (22, 0, [("→ ", ACCENT), ("whoami", BODY)], True),
]

# The joke, and it is true: optimal multi-agent pathfinding is NP-hard, and the
# field plans anyway — bounded-suboptimal solvers exist precisely because nobody
# waits for the optimum. Brand voice allows one joke and it has to be true.
JOKE_LINES = [
    (0,  0, [("guilyx", MUTED), (" on ", FAINT), ("master", MUTED),
             (" [!?]", FAINT)], False),
    (2,  0, [("→ ", ACCENT), ("mapf solve --optimal", BODY)], True),
    (15, 1, [("optimal mapf is np-hard.", BODY)], False),
    (18, 1, [("solving it anyway.", MUTED)], False),
]

CPS = 1.7          # characters per layout frame while typing — deliberate, not frantic


# --------------------------------------------------------------------------
# Scenes the promo still draws itself. Each takes a local clock `t` in layout
# frames (fractional: Q sub-frames per layout frame).
# --------------------------------------------------------------------------

def _cursor(d, x, y, t, k=0.85):
    if (t // 4) % 2 == 0:
        d.rectangle([S(x), S(y + 2), S(x + CW * 0.85), S(y + LH * 0.82)], fill=fade(BODY, k))


def draw_terminal(d, t, lines, y0=74.0, tail_from=None):
    """A terminal block. `tail_from` blinks a cursor after the last line."""
    x0 = 60.0
    last = None
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
            text(d, x + used * CW, y, s[:take], F_MONO, col)
            used += take
        last = (x + used * CW, y)
        if typed and used < len(full):
            _cursor(d, last[0], last[1], t, 0.8)   # the cursor rides the line being typed
            return
    if tail_from is not None and t >= tail_from and last:
        _cursor(d, last[0], last[1], t, 0.9)


def scene_power(d, t, off=False):
    """CRT power cycle: the band opens into the screen, or collapses out of it."""
    p = seg(t, 0, 6 if off else 8)
    if p <= 0 or (off and p >= 1):
        return
    e = ease_out(p)
    open_ = (1 - e) if off else e
    half = max(1.0, open_ * H * 0.55)
    cy = H / 2.0
    glow = (0.35 + 0.5 * e) if off else (1 - e)
    steps = 30
    for i in range(steps):
        f0, f1 = i / steps, (i + 1) / steps
        v = ((1 - f0) ** 2.4) * 0.62 * glow
        col = mix(BG, HEADING, v)
        if col == BG:
            continue
        d.rectangle([0, S(cy - half * f1), FW, S(cy - half * f0)], fill=col)
        d.rectangle([0, S(cy + half * f0), FW, S(cy + half * f1)], fill=col)
    if p < 0.95:
        lw = max(1, int(S(2.2 * glow + 0.7)))
        d.line([0, S(cy), FW, S(cy)], fill=mix(HEADING, WHITE, glow), width=lw)


# The identity card. `t` past REVEALED draws the finished card — that is frame 0.
REVEALED = 19.0


def scene_identity(d, t):
    x0 = 60.0

    # the name: the person, so display face and sentence case
    if t >= 1:
        text(d, x0, 92, SITE["name"], F_DISP_XL, HEADING)

    # accent moment for this card: the rule under the name
    if t >= 3:
        e = ease_out(seg(t, 3, 6))
        d.line([S(x0), S(178), S(x0 + 300 * e), S(178)], fill=fade(ACCENT, 0.9), width=max(1, int(S(1.5))))

    # tagline, typed in
    if t >= 4:
        tag = SITE["tagline"]
        text(d, x0, 196, tag[: int((t - 4) * 4.6)], F_DISP_M, MUTED)

    # the spec block, in the machine register, as on the site's hero
    for i, (k, v) in enumerate(SPEC):
        st = 8 + i * 1.5
        if t < st:
            continue
        a = ease_out(seg(t, st, 4))
        y = 262 + i * 24
        text(d, x0, y, k, F_MONO_S, fade(FAINT, a))
        text(d, x0 + 104, y, v, F_MONO_S, fade(BODY, a))

    # the lockup: mark plus wordmark, top right
    if t >= 9:
        a = ease_out(seg(t, 9, 6))
        wx = W - 60
        text(d, wx, 40, SITE["handle"], F_MONO_L, fade(MUTED, a), anchor="ra")
        draw_mark(d, wx - text_w(SITE["handle"], F_MONO_L) - 22, 50, 30, a)


def scene_joke(d, t):
    """`mapf solve --optimal`. The pause before the answer is the joke."""
    draw_terminal(d, t, JOKE_LINES, y0=192.0, tail_from=20)


def scene_term(d, t):
    """The handshake. Terminal in the machine register."""
    draw_terminal(d, t, TERM_LINES, tail_from=27)


def scene_trajectory(d, t):
    """The career as a path: planned first, then followed, chapter by chapter."""
    text(d, 60, 52, "→ ", F_MONO, fade(ACCENT, 0.9))
    text(d, 60 + 2 * CW, 52, "trajectory --since 2018"[: int(max(0, t) * 2.4)], F_MONO, BODY)

    ax0, ax1, ay = 100.0, W - 100.0, 226.0
    n = len(CHAPTERS)
    xs = [ax0 + (ax1 - ax0) * i / (n - 1) for i in range(n)]

    e = ease_in_out(seg(t, 3, 12))
    if e > 0:
        d.line([S(ax0), S(ay), S(ax0 + (ax1 - ax0) * e), S(ay)], fill=LINE, width=max(1, int(S(1.4))))

    for i, (x, ch) in enumerate(zip(xs, CHAPTERS)):
        reach = (x - ax0) / (ax1 - ax0)
        if e < reach:
            continue
        a = ease_out(seg(t, 3 + reach * 12, 3))
        now = i == n - 1
        r = 3.4 if now else 3.0
        d.ellipse([S(x - r), S(ay - r), S(x + r), S(ay + r)], fill=fade(ACCENT if now else MUTED, a))
        ctext(d, x, ay - 36, ch["tab"], F_MONO_S, fade(HEADING if now else BODY, a))
        ctext(d, x, ay + 16, ch["where"].split(",")[0].strip().lower(), F_MONO_XS, fade(MUTED, a))
        ctext(d, x, ay + 32, ch["years"].replace(" — ", "–"), F_MONO_XS, fade(FAINT, a * 0.9))

    # the agent that follows the planned path — accent moment for this beat
    if 0.02 < e < 1:
        hx = ax0 + (ax1 - ax0) * e
        d.ellipse([S(hx - 4), S(ay - 4), S(hx + 4), S(ay + 4)], fill=ACCENT)

    if t >= 15:
        a = ease_out(seg(t, 15, 4))
        last = CHAPTERS[-1]
        ctext(d, W / 2, 316, f"{last['title']} · {last['where']}", F_DISP_S, fade(MUTED, a))


def shot_chrome(d, shot, k=1.0):
    """The band above a captured scene, and the panel it sits in — as on the site."""
    sid = shot["id"]
    num = f"{list(SYSTEMS).index(sid) + 1:02d}"
    text(d, 60, 24, num, F_MONO_S, fade(ACCENT, k))
    text(d, 60 + 3.2 * cw(F_MONO_S), 19, SYSTEMS[sid]["headline"], F_DISP_HEAD, fade(HEADING, k))
    x, y, w, h = SCENE
    d.rounded_rectangle([S(x - 1), S(y - 1), S(x + w + 1), S(y + h + 1)], radius=S(8),
                        fill=RAISED, outline=LINE, width=max(1, int(S(1))))


def flash_card():
    """`whoami`, answered by inverting the screen: a designed invert, in palette."""
    card = Image.new("RGB", (FW, FH), HEADING)
    d = ImageDraw.Draw(card)
    ctext(d, W / 2, H / 2 - 22, "whoami", F_MONO_XL, BG)
    col = mix(HEADING, BG, 0.55)
    for cx, cy, sx, sy in ((16, 16, 1, 1), (W - 16, 16, -1, 1), (16, H - 16, 1, -1), (W - 16, H - 16, -1, -1)):
        d.line([S(cx), S(cy), S(cx + sx * 26), S(cy)], fill=col, width=max(1, int(S(1))))
        d.line([S(cx), S(cy), S(cx), S(cy + sy * 26)], fill=col, width=max(1, int(S(1))))
    return card


# --------------------------------------------------------------------------
# The timeline
# --------------------------------------------------------------------------

@dataclass
class Beat:
    name: str
    subframes: int
    draw: Callable                     # draw(d, t, i): t in layout frames, i the sub-frame
    label: str | None = None           # status-bar label; None means no chrome at all
    rain: float = 0.0
    holds: dict = field(default_factory=dict)   # layout frame -> base hold ms
    glitch: float = 0.0                # slice glitch on the way in
    scene: dict | None = None          # a captured shot, drawn into SCENE
    flash: bool = False


def _shot_beats():
    beats = []
    for shot in MANIFEST["shots"]:
        beats.append(Beat(
            name=shot["id"],
            subframes=shot["frames"] + 1,  # every captured frame, plus one held on the last
            draw=lambda d, t, i, shot=shot: shot_chrome(d, shot),
            label=SYSTEMS[shot["id"]]["tab"].lower(),
            glitch=6.0,
            scene=shot,
        ))
    return beats


def L(frames):
    """Layout frames -> sub-frames."""
    return frames * Q


TIMELINE = [
    # frame 0: the card, finished, and held — the poster
    Beat("identity", L(2), lambda d, t, i: scene_identity(d, REVEALED), "identity",
         holds={0: 420, 1: 420}),
    Beat("joke", L(22), lambda d, t, i: scene_joke(d, t), "planning", rain=0.10,
         holds={16: 460, 19: 480, 20: 480}, glitch=6.0),
    *_shot_beats(),
    Beat("trajectory", L(22), lambda d, t, i: scene_trajectory(d, t), "trajectory",
         holds={21: 420}, glitch=6.0),
    Beat("power-off", L(7), lambda d, t, i: scene_power(d, t, off=True)),
    Beat("power-on", L(10), lambda d, t, i: scene_power(d, t)),
    Beat("handshake", L(29), lambda d, t, i: scene_term(d, t), rain=0.17, holds={28: 380}),
    Beat("whoami", L(2), lambda d, t, i: None, flash=True, holds={0: 380, 1: 380}),
    # the answer resolves into frame 0, closing the loop
    Beat("reveal", L(22), lambda d, t, i: scene_identity(d, t), "identity", glitch=4.5),
]


def _shot_frame(shot, i):
    idx = min(i, shot["frames"] - 1)
    return Image.open(os.path.join(FRAMES, shot["dir"], f"{idx:04d}.png")).convert("RGBA")


def render():
    rain = Rain(RNG)
    frames: list[Image.Image] = []
    durations: list[int] = []
    prev_ink = 0
    debug = bool(os.environ.get("PROMO_DEBUG"))
    sx, sy = SCENE[0] * EXPORT, SCENE[1] * EXPORT

    # PROMO_PREVIEW="joke:42,bt:-1" renders just those sub-frames to PNGs (in
    # PROMO_PREVIEW_DIR, default .frames/preview) and skips encoding — a
    # five-second check instead of a five-minute render. -1 is the last one.
    want: dict[str, set[int]] = {}
    for item in filter(None, os.environ.get("PROMO_PREVIEW", "").split(",")):
        name, _, idx = item.partition(":")
        want.setdefault(name, set()).add(int(idx or 0))
    preview_dir = os.environ.get("PROMO_PREVIEW_DIR", os.path.join(FRAMES, "preview"))
    if want:
        os.makedirs(preview_dir, exist_ok=True)

    for beat in TIMELINE:
        for i in range(beat.subframes):
            t = i / Q
            layout = int(t)
            shot_hold = beat.scene is not None and i == beat.subframes - 1
            frozen = layout in beat.holds or shot_hold
            if want and not ({i, i - beat.subframes} & want.get(beat.name, set())):
                if not frozen and not beat.flash and i % Q == 0:
                    rain.step(1.0)           # keep the rain where it would be
                continue
            reset_ink()

            if beat.flash:
                img = flash_card()
                chars = ink()
            else:
                img = Image.new("RGB", (FW, FH), BG)
                d = ImageDraw.Draw(img)
                # The rain steps once per layout frame, not per sub-frame. It falls
                # slowly enough that nobody sees the difference, and GIF does: a few
                # glyphs moving at both edges make every frame a full-width change.
                if not frozen and i % Q == 0:
                    rain.step(1.0)
                rain.draw(d, beat.rain)
                beat.draw(d, t, i)
                if beat.label:
                    corner_ticks(d, 0.9)
                    status_bar(d, 0.85, beat.label)
                chars = ink()
                img = bloom(img)

            small = img.resize((OW, OH), Image.LANCZOS)
            if beat.scene is not None:
                sc = _shot_frame(beat.scene, i)
                small.paste(sc, (sx, sy), sc)        # the scenes stay crisp: no bloom on them

            # a cut, on the way into a beat
            if beat.glitch and i < 2 * Q:
                amount = beat.glitch * (1 - i / (2 * Q))
                if amount > 0.3:
                    small = slice_glitch(small, amount, RNG)

            small = ImageChops.multiply(small, SCANLINE_MASK if beat.flash else SCREEN_MASK)

            # how long this frame stays up
            if shot_hold:
                dur = beat.scene["hold"] * 1000
            elif beat.scene is not None:
                dur = 1000 / beat.scene["fps"]   # the rate it was captured at
            elif frozen:
                dur = beat.holds[layout] * HOLD_SCALE * read_time(chars) / Q
            elif chars > prev_ink:
                dur = READ_MS          # new words landed — give them a beat
            else:
                dur = MOTION_MS        # nothing to read, only motion
            dur = max(20, int(round(dur / 10.0)) * 10)   # GIF stores hundredths
            durations.append(dur)
            frames.append(small)
            prev_ink = chars
            if debug and i % Q == 0:
                print(f"    {beat.name:10s} t{t:5.1f} chars={chars:4d} dur={dur:4d}{' hold' if frozen else ''}")
            if want:
                small.save(os.path.join(preview_dir, f"{beat.name}_{i:04d}.png"))
        if not want:
            ms = sum(durations[-beat.subframes:])
            print(f"  {beat.name:10s} {beat.subframes:4d} sub-frames  {ms / 1000:5.2f}s")

    if want:
        print(f"  preview: {len(frames)} stills in {preview_dir}")
        return

    print("  building palette")
    palette = build_palette(frames)

    print(f"  encoding {len(frames)} frames -> {OUT_WEBP}")
    frames[0].save(OUT_WEBP, format="WEBP", save_all=True, append_images=frames[1:],
                   duration=durations, loop=0, quality=82, method=4)

    print(f"  encoding {len(frames)} frames -> {OUT}")
    quantised = []
    for k in range(len(frames)):
        quantised.append(frames[k].quantize(palette=palette, dither=Image.Dither.NONE))
        frames[k] = None   # let the RGB go as we go
    quantised[0].save(OUT, save_all=True, append_images=quantised[1:],
                      duration=durations, loop=0, optimize=True, disposal=1)

    for path in (OUT, OUT_WEBP):
        size = os.path.getsize(path)
        print(f"  done: {os.path.basename(path)} ({OW}x{OH}, {size / 1024 / 1024:.2f} MB, "
              f"{len(durations)} frames, {sum(durations) / 1000:.1f}s)")


if __name__ == "__main__":
    render()
