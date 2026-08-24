# ADR-0039 — Unaffiliated's fill is a gradient, not a hue

**Status:** Accepted
**Date:** 2026-07-16

> **Status (2026-07-17 audit): NOT YET LANDED.** `factionFill`/`na→default`
> routing is not in `utils/factions.ts` yet (the `?? "ua"` fallback still stands).
> ADR dated one day prior to the audit — pending implementation, not drift.

**Relates to:** #636 (this decision), #418 (the `--faction-default-*` token set
this reaches), ADR-0030 (players start unaffiliated — why `na` is on-screen at
all), #232 (albescent went first-class and dropped its `ua` alias — the last
time a slug's identity was untangled from UA's)

## Amendment

**2026-08-24 (#2536): the audit banner above is stale — this landed.** `factionFill()` is
exported from `frontend/src/utils/factions.ts`, `na` maps to `default` in `CSS_KEY`, and the
`?? "ua"` fallback the banner names is gone. The 2026-07-17 note is kept as the historical
record it is; the decision is built.

## Context

`na` ("unaffiliated") is not a faction. It is the blank-slate state: every
character starts there (`character.py` → `starting_faction_slug = "na"`), every
era reset returns everyone to it (`era.reset_faction_slug`), and
it doubles as the sentinel for generic cross-faction tasks
(`task.primary_faction_slug`, `server_default="na"`). It is on screen constantly.

#418 gave it a full visual identity — `--faction-default-*` in both themes,
including `--faction-default-rainbow` (a 7-stop linear gradient) and
`--faction-default-ring` (its conic twin). The design intent is stated in
`index.css`: *"rainbow = every path still open"*. The full spectrum at once,
because no path has been chosen yet.

That identity was unreachable by slug. `factionCssVar(slug, suffix)` resolves
through `CSS_KEY`, which had no `na` entry, and ends in `?? "ua"`. So every
unaffiliated character and every generic task asked for its color and was handed
**UA burnt-amber**. `SPEC-faction-ui-profile.md` §3 and §7B both documented this
as intended (*"a missing `CSS_KEY` entry silently falls back to the `ua`
theme"*) — a bug promoted to a contract.

The naive fix (add `na → default` to `CSS_KEY`) stops the orange but yields
neutral grey everywhere, including the pills and swatches that are solid brand
color for every other faction. That is correct and colorless. The spectrum is
the whole point of the identity, so the interesting question is not "how do we
stop the orange" but "how does a gradient live in an API shaped for a hue?"

Three forces collide:

1. **`factionCssVar` returns one scalar** used in `color:`, `border: Npx solid
   X`, and `background: X`. A `linear-gradient(…)` is only legal in the third.
   Returning the rainbow from the existing helper would invalidate the
   declaration at every text and border call site — text falls back to inherited
   ink, borders vanish.
2. **No ink is legible across a spectrum.** Six fill sites carry white
   (`--color-text-on-accent`) at 7–8px. Measured against the light rainbow's
   stops, white fails WCAG AA on the yellow (2.94:1) and green (3.30:1) stops;
   ink `#1a1209` fails on five of seven; and white on the **dark** rainbow fails
   on **all seven** (1.74:1 at `#4ade80`). This is arithmetic, not tuning: a
   red-to-blue gradient spans a luminance range wider than any single ink can
   sit on. Worse than a uniform miss, contrast would vary *letter by letter* as
   text crossed hues.
3. **A 7-stop linear gradient is illegible at 10–12px.** Three fill sites are
   picker dots and chips that small — ~1.7px per stop reads as mud, not
   spectrum.

## Decision

**1. `na` resolves to the `default` theme; the unknown-slug fallback follows it.**
`CSS_KEY` gains `na: "default"`, and `factionCssVar`'s terminal `?? "ua"` becomes
`?? "default"`. An unregistered slug now degrades to neutral grey rather than
impersonating UA. This makes `SPEC-faction-ui-profile.md` §3 and §7B's
"falls back to `ua`" claims false; both are corrected in the same change.

**2. Scalar contexts stay neutral grey.** `--faction-default` (`#6b6a7a` light /
`#8b8aa0` dark) is what text and borders get, per #418's own note that the
neutral hex is the scalar stand-in. Grey is the accepted placeholder where a
gradient cannot go.

**3. Fills go through a new `factionFill(slug, shape)`, not `factionCssVar`.**
Only `na`'s fill is a gradient; every other faction returns its solid hue for
every shape. The helper picks the token by the *shape of the surface*:

| shape | `na` gets | everyone else |
|---|---|---|
| `"bar"` | `--faction-default-rainbow` (linear) | `--faction-{key}` |
| `"dot"` | `--faction-default-rainbow-conic` (conic) | `--faction-{key}` |
| `"pill"` | rainbow frame + paper interior + ink | `--faction-{key}` + white |

The `"dot"` row named `--faction-default-ring` — a *hard-wedge* conic — until
#1127 (epic #1219) deleted that token and pointed every na circle at the smooth
`--faction-default-rainbow-conic`. This decision is unchanged: a dot still takes
a conic, because a 7-stop linear is mud at 10–12px. Only the cut changed, and
for a reason outside this ADR's scope — all seven light stops sit inside a
WCAG-luminance band of 0.184, so hard wedges of near-equal value merged into one
dark band in light mode. `"rule"` was added to the helper later (#983) and is
not in the table above.

**4. Text-bearing pills frame the rainbow rather than fill with it.** The
rainbow becomes the pill's border via `border-box`, with the label on a
`--faction-default-card-bg` interior in `--faction-default-card-text`. Full
spectrum visible, text on paper, AA in both themes. This is not a new idiom —
it is the one `DefaultTaskCard`, `FactionAvatar`, and `DefaultMobilePraxisCard`
already use for `na` (rainbow wrapper, inner card surface).

**5. `na` stays out of `FACTION_FALLBACKS`.** `factionColor('na')` already
returns `#6b6a7a` via its unknown-slug fallback, which is exactly
`--faction-default`'s light value — correct today. Adding the registry row would
leak `na` into `getAllFactions()`, and thence into `DefaultProposeTask`'s
faction picker as a selectable "Unaffiliated" option. `na` is a state, not a
faction; it does not belong in a list of factions.

## Alternatives considered

**Add `-fill` / `-ring` suffixes to the §3 token contract** and keep reading
through `factionCssVar(slug, 'fill')`. Reuses the existing helper and needs no
new API. Rejected: it requires `--faction-ua-fill: var(--faction-ua)` and a
`-ring` twin for all seven real factions in both themes — ~32 declarations of
pure indirection for values that never vary, to make one faction special. It
also pads §3's contract with pass-throughs, so the table stops being an honest
list of what every faction genuinely owns. One special case is better spelled
in one place.

**Rainbow-fill the pills with white text anyway.** Rejected on measurement: 2/7
stops fail in light, 7/7 fail in dark, bottoming at 1.74:1. That is illegible,
not stylized.

**Linear gradient at every fill site, including the 10–12px dots.** Rejected:
cheaper to write, but renders as mud at that size and reads as a rendering bug
rather than an identity.

**Leave the scalar grey and call it done** (`CSS_KEY` entry only). Rejected as
under-delivering: it fixes "not orange" but discards the spectrum that is the
entire point of #418's identity.

## Consequences

- `na` is the only slug whose fill is shape-dependent. A new faction registering
  per §4's checklist is unaffected — `factionFill` returns its solid hue for all
  three shapes with no extra tokens.
- Twelve fill call sites move from `factionCssVar(slug)` to
  `factionFill(slug, shape)`. The six `"pill"` sites spread a style object
  rather than assigning `background:`, since the frame needs `background` +
  `border` + `color` together.
- Choosing `shape` is a judgement the call site makes and can get wrong (a
  `"bar"` on a 10px dot compiles fine and looks bad). Accepted: the alternative
  is inferring geometry from CSS, which is worse.
- **Pre-existing, untouched:** white-on-fill already fails AA for `wow`
  (3.15:1) and `snide` (2.72:1). This ADR does not make that better or worse and
  deliberately does not fix it — a faction palette correction is its own change
  with its own question ("is the doc wrong, or did the color regress?").
