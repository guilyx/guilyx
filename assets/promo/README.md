# Terminal profile promo

`guilyx-terminal.gif` is the header on the profile README: 1760 × 960, 36.5 s,
about 6 MB. `guilyx-terminal.webp` is the same loop in full colour, about 4.7 MB.

Nothing in it is hand-copied any more. The copy comes from the portfolio's own
data, the three systems are the portfolio's own animations, and the palette and
type are the portfolio's own. When the site changes, the promo is three
commands away from matching it.

## How it's made

Three steps, each owning one kind of input:

| Step | Reads | Writes |
| :--- | :--- | :--- |
| [`sync.mjs`](./sync.mjs) | v4's `src/data/site.ts`, the `@theme` block, the Systems kit | `data/profile.json` (committed) |
| [`capture.mjs`](./capture.mjs) | v4's `src/scripts/systems/*.ts`, v4's brand fonts | `.frames/` (gitignored) |
| [`generate.py`](./generate.py) | `data/profile.json`, `data/cut.json`, `.frames/` | the GIF and the WebP |

```bash
# a guilyx/v4 checkout next to this repo, with its dependencies installed
git clone https://github.com/guilyx/v4 ../v4 && (cd ../v4 && npm ci)

node --experimental-strip-types assets/promo/sync.mjs --v4 ../v4
node assets/promo/capture.mjs --v4 ../v4
python3 assets/promo/generate.py          # pip install pillow
```

Needs Node 22.13 or later (for type stripping), Playwright with Chromium, and
Pillow 10 or later. `profile.json` records the v4 commit it came from, and
`generate.py` refuses to mix a profile and frames from different commits.

Both outputs are byte-for-byte reproducible: same v4 commit in, same files out.

## What comes from where

- **Copy** — name, role, tagline, the spec block, the seven career chapters and
  each system's headline: `site.ts`, via `profile.json`.
- **The three systems** — v4's own canvas scenes, `swarm.ts`, `bt.ts` and
  `fmr.ts`, captured frame by frame. The promo used to redraw a toy behaviour
  tree and agent graph in Pillow; the site's versions are far better, so now it
  shows those.
- **Palette** — v4's `@theme` tokens plus the Systems kit's `ok` / `warn` /
  `fail`. The scenes render in v4's palette, so the chrome around them has to
  match it exactly. It also matches `guilyx/branding`'s `tokens.json`.
- **Type** — JetBrains Mono and Space Grotesk, from v4's `@fontsource`
  packages, in the browser and in Pillow alike. They ship as latin subsets,
  which leave out `→`; both fall back per glyph, so it never renders as a box.
- **The promo's own** — the terminal, the joke, the identity card's layout, and
  the order things happen in. That's what `generate.py` still owns.

## Capturing the scenes

Every v4 scene implements the same small contract: `resize(w, h)`, then
`frame(dt)` to advance by `dt` seconds and draw. `capture.mjs` serves the `.ts`
straight from the checkout — Node strips the types, a tiny HTTP server hands
them to Chromium, no bundler — mounts each scene at the GIF's export scale, and
steps it in exact 1/60 s increments. Nothing is screen-recorded and nothing
depends on how fast the machine renders. `Math.random` is seeded per scene.

`--survey` renders one still per second across each scene's loop, and
`--size 760x380 --at 4,13.5` tries a size or a moment before committing to it.
That is how the cut below was chosen.

## The cut

`data/cut.json` is the edit decision list both scripts read:

| Shot | Scene time | Speed | Rate | What it shows |
| :--- | :--- | :--- | :--- | :--- |
| swarm | 1.0 → 21.4 s | 4.3× | 20 fps | Planned around the no-fly zone, V formation in transit, Voronoi coverage, a contact triangulated |
| bt | 8.0 → 29.3 s | 4.3× | 20 fps | The tree flattened into its action graph, a gap and `mission 72 / 100`, the fix made in the tree, re-scored to 91 |
| fmr | 0.6 → 6.6 s | 1.6× | 12.5 fps | One case: the agent reads the window, calls a link flap rather than a node fault, and suppresses the duplicates |

Each shot ends on a held frame, so its outcome can be read.

The scenes render at 760 × 380, which is 2:1. They size themselves to the
frame, but `fmr` needs at least that much height: at 2.4:1 its verdict box
runs into the rules-engine line. Slow-changing scenes get lower frame rates,
because every frame they don't need is file size.

## The sequence

| Beat | What happens |
| :--- | :--- |
| Identity | The card, finished — this is frame 0 |
| The joke | `mapf solve --optimal` |
| 01 · 02 · 03 | Swarm navigation, behaviour trees, fault management — each under the site's own headline |
| Trajectory | The seven chapters, planned and then followed, ending on the current role |
| Power cycle → handshake → `whoami` | The screen goes off and back on, and asks who this is |
| Reveal | The card answers, and resolves into frame 0 |

Two rules shaped it:

- **Frame 0 is the card.** It's what loads first, and what GitHub shows when
  animated images are paused (reduced motion, or autoplay turned off). Earlier
  versions opened on a black CRT, which is a poor thing to show someone who
  never presses play.
- **`whoami` sits at the seam.** The last frame of the loop is pixel-identical
  to frame 0, so it closes without a jump.

## Pacing

GIF delays are per frame, and the timing is derived from the frame rather than
hand-tuned. `text()` counts the legible characters it draws (the rain is
texture and never counts), and each sub-frame gets its duration from that:

| Sub-frame | Duration |
| :--- | :--- |
| Only motion | 40 ms (25 fps) |
| New words landed — typing, a line appearing | 50 ms (20 fps) |
| A captured scene frame | 1000 / its shot's fps |
| The held last frame of a shot | the shot's `hold` |
| A held frame of text | `HOLD_MS × HOLD_SCALE × read_time(chars) / Q` |

`read_time` scales a hold between 0.8× and 1.7× by how much is on screen, so
the identity card holds longer than the handshake. Delays round to a multiple
of 10 ms, because GIF stores them in hundredths of a second.

## Where the bytes go

| Beat | Share |
| :--- | ---: |
| swarm | 33% |
| bt | 20% |
| handshake | 18% |
| fmr | 11% |
| everything else | 18% |

The scenes are what the GIF is for, so they get the bytes. The rain was the
surprise: a few glyphs moving at both edges of the frame make every frame a
full-width change, because GIF sends one changed rectangle per frame. It now
steps once per layout frame rather than every sub-frame, and stays off the
trajectory entirely. That halved what it cost.

## Previewing

A full render takes about four minutes. To check a few frames instead:

```bash
PROMO_PREVIEW="identity:0,bt:-1,reveal:-1" python3 assets/promo/generate.py
```

That renders just those sub-frames to PNGs in `.frames/preview/` in a few
seconds. `-1` is a beat's last sub-frame.

## Design notes

Colour, type registers and the accent budget come from
[guilyx/branding](https://github.com/guilyx/branding) — "Ink & Iris".

- **The accent is spent once per beat**: the prompt arrow, the rule under the
  name, the shot numbers, the current chapter. The scenes bring their own, as
  they do on the site.
- **Two type registers.** Lowercase mono is the machine talking;
  sentence-case display is the person.
- **One joke, and it's true.** Optimal multi-agent pathfinding is NP-hard, and
  the field plans anyway: bounded-suboptimal solvers exist because nobody
  waits for the optimum. `optimal mapf is np-hard.` … `solving it anyway.` is a
  statement of practice, not a refusal.

The glyph rain runs on hex, greek, maths and box-drawing symbols rather than
katakana: an engineering console's symbol set reads closer to the work.
