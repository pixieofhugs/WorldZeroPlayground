# Building against a design

How to turn a Claude design into shipped World Zero surfaces without the design
quietly evaporating on the way. Written after the #821 praxis-card wave, where
the vote widgets came out near-perfect and the card chrome came out wrong — and
the only difference between them was **which file the agent could open**.

## The one rule

**The design value is the default. Any deviation names itself.**

House rules — the token system, the content-text floor, touch-target minimums,
contrast — win where they genuinely conflict. They do not win by default, and
they do not win silently. When a house rule overrides a design value, the code
carries a one-line comment saying which rule overrode which value, and the issue
declares the carve-out **before** the build starts.

What went wrong last time was not that substitutions happened. It was that they
were mechanical and invisible: every per-faction caption size (13/14/15/17/19/20)
became `--text-content` (18px), every faction face was mapped onto whichever
`--font-*` token already existed, and every design gap became the nearest
`--space-*`. Each swap was locally defensible; together they flattened eight
distinct widgets into one.

### Known standing carve-outs

- **Ornament text is exempt from the content-text floor** (#623/#627). A vote
  widget's tier label is part of the mark, like the gear teeth or the star
  anchors — not body copy. Take the design's size.
- **Touch targets win, but re-solve the layout.** A 44×44 minimum is
  non-negotiable; dropping it into a layout drawn for intrinsic sizes is not a
  port. Ephemerists shipped 44px hit boxes on star anchors 60px apart on a 68px
  plate — overlapping each other and overflowing the plate.
- **Real contrast failures win.** Ship the nearest compliant value, say so in a
  comment, and flag it for design.

## Vendor, build, delete

Designs are **vendored into the repo for the life of the epic and deleted by its
last PR.** Subagents cannot reach `claude.ai` design URLs from a worktree; a
design summarised into an issue is prose, and prose cannot carry geometry.

1. **Orchestrator** pulls the bundle (`DesignSync`, or a local handoff folder)
   and drops it under `.design-sync/<epic>/`.
2. **Correct the labels in the vendored copy before dispatch.** Design artifacts
   go stale against the roster — see ADR-0050, where a heading inverted two
   factions across an entire wave. Annotate, don't assume.
3. **Agents port from the source files**, not from the issue's description of
   them. Where the bundle ships production-intent code, port it; do not
   reimplement.
4. **Every PR body lists its deviations** — what the design said, what shipped,
   which rule forced it.
5. **The epic's last PR removes `.design-sync/<epic>/`.**

## What a green build does not prove

`tsc`, `eslint` and `vitest` all passed on a praxis card with no ensō, no lotus
watermark, two fonts that were never loaded (silently resolving to generic
serif), one vote widget that was never built at all, and two factions wearing
each other's identity. None of that is visible to a type checker.

So visual verification is a **separate gate**, and it is split:

- **Agents** verify structure — the mark renders, the font resolves to the
  intended family, the contrast ratio clears, the tokens exist.
- **Orchestrator** checks desktop: DOM, computed styles, resolved font families,
  contrast. Note the tooling limits — the in-app Browser pane cannot screenshot
  (CDP `captureScreenshot` times out), and real Chrome's `resize_window` reports
  success without resizing.
- **A human** does the mobile looking. Nothing in the toolchain covers it.

Related: `docs/kit-structure.md` (what the kit is shaped like — the surface list,
why each faction gets a bespoke component, and the two ways a faction silently
loses one), ADR-0049 (score stamp as a manifest surface), ADR-0050 (WOW/Coven
identity), `docs/spec/SPEC-faction-ui-profile.md`.
