# ADR-0085 — S.N.I.D.E. is not an always-dark faction; it has three registers

**Status:** Accepted
**Date:** 2026-08-24

**Relates to:** #1023 (the task card moves onto the clipping's `-note-*` family,
which FLIPS — the moment the premise stopped being true), #2065 (the flyposted
wall, and the edge/shadow that carry a panel on it), #2066 (the black slab is
pasted ON the wall and stays invariant), #2173 (acid never touches paper — the
censor plate), #2177 (the composer and the praxis card take the wall;
`-wall-credit` minted), #2227 (`-paper` is retired as a GROUND and stays an ink),
#2287 (the field desk's credential panel), #2302 (one offset print strength),
#2343 (the faction page's hero and four panels), #2361 (the rail wears the
viewer's faction through `railFaceVars`), #2368 (the hero medallion), #2563 (the
open "bright lime on white" report — not resolved here), #2631 (this decision),
ADR-0061 (a veil stays neutral), `WORLD_ZERO_STYLE.md` §3 and §6

## Context

Six surfaces asserted the same sentence in their own docstrings:

> SNIDE is ALWAYS DARK — its `--faction-snide-*` tokens are identical in both
> themes.

It was true when it was written and stopped being true at #1023 and #2065.
`--faction-snide-wall` is `#efece3` by day and `#0a0a0b` by night;
`--faction-snide-note-paper` is `#f4f1e8` / `#14110b`. Two whole families flip.
What does *not* flip is `--faction-snide-ink` (`#14110b`, 16.33:1 in both
cascades) and the `-card-*` slab (`#14110b` / `#0c0a07`) — and those are what the
six surfaces were painted with, which is why each of them read as a dark island
on a cream page in light mode.

The owner then ruled the same way five times, on five different surfaces: #2227,
#2287, #2343, and twice more in the 2026-08-24 grill ("S.N.I.D.E. hasn't been
always dark in a while"). Five identical rulings on five bug reports is the tell
that **one rule is missing, not that five surfaces are broken**. Nothing in the
repo said which register a mark should take, so every new S.N.I.D.E. surface
re-derived it from a docstring that was wrong, and the sixth arrived carrying the
worst mechanism of the three — an explicit `dataTheme: 'dark'` pin, which freezes
every alias inside a container regardless of what the token declares.

## Decision

### 1. S.N.I.D.E. flips with the viewer's theme. No S.N.I.D.E. surface pins one.

There is exactly one faction in the app whose ground is invariant by design, and
it is Singularity: a terminal is black, and `--faction-singularity-card-bg` is
`#050f08` in both cascades. Its `SingularityProfileBody` pin stays.

A `dataTheme` pin on a faction whose tokens flip is not merely redundant, it is
*unfixable from inside*: no token choice below the pin can be right, because the
pin decides which half of every token the container sees.

### 2. The three registers, and what each is for

| register | tokens | flips | what it is |
|---|---|---|---|
| the WALL | `--faction-snide-wall`, `-wall-deep`, `-wall-text`, `-wall-credit`, `-wall-notice`, `-wall-alarm`, `-note-*`, `-composer-*`, `-slip-*` | yes | the flyposted GROUND and every ink read on it |
| the PRESS | `--faction-snide-ink`, `-paper`, `-acid`, `-acid-deep`, `-pink` | no | the PIGMENTS. Inks, fills and the small opaque objects printed with them |
| the SLAB | `--faction-snide-card-*` | no (near-black either way) | the black clipping pasted ON the wall |

