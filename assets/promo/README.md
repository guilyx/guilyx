# Terminal profile promo

`guilyx-terminal.gif` — the header loop on the profile README. 880 × 440,
23.7s, 193 frames, ~1.1 MB.

Everything is generated. There is no video editor in the loop and no source
footage: [`generate.py`](./generate.py) draws every frame with Pillow and
encodes the GIF directly.

```bash
pip install pillow
python3 assets/promo/generate.py
```

The seed is fixed, so a re-run reproduces the same file byte for byte.

## The sequence

The subject is orchestration — behaviour trees and lifecycle underneath, the
graph of agents above. Or, in the v4 about copy, *the seams*: where a planner
meets a controller, and a model meets a tool.

| Beat | Frames | What happens |
| :--- | :--- | :--- |
| Power on | 0–11 | A CRT line opens vertically into the screen. |
| Handshake | 11–35 | `ssh erwin@elejeune.me`, then `whoami`. |
| Identity | 35–60 | Two frames of an inverted flash card, then the card itself. |
| The joke | 60–82 | `agent --instructions`. |
| Behaviour tree | 82–120 | `bt tick` — the tick descends, the leaves answer. |
| Orchestration | 120–152 | An agent graph passing messages; three nodes settle into the mark. |
| Trajectory | 152–174 | The path is planned, then followed, waypoint by waypoint. |
| Open channel | 174–193 | Mark, wordmark, links. Fades out so the loop reads as a power cycle. |

## The behaviour tree is a real one

Standard notation — `→` sequence, `?` fallback, `⇉` parallel, `▸` action,
`○` condition — and the statuses are what this tree actually returns when ticked:

- `battery ok` succeeds, so the fallback returns **success** immediately and
  **`return home` is never reached** — it stays dim for the whole scene.
- `track target` and `stream tlm` both report **running**, so the parallel is
  running, so the root is running.

The accent traces the live path from the root down. That is the whole point of
the scene: a tick descends, and status propagates back up.

## Pacing

GIF delays are per frame, so the piece does not have to pick one speed. Motion —
the graph, the typing, the path being drawn — runs at 90ms. The frames where
there is something to *read* sit still for up to a second and a half instead,
listed in `HOLD_MS`. The rain and the graph are frozen on a hold, so the pause
reads as deliberate rather than as a dropped frame.

This is also what keeps the file small: an unchanged frame costs almost nothing
to encode, and Pillow folds consecutive identical frames into one longer delay.

The joke gets the longest holds in the piece — a beat after `error: agents take
tools,` where it still looks like a real error, then a longer one after the
second line lands.

## Design notes

Colour, type registers and the accent budget come from
[guilyx/branding](https://github.com/guilyx/branding) — "Ink & Iris".

- **The accent is spent once per scene.** `#8b95f0` is the only saturated value
  in the system, so it gets one moment per beat: the prompt arrow, the rule
  under the name, the live path through the behaviour tree, the node the
  orchestration runs from, the mark, `elejeune.me`. Nowhere else.
- **Two type registers.** Lowercase mono is the machine talking; sentence-case
  display is the person. `Erwin Lejeune` is set in the display face and `guilyx`
  never is.
- **The mark is earned, not drawn.** Three of the six graph nodes ease into the
  vertices from
  [`brand/logo.md`](https://github.com/guilyx/branding/blob/master/brand/logo.md)
  and the rest stand down — three agents holding a formation, which is what the
  mark has always been.
- **One joke, and it is true.** It is his own line from the v4 about copy: *"my
  agents get tools instead of instructions."* Asking an agent to take
  instructions is the error. It sets up the graph scene that follows.

Every string traces back to `guilyx/v4`'s `site.ts`, the profile README, or
`brand/voice.md` — the role line, the location, the TII bullet on behaviour
orchestration and lifecycle management, and the Kymatics work on agentic
orchestration.

Substitutions, since the brand faces are not on the render box: DejaVu Sans Mono
for JetBrains Mono, Liberation Sans Bold for Space Grotesk. The glyph rain runs
on hex, greek and maths symbols rather than katakana — no kana-capable font is
installed, and an engineering console set reads closer to the work anyway.
