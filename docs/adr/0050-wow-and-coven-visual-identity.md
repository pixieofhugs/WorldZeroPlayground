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
| Tier ladder | `a start · quite solid · jolly good · splendid! · legendary!` | `sweet · lovely · wonderful · magical · iconic` |
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

## Field notes, folded in from the vendored bundle (#844)

The praxis-card epic vendored its design sources at `.design-sync/praxis-cards/`
for the life of the epic, with a `LABELS.md` crib restating this ADR at the point
of use. That directory is deleted by #844 — the repo does not accumulate design
snapshots (`docs/agents/design-fidelity.md`). Three things it recorded proved
load-bearing during the build and outlive it:

- **The artifacts are labelled backwards — go by tokens and metaphor, never by a
  filename, a section heading or a sample byline.** This is the decision above;
  it is repeated here because it was the single fact every slice had to be told.
- **The moon phases are filed under `WowVote` in the handoff's
  `FactionVoteWidgets.jsx`, and they are Coven's.** The balloons are WOW's. The
  bundle's own `README.md` said the opposite ("the approved Wow widget is the
  moon-phase `WowVote`") and the prototype `.dc.html` contradicted it at its own
  `COZY COVEN (WOW)` section. The prototype wins; so does this table.
- **The retired `✦` survives in exactly one place as a faction mark:** WOW's
  TOTAL MARK on the score stamp, in
  `frontend/src/components/praxisCard/scoreStamp/WowScoreStamp.tsx`, pinned by
  `scoreStamp.test.tsx`. (`✦` still appears elsewhere as generic ornament —
  Albescent's sparks, the level-up popup — that is not the identity device.)

**Where the un-vendored sources live.** Neither faction kit was ever vendored;
both are DesignSync projects, and both are misnamed in exactly the way this ADR
describes:

| DesignSync project | Files named | Actually |
|---|---|---|
| `d0a6fdd7-a2f3-4f61-834a-3a06ab4acf07` | "WoW Faction Kit" | **`wow`** — cream/gold/plum |
| `32c7198b-e7e7-43be-ad4f-590309b1093d` | "Warriors of Whimsy …" (nine surfaces) | **`coven`** — pink |

Yes: the project whose every file says "Warriors of Whimsy" is the *Coven* kit.
Subagents cannot reach `claude.ai` design URLs — the orchestrating session must
read them and paste the findings into the dispatch prompt.

## Resolved after the epic's close (#844)

**WOW's tier ladder — the design bundle wins (owner ruling, 2026-07-21).**
At the epic's close two readings disagreed:

- the design bundle drew `a start · quite solid · jolly good · splendid! ·
  legendary!`;
- issue #840's body, the vendored `LABELS.md` and `WORLD_ZERO_STYLE.md` all said
  `… excellent · legendary`, and that is what shipped —
  `a start · solid · good · excellent · legendary`, which is also the Everymen
  ladder.

Three sources against one, and the one won: the archaic register *is* WOW's
chronicle voice, and #840's own sample voted string (`thou dubbed it
legendary!`) carries the exclamation mark that only the bundle's ladder
supplies. Duplicating the Everymen ladder gave WOW no voice of its own.

`frontend/src/locales/en/votes.json` now ships the bundle's ladder, and the
keys were renamed with the values (`solid` → `quite-solid`, `good` →
`jolly-good`, `excellent` → `splendid`) so no key describes a value it no
longer holds. `chrome.wow.picked` (`thou dubbed it {{label}}`) is unchanged —
only the `{{label}}` values moved. Coven's
(`sweet · lovely · wonderful · magical · iconic`) was never in dispute.