**A large ground is the wall's.** A page, a header, a panel, an empty state, the
rail's sheet: `--faction-snide-wall`, with `--faction-snide-note-wall-edge` as
its hairline and the uniform 40% offset print register (#2302) as its shadow. The
edge and the shadow are **load-bearing, not ornament** (§6, #2065): the page's own
ground is the same wall, so they are the only thing separating a panel from what
it is pasted to.

**`-ink` is not deleted and does not change.** It is an ink, and it is also the
*plate* acid carries: acid as TYPE on the light wall is 1.03:1 and there is no
darker acid to reach for — `-acid-deep` only gets to 2.30:1 — so per §3 the
GROUND moves and the black plate becomes a censor bar by day and dissolves into
the wall by night (#2173). That asymmetry is the ruling, not a bug.

**`-paper` stays an ink.** #2227 was right to retire it as a ground and this
record does not bring it back. A second cream token with one value is not a
second stock.

**A mark that brings its own stock does not re-measure when the page changes
stock.** The ransom slip, the hero's motto sticker, the badge medallion, the
mugshot, the ransom scraps and the stat chits are all press-on-press pairings —
15.55:1 in both cascades — and they are correct on any wall.

### 3. Which surface takes which

| surface | ground | ruled by |
|---|---|---|
| task card, praxis card, both detail mastheads | wall + `-note-*` | #1023, #2177 |
| faction page (hero + four panels) | wall + `-note-*` | #2343 |
| praxis composer, character creation | wall + `-composer-*` | #2177, #2349 |
| mobile field desk credential panel | wall + `-note-*` | #2287 |
| character profile | wall + `-note-*` | #2631 |
| the desktop rail | wall + `-note-*` | #2631 |
| the jobs slab, the task/praxis card ON a detail page | `-card-*` | #2066 |
| avatar, seal, score stamp, comment `onAccent`, vote amp | press | standing |

### 4. The rail is one override inside a shared seam, never a fork

`railFaceVars` (`components/layout/Sidebar.tsx`) hands all eight skins the
`-card-*` family, and that is right for seven: a faction's card sheet is the
stock its chrome is made of. S.N.I.D.E. is the one where it is not — its sheet is
the slab pasted *on* its chrome. So four colour locals are overridden **inside**
that function (`--rail-paper` → `-wall`, `--rail-ink` → `-note-ink`,
`--rail-quiet` → `-note-muted`, `--rail-line` → `-note-wall-edge`) and the other
seven keys return byte-identical values. `--rail-radius` and `--rail-face` stay
on the card family: a radius and a typeface have no cascade to be wrong in.

**An unaffiliated viewer still declares no local at all**, which is that seam's
acceptance criterion (#2361) and is untouched by this record.

### 5. Re-measure on the ground a mark composites to; mint a NAME beside a rung rather than repointing one

Every ink on these surfaces was measured against an invariant black. Moving the
ground invalidates the reading, not the token. Where a reading fails, the answer
is the rung that already exists at the wall end of the same hue — `-wall-credit`
(7.71:1 / 11.36:1) for the green, `-note-pink-ink` (6.67:1 / 7.41:1) for the pink,
`-wall-alarm` for the red — spent as a **second name**, because `-acid-deep` and
`-pink` have other readers whose ground really is the press.

#2631 found one such failure that was not on the list: the rail's level track.
`--faction-snide` is `#6fae00` by day and reads **1.87:1** against the track's
groove on the light wall, under 1.4.11's 3:1 for a drawn mark. It ramps
`-wall-credit` (6.28:1 / 9.22:1) instead. No token was minted for any of this.

## Consequences

- The character profile is no longer a black rectangle in a light-mode page, and
  a S.N.I.D.E. member's rail no longer reads as a black column beside one.
- `factionContrast.test.ts` carries the guard, in two seams: exactly one
  `dataTheme` pin exists in the whole tree, and no S.N.I.D.E. page or panel
  ground resolves to `-ink` or `-card-bg` outside a named inventory of the marks
  that bring their own stock. The seventh surface written from a stale docstring
  fails there rather than in a screenshot.
- **In dark mode this is close to a no-op**, and "close to" is the honest word:
  the profile's ground goes `#14110b` → `#0a0a0b` and its quiet ink `#d8d6c8` →
  `#cfcdbf`. Every dark pairing stays above 7:1.
- #2563 ("bright lime on white in light mode") is **not** resolved. Its site is
  still unidentified, and every acid-on-wall site this record touches carries the
  plate. The rail change would have added a sixth instance of exactly that
  symptom, and §5 is why it does not.
