# Orchestrator notes on the vendored designs

`docs/agents/design-fidelity.md` step 2: *"Correct the labels in the vendored copy before
dispatch. Design artifacts go stale against the roster — see ADR-0050, where a heading
inverted two factions across an entire wave. Annotate, don't assume."*

The `.jsx` files here are vendored **verbatim**, byte-for-byte as the design project holds
them. Corrections live in this file instead of being edited into the sources, so that what
the designer actually drew stays auditable. **Read this before porting.**

---

## 1 · Four designs silently drop the in-progress roster

Epic #1028 decision 3 makes the in-progress roster a **required slot on every skin** — it is
the only place a player learns a **foe** is working the same task.

| Design | What it does | Flagged in its issue? |
|---|---|---|
| `snide-task-detail.jsx` | header comment: `no in-progress roster section — the header count is enough` | ✅ yes, #1035 |
| `coven-task-detail.jsx` | header comment: `task detail pages carry NO in-progress roster section` | ❌ **no** |
| `wow-task-detail.jsx` | header comment: `no in-progress roster section — the header count covers it` | ❌ **no** |
| `ua-task-detail.jsx` | header comment: `No roster (the header count covers it)` | ❌ **no** |
| `default-task-detail.jsx` | **defines** a `roster` const with friend/foe tags and a `+N more` row, then **never renders it** in either layout | ❌ **no** |

Only #1035 warned about this. Every one of these builders must **add** the roster in their own
dress and name the deviation in the PR body. The na build (#1030) is the reference the others
copy, so if it ships without a roster the omission propagates to all eight skins.

`default-task-detail.jsx` is the useful one to read for intent: it shows the roster row shape
the designer had in mind (avatar, name, Friend/Foe tag, `lvl N`, `+N more →`) even though the
layout never mounts it.

## 2 · UA's faction line is a stale invention — ADR-0050 hazard

`ua-task-detail.jsx` renders the faction line as **`'Unbroken Ascension'`**.

That is not the faction's name. `frontend/src/locales/en/factions.json` has `names.ua = "UA"`,
and the faction is the **University of Asthmatics**. #1036 anticipated a wrong label but
guessed the wrong wrong-label (it warned about "Universal Assembly"); the design carries a
*third* invention.

**Do not port that string.** Under ADR-0057 the faction line is shared neutral copy resolved
from `factions.json` by slug, so the correct build never reads the design's string anyway —
but do not "helpfully" reintroduce it as a heading, and do not treat it as evidence about
what UA is called.

WOW/Coven were checked for the ADR-0050 inversion specifically: `wow-task-detail.jsx` is
gold-and-plum parchment with bunting and balloons, `coven-task-detail.jsx` is pink candlelight
with a pentagram ward. **Correctly assigned** — no inversion this time.

## 3 · The action panel width differs per design

The epic settled page width at 1200. The action panel is not uniform:

| Design | Panel width |
|---|---|
| `default` | 440 |
| `coven`, `snide`, `wow` | 452 |
| `ua` | 460 |

Take your own design's value; it is dress, and it is deliberate.

## 4 · A real bug in `snide-task-detail.jsx`

The author-byline avatar sets **`borderRadius` twice in the same style object**:

```js
width:30, height:30, borderRadius:'50%', overflow:'hidden', borderRadius:2, ...
```

The second wins, so the avatar renders as a near-square stamp, not a circle. That is almost
certainly not intended — every other design gives the author a round avatar — but it *is* what
the design currently draws. C5 (#1035) should ship the round avatar (consistent with the other
eight skins and with the live `PraxisCard`/comment avatars) and name it as a deviation.

## 5 · Albescent is vendored un-summarised on purpose

`albescent-task-detail.jsx` is the most heavily voiced file in the set (`Correspondence №207`,
`Albescent · in confidence`, `The Ask` / `in the hand of the keeper`, `In hand`,
`14 accounts inscribed`, `most witnessed`, `Acknowledge`, `withdraw`, `Said quietly`,
`Set something down, plainly…`). **Every one of those words is cut** by ADR-0057 + ADR-0027 —
see #1038. It is vendored whole so the builder can see the full extent of what the wrapper
must *not* carry over, and report anything the wrapper genuinely cannot reach.

Its own header comment states the thesis the issue relies on:
*"Albescent's difference is the light, not the layout."*

## 6 · Assets

`ua-task-detail.jsx` references `enso-detailed.svg` and `lotus.svg` by bare `src`. Both are
vendored alongside. No other design loads an external asset.
