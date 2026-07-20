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

## The one rule

The design value is the default. House rules — tokens, the content-text floor,
touch targets, contrast — win only where they genuinely conflict, and **every
deviation names itself**: a comment in the code, and a "Deviations" section in the
PR body. `docs/agents/design-fidelity.md` has the standing carve-outs.
