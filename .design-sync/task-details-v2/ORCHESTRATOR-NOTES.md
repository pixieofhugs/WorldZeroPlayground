# Orchestrator notes on the vendored designs

`docs/agents/design-fidelity.md` step 2: *"Correct the labels in the vendored copy before
dispatch. Design artifacts go stale against the roster — see ADR-0050, where a heading
inverted two factions across an entire wave. Annotate, don't assume."*

The `.jsx` files here are vendored **verbatim**, byte-for-byte as the design project holds
them. Corrections live in this file instead of being edited into the sources, so that what
the designer actually drew stays auditable. **Read this before porting.**

---

## 1 · NO SKIN RENDERS AN IN-PROGRESS ROSTER — epic decision 3 is REVERSED

Epic #1028 decision 3 said the in-progress roster was *"a required slot on every skin"*, and
#1031–#1038 repeat that as a non-negotiable rule. **The owner reversed that on 2026-07-28.**

Reading all nine designs is what surfaced it — **not one of them renders a roster:**

| Design | What it actually does |
|---|---|
| `snide` | header comment: `no in-progress roster section — the header count is enough` |
| `coven` | header comment: `task detail pages carry NO in-progress roster section` |
| `wow` | header comment: `no in-progress roster section — the header count covers it` |
| `ua` | header comment: `No roster (the header count covers it)` |
| `everymen` | header comment: `No roster section.` |
| `default` (na) | **builds** a `roster` const with Friend/Foe tags and a `+N more` row, then never mounts it in either layout |
| `ephemerists` | **builds a complete roster section** — octagon avatars, tally strokes, Friend/Foe renamed to Ally/Rival, `+N more players →` — and never mounts it either |
| `albescent` | wrapper over `default`; inherits whatever `default` does |
| `singularity` | section list is header → action panel → the_observation → signaled_praxis → thread |

Only #1035 (Snide) ever flagged the omission; the other seven issues were written as if their
design drew one.

**The rule now: do NOT build an in-progress roster on any task-detail skin.** The header's
in-progress count stays and is the only place that number appears. `default` and `ephemerists`
both contain dead roster code — **do not port it.** #1030 must not put a roster slot in the
shared anatomy, or all eight skins inherit it.

What this gives up, explicitly: decision 3's justification was that the roster is the only
place a player learns a **foe** is working the same task. That signal is gone from task detail.
It is a deliberate trade, not an oversight.

## 2 · UA's faction line is a stale invention — ADR-0050 hazard

`ua-task-detail.jsx` renders the faction line as **`'Unbroken Ascension'`**.

That is not the faction's name. `frontend/src/locales/en/factions.json` has `names.ua = "UA"`,
and the faction is the **University of Asthmatics**. #1036 anticipated a wrong label but
guessed the wrong wrong-label (it warned about "Universal Assembly"); the design carries a
*third* invention.

**Do not port that string.** Under ADR-0057 the faction line is shared neutral copy resolved
from `factions.json` by slug, so a correct build never reads the design's string anyway — but
do not reintroduce it as a heading, and do not treat it as evidence about what UA is called.

WOW/Coven were checked for the ADR-0050 inversion specifically: `wow-task-detail.jsx` is
gold-and-plum parchment with bunting and balloons, `coven-task-detail.jsx` is pink candlelight
with a pentagram ward. **Correctly assigned** — no inversion this time.

## 3 · The action panel width differs per design

The epic settled page width at 1200. The action panel is not uniform — five distinct values:

| Design | Panel width |
|---|---|
| `ephemerists` | 420 |
| `default`, `singularity` | 440 |
| `coven`, `snide`, `wow` | 452 |
| `ua` | 460 |
| `everymen` | 520 |

Take your own design's value; it is dress, and it is deliberate.

## 4 · A duplicate-key bug in two designs

`snide` and `singularity` both set **`borderRadius` twice in the same author-avatar style
object**:

```js
// snide
width:30, height:30, borderRadius:'50%', overflow:'hidden', borderRadius:2, ...
// singularity
width:30, height:30, borderRadius:'50%', overflow:'hidden', borderRadius:4, ...
```

The second wins, so the avatar renders as a rounded square, not a circle. Given it appears
identically in two files it is a copy-paste artifact, not intent — every other design gives
the author a round avatar. Ship the round avatar and name it as a deviation in the PR body.

## 5 · Albescent is vendored un-summarised on purpose

`albescent-task-detail.jsx` is the most heavily voiced file in the set (`Correspondence №207`,
`Albescent · in confidence`, `The Ask` / `in the hand of the keeper`, `In hand`,
`14 accounts inscribed`, `most witnessed`, `Acknowledge`, `withdraw`, `Said quietly`,
`Set something down, plainly…`). **Every one of those words is cut** by ADR-0057 + ADR-0027 —
see #1038. It is vendored whole so the builder can see the full extent of what the wrapper
must *not* carry over, and report anything the wrapper genuinely cannot reach.

Its own header comment states the thesis the issue relies on:
*"Albescent's difference is the light, not the layout."*

## 6 · Assets — use the repo's ensō, not the design's

`ua-task-detail.jsx` references two files by bare `src`:

- **`lotus.svg`** — vendored here (10 KB).
- **`enso-detailed.svg`** — **deliberately NOT vendored.** The design's copy is 258 KB of
  machine-generated path data, and the repo already ships a live ensō:
  `frontend/src/components/factionMarks/Enso.tsx` and `frontend/public/factionMarks/enso.svg`,
  already consumed by `components/cards/UaSigil.tsx` and
  `components/praxisCard/scoreStamp/UaScoreStamp.tsx`.

  **C6 (#1036) reuses the existing `<Enso />` component.** Do not add a second ensō asset;
  a faction mark that drifts between surfaces is exactly what the manifest exists to prevent.
