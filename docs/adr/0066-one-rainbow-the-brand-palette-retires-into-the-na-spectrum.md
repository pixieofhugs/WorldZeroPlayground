# ADR-0066 — One rainbow: the brand palette retires into the na spectrum

**Status:** Accepted
**Date:** 2026-07-29

**Relates to:** #1219 (epic), #1220 (this ADR's issue)
**Amends:** [ADR-0054](0054-one-theme-aware-task-crown.md) — its "the rainbow ring
stays a fixed brand constant" clause. The brand palette is not a constant any more;
it flips with the theme like everything else in the spectrum.
**Builds on:** [ADR-0039](0039-unaffiliated-fill-is-a-gradient-not-a-hue.md) — the na
spectrum, which this ADR promotes from "the unaffiliated player's identity" to
"the site's rainbow, of which the unaffiliated player's identity is one use"

## Context

The site had **two rainbows pretending to be one**, and neither knew about the
other.

`--faction-default-*` held the **na spectrum** (ADR-0039): seven hues, nine
gradient cuts, present in both themes with a brightened dark twin. It is the
unaffiliated player's identity and the most-consumed colour construct in the app.

`--underline-1…6` held a **six-hue brand palette**: a resequenced near-copy of the
same idea, with **no dark override at all**. It dressed the site's top-level
chrome — the nav wordmark's rule, every page title's per-letter bars, the Home
hero, the field desk, the level-up popup — plus three Singularity credit accents
that were only ever using its first stop as a gold. `--fdl-rainbow`, the Task
Crown's ring, was a third copy of that same hex set; #1213 retired it by deleting
the token outright rather than re-pointing it, and the crown reads
`--faction-default-rainbow-conic` directly.

A census of every multi-hue spectrum in `frontend/` found nineteen definitions
across six distinct hue sets. Two of the six were this duplication.

> **The brand and N/A should be the same rainbow. N/A is essentially the neutral
> site look.** — owner, 2026-07-29

## Decision

**One rainbow. The na spectrum is it, and the brand palette retires into it.**

Three parts, in the order they matter:

**1. The spectrum gains scalar stops, and every ramp composes from them.**
`--faction-default-stop-1…7` are declared in both theme blocks, in spectrum order
(red · orange · yellow · green · teal · blue · magenta). Every na gradient — the
bar ramp, the wedge ring, the vertical rule, the seamless loop, the smooth conic,
the aurora wash, and the four- and three-stop short cuts — is rebuilt from them.
The stops exist because **a gradient token cannot be indexed**: the consumers
being migrated cycle stops *by position* (a per-letter bar, an ability row's
dingbat, a confetti flake, a hard-wedge seal), which is exactly why they reached
for a second palette instead of this one. Nine gradient cuts survive unreduced —
each has a geometry argument the others cannot serve, and that stays true.

**2. `--underline-1…6` is deleted, and its consumers move by SHAPE.** They were
three different uses wearing one palette, and a find-and-replace would have been
wrong three times over:

| Shape | Consumers | Lands on |
|---|---|---|
| Index-cycled, full palette | `PageTitle`, `LevelUpPopup` | the seven stops |
| Four- and three-stop narrow marks | `NavBar` wordmark, `Home` hero, `FieldDesk` title rule + progress fill | `--faction-default-total-rainbow` / `-eyebrow-rainbow`, which already existed |
| A single stop used as a gold | three Singularity credits accents | `--faction-default-gold` |

Nothing was minted for the second and third rows. A mark narrow enough to need
fewer stops reads one of the short cuts that exist; a surface that wants a gold
asks for the gold.

**3. Brand chrome flips with the theme.** One palette, one behaviour, no
exceptions. This is the part that changes rendered output rather than moving
values around: the nav wordmark, every page title and the level-up popup showed
identical hexes in light and dark, and now take the brightened dark stops.

## Consequences

- **The cycle length changed from six to seven.** Anything that hardcoded
  `60deg` a wedge is wrong: `LevelUpPopup`'s seal derives `360 / stops` now. A
  cycling consumer must never write the count down.
- **ADR-0054's "fixed brand constant in both themes" no longer holds.** The Task
  Crown's ring is brand chrome and brand chrome flips. ADR-0054's actual subject
  — one canonical crown, theme-aware only, no per-faction recolour — is untouched
  and still correct; only its claim about the *ring's* theme behaviour is amended.
  The ring token itself was #1213's work, and its answer was to delete it: the
  crown reads `--faction-default-rainbow-conic` and there is no crown-owned
  rainbow token any more.
- **Three deliberate exceptions remain, and they are exceptions on the record.**
  `--badge-victor-stop-*` and `--spectrum-glow-*` are theme-INVARIANT identities;
  `--faction-default-chip` is a fixed green→blue pill whose white ink is measured
  on its two exact hues, so composing it from stops 4 and 6 would flip it and put
  white on a brightened green. Each says so at its own declaration. **A hue
  restated on purpose has to say why, at the declaration.**
- **A stop is now load-bearing across surfaces that never used to share one.** A
  re-cut of the dark yellow moves the na card's POINTS caption, the Singularity
  credits accent, every page title's third letter and the level-up rule together.
  That is the point of one source, and it is also the new blast radius.
- **Dark overrides that only restated the light composition are gone rather than
  kept.** The gold, both short ramps and the aurora's hue list compose from stops
  the dark block rebinds, so the `:root` declarations re-resolve on their own.
  Restating them would be lines that have to be remembered when the light cut
  changes.
- **This is a real visual change to top-level chrome that no automated check can
  see.** These are gradients and per-letter bars: axe cannot measure a gradient
  (#651) and the test harness has no DOM. The guard used here was resolving every
  token out of the **built** stylesheet in both themes and diffing against the
  previous build — which proves the *values* moved as intended and proves nothing
  at all about legibility. Both themes owe a human eyeball.
