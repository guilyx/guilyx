# Terminal profile promo

`guilyx-terminal.gif` — the header loop on the profile README. 880 × 440,
13.1s, 219 frames at 60ms, ~3.4 MB.

Everything is generated. There is no video editor in the loop and no source
footage: [`generate.py`](./generate.py) draws every frame with Pillow and
encodes the GIF directly.

```bash
pip install pillow
python3 assets/promo/generate.py
```

The seed is fixed, so a re-run reproduces the same file byte for byte.

## The sequence

| Beat | Frames | What happens |
| :--- | :--- | :--- |
| Power on | 0–11 | A CRT line opens vertically into the screen. |
| Handshake | 11–53 | `ssh erwin@elejeune.me`, then `whoami`. |
| Identity | 53–95 | Two frames of an inverted flash card, then the card itself. |
| Swarm | 95–153 | The glyph rain hands over to 64 flocking agents; three settle into the mark. |
| Trajectory | 153–191 | The path is planned, then followed, waypoint by waypoint. |
| Open channel | 191–219 | Mark, wordmark, links. Fades out so the loop reads as a power cycle. |

## Design notes

Colour, type registers and the accent budget come from
[guilyx/branding](https://github.com/guilyx/branding) — "Ink & Iris".

- **The accent is spent once per scene.** `#8b95f0` is the only saturated value
  in the system, so it gets exactly one moment per beat: the prompt arrow, the
  rule under the name, the mark, the agent tracing the trajectory, `elejeune.me`.
  Nowhere else.
- **The flock reads `--color-agent`**, which tracks `muted`. It is texture, not
  decoration, and it is drawn the way the social card draws it — small
  arrowheads with long faint trails.
- **Two type registers.** Lowercase mono is the machine talking; sentence-case
  display is the person. `Erwin Lejeune` is set in the display face and `guilyx`
  never is.
- **The rain becomes the swarm.** Every live rain column at the handover frame
  spawns an agent at its head position. The Matrix reference resolves into the
  actual subject rather than sitting on top of it.
- **The mark is earned, not drawn.** Three agents out of sixty-four are chosen
  by proximity and eased into the vertices from
  [`brand/logo.md`](https://github.com/guilyx/branding/blob/master/brand/logo.md);
  the rest stand down. No leader — the shape is a consequence.

The flocking is real Reynolds steering (separation, alignment, cohesion), which
is also the piece's one joke: `whoami` is answered by a swarm that works out the
logo on its own.

Substitutions, since the brand faces are not on the render box: DejaVu Sans Mono
for JetBrains Mono, Liberation Sans Bold for Space Grotesk. The glyph rain runs
on hex, greek and maths symbols rather than katakana — no kana-capable font is
installed, and an engineering console set reads closer to the work anyway.
