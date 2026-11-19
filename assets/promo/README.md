# Terminal profile promo

`guilyx-terminal.gif` is the header on the profile README: 1760 × 960, 52 s,
about 7.6 MB. `guilyx-terminal.webp` is the same loop in full colour.

It shows the work in the order it grew: a robot on the ground, one drone, many
drones, what happens when things break, and the pipeline every change goes
through before it ships.

## The sequence

| Beat | What happens |
| :--- | :--- |
| Identity | The card, finished. This is frame 0 |
| 01 · On the ground | A warehouse robot takes a VDA 5050 order, drives it on a layered costmap, yields to a person, picks up a trolley and drops it at outbound |
| 02 · Into the air | One drone, flown from a C2 ground station. A NOTAM lands across its route, which is checked, replanned and re-uploaded mid-flight |
| The joke | `mapf solve --optimal` |
| 03 · Many | Five drones in formation. They fold into a column through a gap between no-fly zones, and one holds back as a relay when the C2 link thins out |
| 04 · When it breaks | Fault management, with an agent reading the fault timeline (v4's scene) |
| 05 · How it ships | RobotOps: a PR, a bot-opened PR on the dev environment, a cloud simulation run, and a check back on the first PR |
| `whoami` | The screen goes off and back on, and asks who this is |
| Reveal | The card answers, and resolves into frame 0 |

### What each scene is made of

- **On the ground** (`scenes/amr.ts`). The FMS sends a VDA 5050 order with a
  released base (`n1→n4`) and a horizon (`n5 n6`). The rest is released only
  once the pick is done. A behaviour tree runs the mission (`NavigateToPose →
  DockUnder → Lift → NavigateToPose → Lower`). The costmap has an inflation
  layer around racks and walls and a social layer in front of people. Regulated
  Pure Pursuit follows the plan: its lookahead scales with speed, and it slows
  for curvature, for the social layer and on approach. When a person crosses,
  it yields. An emulated camera tags people and trolleys with confidences, and
  a 270° lidar shows what the obstacle layer sees. The second leg bends around
  a person picking from a shelf, and the robot's footprint grows while it
  carries the trolley.
- **Into the air** (`scenes/uav.ts`). The airspace is an ops area plus no-fly
  zones, rasterised into a costmap with a buffer. The route is planned by A* on
  that costmap, then shortened and filleted. A NOTAM's temporary restriction is
  added to the costmap mid-flight. The crossing stretch of route v1 turns red,
  route v2 is planned from where the drone is, and the telemetry and airspace
  feed say what happened.
- **Many** (`scenes/formation.ts`). The formation is a virtual structure:
  moving slots, with a controller pulling each drone onto its slot and keeping
  the drones apart. Every pair of radios has a link quality that falls with
  range. The C2 route is the strongest path through that mesh, and links too
  weak to carry C2 are shown but never routed over. The link matrix on the
  right shows every pair.
- **When it breaks** is v4's `fmr.ts`, captured as it is on the site. It
  follows on from the formation: a lost link first looks like three lifecycle
  errors, and the agent calls it a link flap rather than a node fault.
- **How it ships** (`scenes/robotops.ts`). A PR on the feature repo goes
  through CI and produces an image. A bot opens a PR on the dev environment
  repo that pins that image. The dev environment deploys to a cloud
  simulation cluster, six scenarios run across 50 seeds each, and the result
  comes back to the original PR as a check. The scenario tiles are tiny
  replays of the other scenes.

Everything in the scenes is illustrative. The order IDs, the NOTAM number,
the repo names, the zones and the metrics are all made up. No customer,
employer or site data is used, and no employer code: the scenes are written
from scratch for this promo.

## How it's made

Three steps, each owning one kind of input:

| Step | Reads | Writes |
| :--- | :--- | :--- |
| [`sync.mjs`](./sync.mjs) | v4's `src/data/site.ts`, the `@theme` block, the Systems kit | `data/profile.json` (committed) |
| [`capture.mjs`](./capture.mjs) | [`scenes/*.ts`](./scenes), v4's `fmr.ts` and kit, v4's brand fonts | `.frames/` (gitignored) |
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

Both outputs are byte-for-byte reproducible: same inputs, same files out.

### Where things come from

- **Identity copy**: name, role, tagline and the spec block come from
  `site.ts`, via `profile.json`. So does fault management's headline.
- **Scenes**: four are the promo's own, in `scenes/`. They implement v4's
  Systems contract (`resize(w, h)`, then `frame(dt)`) and import v4's kit, so
  they share the site's palette, type and drawing helpers. `scenes/lib.ts`
  adds what they need beyond that: paths by arc length, fillets, hatching, a
  quadcopter glyph. Fault management is v4's own scene.
- **Palette**: v4's `@theme` tokens plus the Systems kit's `ok`, `warn` and
  `fail`. It matches `guilyx/branding`'s `tokens.json`.
- **Type**: JetBrains Mono and Space Grotesk, from v4's `@fontsource`
  packages, in the browser and in Pillow alike.
- **The promo's own**: the terminal, the joke, the identity card's layout, the
  chrome around each scene, and the order things happen in. All of that lives
  in `generate.py`.

### Capturing the scenes

`capture.mjs` serves the `.ts` straight from disk: Node strips the types and a
tiny HTTP server hands them to Chromium, with no bundler. It looks a module up
in `scenes/` first, then in the v4 checkout. It mounts each scene at the
GIF's export scale and steps it in exact 1/60 s increments. Nothing is
screen-recorded, and nothing depends on how fast the machine renders.

`--survey --ids amr --at 4,13.5` renders stills of one scene at chosen
moments. That is how the cut below was chosen.

## The cut

`data/cut.json` is the edit decision list both scripts read. Each shot names
its scene, its window, its speed and rate, and the headline and status label
the promo puts around it.

| Shot | Scene time | Speed | Rate | Shows |
| :--- | :--- | :--- | :--- | :--- |
| amr | 0.3 → 31.6 s | 3.75× | 16.7 fps | Order → drive → yield → pick → order update → drop → back out |
| uav | 0.2 → 13.3 s | 2× | 16.7 fps | Take-off → NOTAM → conflict → route v2 → on station |
| formation | 0.2 → 7.7 s | 1.3× | 16.7 fps | Wedge → column through the gap → relay → diamond |
| fmr | 0.6 → 6.6 s | 1.6× | 12.5 fps | Link flap, not a node fault: suppress the duplicates |
| robotops | 0 → 12.7 s | 2× | 16.7 fps | PR → CI → image → bot PR → deploy → 6 × 50 runs → check |

Each shot ends on a held frame, so its outcome can be read. The scenes render
at 760 × 380 (2:1). 16.7 fps is a 60 ms frame, which GIF can store exactly.

## Two timeline rules

- **Frame 0 is the card.** It's what loads first, and what GitHub shows when
  animated images are paused (reduced motion, or autoplay turned off).
- **`whoami` sits at the seam.** The last frame of the loop is pixel-identical
  to frame 0, so it closes without a jump.

## Pacing

GIF delays are per frame, and the timing is derived from the frame rather than
hand-tuned. `text()` counts the legible characters it draws (the rain is
texture and never counts), and each sub-frame gets its duration from that:

| Sub-frame | Duration |
| :--- | :--- |
| Only motion | 40 ms (25 fps) |
| New words landed: typing, a line appearing | 50 ms (20 fps) |
| A captured scene frame | 1000 / its shot's fps |
| The held last frame of a shot | the shot's `hold` |
| A held frame of text | `HOLD_MS × HOLD_SCALE × read_time(chars) / Q` |

## Where the bytes go

| Beat | Share |
| :--- | ---: |
| amr | 24% |
| formation | 24% |
| uav | 15% |
| whoami and reveal | 12% |
| robotops | 9% |
| the joke | 8% |
| fmr | 8% |

GIF sends one changed rectangle per frame, so what costs is motion spread
across the frame. The formation is the heaviest per frame: every mesh link
changes as the drones move. RobotOps is the lightest: only the tiles and the
tokens move.

## Previewing

A full render takes about five minutes. To check a few frames instead:

```bash
PROMO_PREVIEW="identity:0,amr:-1,robotops:-1" python3 assets/promo/generate.py
```

That renders just those sub-frames to PNGs in `.frames/preview/` in a few
seconds. `-1` is a beat's last sub-frame.

## Design notes

Colour, type registers and the accent budget come from
[guilyx/branding](https://github.com/guilyx/branding) ("Ink & Iris").

- **The accent marks the thing being decided**: the plan, the lookahead, the
  C2 route, the running node, the token being handed on. Status colours only
  ever mean status: `ok` is clear, `warn` is a restriction or a weak link,
  `fail` is no-fly or broken.
- **Two type registers.** Lowercase mono is the machine talking; sentence-case
  display is the person.
- **One joke, and it's true.** Optimal multi-agent pathfinding is NP-hard, and
  the field plans anyway: bounded-suboptimal solvers exist because nobody
  waits for the optimum.
