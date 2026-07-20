# Praxis-card design sources — TEMPORARY

**This directory is deleted by issue #844, the praxis-card epic's cleanup issue.**
It is not a permanent home for designs. The repo does not accumulate design
snapshots — see `docs/agents/design-fidelity.md`.

## Why it exists

Subagents cannot reach `claude.ai` design URLs from a worktree. On the #821 wave
the design was read in the orchestrating session and *summarised into prose* in
each dispatch prompt, and the result split cleanly:

- the **vote widgets** came out near-exact, because `FactionVoteWidgets.jsx` was a
  file the agents could open;
- the **card chrome** came out wrong — no ensō, no lotus watermark, no rubber
  roundel, no rubric, one generic rectangle standing in for eight signature
  marks — because the `.dc.html` was unreachable and they built from the prose.

Prose does not carry geometry. A palette summary survives the trip; a `textPath`
arc under `mix-blend-mode: multiply` does not. So the sources are vendored for the
life of the epic, and removed at the end of it.

## What's here

`design_handoff_faction_vote_stamps/` — the handoff bundle.

| File | What it is | How to treat it |
|---|---|---|
| `README.md` | The handoff spec: card template contract, design tokens, per-faction palettes | Authoritative for *values* |
| `FactionVoteWidgets.jsx` | The 8 vote widgets, marked **production-intent** | **Port it. Do not reimplement.** |
| `animations.css` | Keyframes the widgets require, plus card-chrome effect classes | Port the keyframes; gate them on `prefers-reduced-motion` |
| `Faction Praxis Cards.dc.html` | The full visual prototype, every faction, light + dark | **Authoritative for card chrome.** Open it in a browser |
| `Singularity Mobile Card.dc.html` | The mobile integration pattern | Reference |
| `image-slot.js` | Prototype drop-target web component | Prototype scaffolding — do not port |
| `enso-detailed.svg` | UA's ensō mark. **705 KB, 284 paths, single-colour** | Ship via `mask-image`, not inlined — ADR-0049 |
| `lotus.svg` | UA's watermark, 9 KB, gradient fills | Inline as a React SVG component |

**Not vendored:** the two faction kits (`WoW Faction Kit`, and the pink kit filed
under `Warriors of Whimsy`). They are only needed by #840 and #835 and will be
pulled at that point. See `LABELS.md` before touching either.

## Update 2026-07-20 — the two missing states landed

`Faction Praxis Cards.dc.html` gained two sections (purely additive, +454 lines).
These were the gaps the epic deliberately deferred; they are now specified.

**`SCORE STAMP · CONDITIONAL STATES`** — every stamp archetype drawn in five
states: base only, `+ votes`, `× multiplier`, `+ metatask`, and the full formula.

- Arithmetic: **`Total = (base + metatask) × faction multiplier + votes`**, worked
  as `(12 + 20) × 0.80 + 4 = 29.6`, so the metatask's *multiplied* contribution
  (`+16`) reads in place. This matches ADR-0047.
- **Row visibility: a line drops out entirely when the API returns a no-op —
  `votes = 0`, `multiplier = 1.0`, or no metatask applied.**
- ⚠️ **DELIBERATE DEVIATION, decided 2026-07-20: we keep the votes row at `0`.**
  The design hides it; **ADR-0047 wins** — `+0 from votes` tells a viewer that
  nobody has voted yet, which an absent row cannot. Everything else follows the
  design: mult hides at `×1.0`, meta hides at `≤ 0`, base always shows.
  Net effect: `scoreBreakdown()` is **already correct** and needs no change.
- Only UA, Snide, Singularity, Everymen and Unaffiliated are drawn. The file
  states the rest — Ephemerists, Cozy Coven (= our `wow`), Coven, Albescent —
  "follow the Unaffiliated mechanism exactly".

**`LOGGED OUT · VOTE GATE`** — a signed-out viewer sees the whole card *including
the score stamp, read-only*. Only the widget is gated: one shared
`VoteLoginGate` renders a single eyebrow line in the faction's voice
(`> log in to vote`, `LOG IN TO VOTE`, …), keyed `votes.chrome.loginGate`. The
prompt heading stays. Explicitly **no stamps and no disabled buttons**.

⚠️ The bundle's own `design_handoff_faction_vote_stamps/README.md` was **not**
re-issued and is byte-identical to v1 — so it still says *"The approved Wow widget
is the moon-phase `WowVote`"*, which the `.dc.html` contradicts at the
`COZY COVEN (WOW)` section (`"the approved googly-balloon verdict"`). The
`.dc.html` wins. See `LABELS.md`.

## The one rule

The design value is the default. House rules — tokens, the content-text floor,
touch targets, contrast — win only where they genuinely conflict, and **every
deviation names itself**: a comment in the code, and a "Deviations" section in the
PR body. `docs/agents/design-fidelity.md` has the standing carve-outs.
