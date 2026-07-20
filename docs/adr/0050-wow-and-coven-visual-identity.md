# ADR-0050 — WOW and Coven visual identity, and why the design artifacts are mislabelled

**Status:** Accepted
**Date:** 2026-07-20
**Relates to:** #784 (Cozy Coven splits off Warriors of Whimsy), #812/#814 (WOW
rejoins the rainbow as yellow), #821 (the praxis-card redesign), ADR-0049,
`docs/agents/design-fidelity.md`

## Context

Warriors of Whimsy and Cozy Coven have swapped visual identity **twice**, and
every design artifact we hold was authored before the second swap. The result is
that the artifacts' filenames, section headings and sample bylines all disagree
with what the artifacts actually depict — and #821 read a heading at face value
and inverted the two factions across the entire praxis-card redesign.

The lineage:

1. The faction was originally **`gestalt`** — "gestalt.exe", a pink
   computer-witch desktop. The design system's own token file still carries it
   that way: `--gestalt-pink: #ec5f99`, `--gestalt-border: #f3b6d2`,
   `--gestalt-card-bg: #fffdfa`, and — decisively —
   **`--gestalt-moon-lit` / `--gestalt-moon-shadow`**. The moon-phase metaphor was
   always a token of the *pink* faction.
2. `gestalt` was renamed **Warriors of Whimsy**.
3. **#784** split **Cozy Coven** off, giving it Warriors of Whimsy's
   then-current gold/plum chronicle aesthetic.
4. **#812/#814** gave Warriors of Whimsy a new identity — **yellow**, rejoining
   the rainbow spine.

Designs authored between (2) and (3) therefore label *both* identities "Warriors
of Whimsy" — which is why the vote-stamps bundle files the gold/plum chronicle
under "Cozy Coven", the pink card's sample byline reads "Warriors of Whimsy", and
the two faction-kit projects carry each other's names.

#821 observed the mock's *original* pairing correctly — balloons bundled with the
chronicle, moons with the pink card — and then deliberately instructed a
**recombine** to swap them, because it trusted the heading. Everything downstream
inverted: the moons landed on Coven, the balloons on WOW, WOW's tier ladder
(`…legendary`) landed on Coven, Coven's (`sweet…iconic`) landed on WOW, and an
entirely new yellow token family was authored from nothing. No recombine was ever
needed.

## Decision

**Visual identity is assigned from tokens and metaphor, never from a label.**

| | **WOW** (Warriors of Whimsy) | **Coven** (Cozy Coven) |
|---|---|---|
| Card | cream / gold / plum chronicle | pink marker-sticker card, light **and** dark |
| Widget | googly **balloons** | **moon phases** on a night plate |
| Glyph | `✦` (the one place the retired `✦` survives) | `✨` |
| Tier ladder | `…excellent · legendary` | `sweet · lovely · wonderful · magical · iconic` |
| Caption | `Cast thy Verdict` / `thou dubbed it legendary!` | `how'd this land?` / `magical · YAY!` |
| Register | archaic — *"for the quest"*, *"Sealed by the Court"*, *"here, an illumination"* | cozy-casual — *"all done!"*, *"Drop a happy little photo"*, *"a crew of four"* |

The palettes swap back to match, and **the swap lands first**, as a standalone
token repoint, before any card, stamp or widget work. Coven currently owns
gold/plum across 27 registered surfaces and WOW owns 3; because every surface
already reads `var(--faction-<slug>-*)`, moving the *values* moves all 30 through
the cascade in one reviewable change. Doing card work first would mean building
nine stamps against a palette assignment already known to be wrong, and flipping
the praxis card alone would leave each faction contradicting itself site-wide.

Two things the swap does **not** carry:

- **The rainbow spine is a separate concern from the faction skin.** WOW's yellow
  stop in `--faction-default-rainbow` is spectrum membership, not skin, and does
  not move with the chronicle.
- **Dark mode must be re-derived, not translated.** Coven's dark surfaces were
  tuned for plum-on-black; pink does not clear the same contrast slots by
  substitution.

## Consequences

- **Any future design artifact naming these factions is untrusted.** Read the
  tokens and the metaphor — pink + moons is Coven, cream/gold/plum + balloons is
  WOW — and correct the label in the vendored copy before dispatching work.
- WOW graduates from three override surfaces to a full skin; `wowRendersDefault`
  changes shape and its comment about "themed-and-partly-skinned" goes stale.
- The tier words in `locales/en/votes.json` are currently inverted between the
  two slugs and must swap with everything else.
- This ADR exists mainly so the inversion cannot happen a third time. The cost of
  the second one was a full build wave.
