# ADR-0083 — Albescent is one ornament vocabulary over na, not a skin per surface

**Status:** Accepted
**Date:** 2026-08-23

**Amends:** **ADR-0048** (Albescent unfreezes one surface at a time, as designs
land) — its premise stands and its *mode* is closed; **ADR-0017 ruling 7**, whose
always-light vellum clause is retired below.
**Relates to:** ADR-0027 (Albescent is a secret society — the cut voice is
untouched), ADR-0039 (the na/default identity is the rainbow), ADR-0046 (the
freeze ADR-0048 reversed), ADR-0066 (one rainbow; the brand palette retired into
the na spectrum), ADR-0082 (the redaction the collapsed tile still carries),
#2401 (the five undesigned decisions this answers), #2496 (the epic and its
rulings), #2506 (this decision), #2632 (§8 amended: the reveal register is
deleted and #1891 ruling 1 with it)

## Context

Every Albescent surface in this repo is a wrapper over `Default`, and the
wrapping had never been designed as a system. It had been decided per surface, by
whoever built that surface — differently-named wash classes, `z-index` numbers
chosen locally, a user-media rule rediscovered once per surface, and a ground
that was about to move underneath all of it. #2401 catalogued that and asked for
a design instead of one more instance.

Two failures made the cost concrete rather than theoretical.

**The overlays diverged because nothing held them together.** The praxis card
wore a rotated repeating linear ramp, multiplied and faint — stripes — and the
task card wore blurred radials at roughly twice the strength — cloud. Two cards
meant to be the same paper, two idioms, two strengths. The owner reported it as a
bug, and it is one: not a value that drifted, but two independent drawings of the
same idea that had no reason to agree.

**"Too much" was diagnosed as "too visible", and that was the wrong reading.** The
praxis card stacked *three* spectrum treatments at once — a blurred aurora, a
turning conic annulus and a drifting striped spectrum, on one small card. The fix
is **one ground, not a quieter one**. Albescent's ground is a spectrum and is
meant to read as one in both themes; a result that reads as "is something even
there?" is a miss in the other direction, and §6 explains why that direction is
the dangerous one.

What follows is the vocabulary. It is written so the next person to touch an
Albescent surface inherits these rules rather than rediscovering them.

## Decision

### 1. The shape: the na component plus ornament, never a skin

An Albescent surface is the `Default*` component **rendered whole**, inside a
wrapper element carrying an `.alb-*` class, plus **one lazy row** in
`frontend/src/factions/albescent.ts`. Strip the wrapper class and the na surface
is back byte for byte — that parity is what each wrapper's test asserts, and it
is the definition of "not a skin".

The ornament mounts one of two ways, and the choice is a clip question:

- **A sibling span inside the wrapper**, when the page is the right thing to clip
  the light to.
- **A named slot on the na component** — `ornament`, `identityOrnament`,
  `worthSlot` — when the light must clip to the *sheet* rather than the page, or
  must land inside a box only na draws. The slot exists so na is not forked to
  get an ornament into its own anatomy; na passes nothing and pays nothing.

**The mark is never part of the wrapper.** `FactionSigil` dispatches per slug,
and the avatar badge stays na's closed ring: a labyrinth on every byline would
render to every viewer at every size and un-hide the society outright (ADR-0027).

**A repaint is forbidden, and that is the reason the wrapper shape exists at
all.** `factionCssVar('albescent')` resolves to `--faction-default-*` and stays
that way. Giving Albescent colours of its own would put it back among the visible
factions; the delta from unaffiliated is ornament and motion, never livery.

### 2. The ground is a token, not an overlay — and the arity must match

The ground is `--faction-default-card-sheet` with its two siblings `-blend` and
`-clip`, declared as a **matched triple on a wrapper**. Every na surface inside
inherits it — plates, cards, panels — without any of them being named. That is
what makes the ground one override rather than one per surface, and it is why the
two cards in the Context can no longer diverge: there is one drawing.

**The three properties move together or they do not move**, because a CSS
background is a list in *three* properties at once — image, blend mode, clip —
and **CSS cycles short lists rather than padding them**. Albescent's light sheet
is one image layer and its dark sheet is several; a lone
`background-blend-mode: multiply` written beside a multi-layer image would be
handed one value and cycled across all of them — right by accident in one
cascade, wrong in the other. Any consumer appending its own layer (a spectrum
border, say) appends to all three lists for the same reason.

`-clip` is `padding-box` for the sheet's own layers, and every consumer writes
`background-clip: var(--…-sheet-clip), border-box`. That trailing value is
load-bearing: the background *colour* is clipped by the list's bottom-most value,
so it still runs out to the border box and shows through a translucent hairline,
while the sheet's layers stop at the padding box.

**Never selector surgery.** Reaching into descendants to paint a ground is what
produced the per-surface washes; the token reaches them all, and the wrapper is
the only thing that names Albescent.

### 3. Everything dispatched moves; nothing site-wide does

There is **no chrome/readout distinction** in this vocabulary. Bands, hairlines
and dividers move, and so do progression rings, score totals, level bars and
badge medallions. A readout is not exempt because it carries a number.

The other edge is as firm: **a surface that is not in a manifest does not move
for Albescent.**

`LevelUpPopup` is the worked example, and it is the example because it looks like
a candidate and is not one. It paints from `--faction-default-stop-*` — the na
spectrum's seven stops as indexable scalars — so it *already* carries the
spectrum, on every player's screen. It is not registered in any faction registry
and is not resolved through `pickVariant`; it renders identically for a member
and for a stranger. It stays still. A site-wide celebration that shimmered only
for members would announce membership to everyone in the room.

The mechanism makes this true by construction rather than by discipline: the
marker that animates ornament rides **only on a wrapper the manifest dispatches**,
so "is this Albescent's surface?" and "does it move?" are the same question. A
surface that stops being dispatched stops moving with no edit anywhere.

### 3a. One marker, not a list of wrappers — and `:empty` is the ornament/frame line

na's spectrum has two named cuts — `.spectrum-rule` (the linear ramp: bands,
hairlines, dividers, progress fills) and `.spectrum-dial` (the conic wheel: rings
and annuli) — and Albescent animates them through **one marker class,
`alb-moves`, worn by every Albescent wrapper**, rather than through a list of
wrapper scopes. The first dresser named a single surface; a long selector list
restated in several rule bodies is a place for one entry to be forgotten
silently, and forgotten here means a surface standing still with no test failing.

**`:empty` separates two different objects wearing one class, and this is the
part to inherit.** `.spectrum-rule` is worn by two kinds of thing:

- **Ornament** — an `aria-hidden` hairline, band, chip or progress fill with **no
  children**. This is what "the na spectrum" means on these surfaces, and it
  moves.
- **A frame** — a padded ramp with an opaque inner sheet **holding content**. It
  stays still.

Three reasons a frame stays still, any one of them sufficient: a travelling child
inside a frame paints over the content the frame frames, and lifting that content
back into the positioned layer restacks a panel holding live controls; the clip
such a child needs is `overflow: hidden` on a box whose contents are galleries,
CTAs and cards rather than an empty band; and where a frame already carries an
edge of its own, moving the ramp underneath it puts two spectra at two speeds on
one object — which is exactly what §3b forbids.

The rule is inherited from the selector rather than from a list: **give a ramp
children and it is a frame.** No frame is ever the only spectrum on its surface,
because its surface's own carrier travels — so nothing is left standing still by
this line.

### 3b. One carrier per object

An object that carries the spectrum carries it **once**, as a 3px border at full
strength — and whatever bar, strip or hairline was previously doing that job
**comes off**. Two marks on one object is the failure mode, and it is a failure
of reading rather than of taste: a card with a moving stripe added beside its na
furniture reads as the na card with a stripe, not as an object the spectrum is
holding. A carrier is also never dimmed — whatever a shared ring's default
strength is, a carrier states full.

The mark is a masked ring rather than a real border wherever the box belongs to
na, for two reasons that land together: growing na's own geometry to a 3px
transparent border is an edit to na, and a `border-image` does not clip to
`border-radius`, so the mask idiom is what draws a rounded 3px frame at all.

### 4. Never animate a gradient parameter

An `@property` angle inside a `conic-gradient()` re-rasterises the whole gradient
every frame. `transform: rotate()` on a **static** conic rasterises once and
spins on the compositor, and is pixel-identical over a 360° loop. Travel is the
same shape: translate a pre-painted, wider gradient **child** inside
`overflow: hidden` rather than walking `background-position`, which is not a
compositor property.

**This is what makes §3 affordable.** "Everything moves" costs about what "chrome
moves" would, because the expensive thing was never the number of moving parts —
it was re-rasterising a gradient per frame. Ruling 3 and this ruling are one
decision seen from two sides.

A seamless travel needs a ramp **cut to close**: the seven-stop sweep's last stop
is not its first, so tiling it twice puts a violet-meets-red seam through every
cycle. That is what the loop-cut token buys, and it is why a turning ring can
`background-image: inherit` — two tiles of a wheel is a wheel — and a travelling
band cannot.

Reuse a keyframe rather than minting a byte-identical twin under a new name.
`spectrumRingCollapse.test.ts` holds this rule over every `alb-` keyframe.

### 5. The light/dark asymmetry is deliberate

**Light washes the hero alone. Dark blooms the hero, the plates and the cards.**
This is ruled, measured and intended. It is written down here because the next
person to read the two selectors will otherwise assume one theme is missing a
rule and "fix" it.

Two reasons it is not symmetric:

- **The blend modes are opposites.** The light sweep *multiplies*, so it can only
  darken a near-white sheet; the dark bloom *screens*, so it can only lift. The
  same reach does not produce the same reading, so the same reach is not the
  goal.
- **The depth is set by the tighter pairing, and the two themes' tighter pairings
  are different tiers.** On the dark card the ceiling is the muted prose tier,
  not the primary ink. Pitching the bloom to land the *ink* where intuition
  suggests would take a whole prose tier under AA. The dark centres are spread
  and their falloff kept short for the same reason: stacked hotspots eat the
  remaining margin.

Both themes were measured composited on the real sheet, and both clear. The
numbers live beside the declarations; what belongs here is that the asymmetry is
a design decision with a contrast argument under it.

### 6. The ground is the rest state, and "subtler" has a floor

The ground is **static and visible in both themes**, so it already *is* the rest
state. There is therefore:

- **no `prefers-reduced-motion` branch on the ground**, and
- **no separately deepened reduced-motion variant.** An earlier draft had one; it
  was solving a problem created by the wrong framing of "too much" (see Context)
  and is withdrawn.

A reduced-motion viewer sees Albescent's spectrum, just not its movement.

**The stranded viewer lands in exactly the same place, and that is a property
worth stating.** Motion lives on a deferred sheet (`motion.ornament.css`, which
arrives with the faction chunk) and every animated layer exists **only inside**
the `prefers-reduced-motion: no-preference` gate. Stranded — reduced motion, or
that sheet never delivered — there is no animated child at all, and what remains
is each mount's own background drawn in its final colours at its final size.
**Both viewers still see Albescent.** Nothing in this vocabulary carries meaning
through motion alone, and a component may not inject a stylesheet or write an
inline `animation:` precisely because either would bypass that gate.

**This holds only while the ground reads as a spectrum, so "make it subtler" is a
change with a floor.** Quieten the ground past legibility and the reduced-motion
viewer and the never-delivered viewer both see the plain na surface: the tell
becomes motion-only, and the guarantee in the paragraph above quietly becomes
false — with nothing in CI able to see it, because every contrast sweep, every
lint and every census still passes on an invisible ground. The floor is *the
spectrum being legible as a spectrum*, not a number. Anyone lowering it owes this
paragraph an answer.

### 7. The avatar is size-gated, and the gate is deliberately high

The avatar ring renders at and above a threshold on the avatar's rendered
dimension and is **absent** below it. The constant lives in
`frontend/src/components/avatar/AlbescentAvatar.tsx`; what belongs here is why
there is one at all.

**Every other tell dresses a surface a viewer is looking *at*. An avatar renders
*beside other players'*** — comment leaves, praxis bylines, roster rows, duel
banners. One turning ring in a column of still ones is a **spotlight rather than
a shimmer**: it announces membership to somebody who was reading a thread, not
looking for a society. That is the opposite of hiding in plain sight, and it is
the only Albescent surface whose reasoning is not "reveal it to someone already
looking".

Two consequences fall out of the same gate. A thin band turning on a small disc
reads as a **loading spinner** — the browser's own idiom for "waiting" — and is
below the legibility floor besides. And below the gate the ornament is **never
rendered** rather than stilled, so a roster never mounts a column of clocks and a
byline costs exactly what na's costs.

**The threshold is set above every mount that exists today, so the tell ships
dormant. That is the ruling, not an oversight.** A gate low enough to light the
single largest disc in a roster column would produce precisely the
column-of-others case the gate exists to prevent, merely with the biggest disc in
the column. It lights up on its own the first time a surface shows one player's
disc large and alone, with no edit here.

The ring is also **chrome outside the portrait**, which settles a separate
question by construction: it covers the disc's own spectrum band and never the
picture, so a photo disc and a monogram disc are the same amount of Albescent
without anything branching on whether a player uploaded a photograph.

### 8. There is no reveal register — the reveal surfaces take the na sheet

*Amended 2026-08-24 (#2632). This section originally read "the reveal register
flips, and ADR-0017 ruling 7 is amended": it retired ADR-0017's always-light
clause, gave the vellum a dark half aliased to the na card, and closed by ruling
that the register **stays**, reached only by the surfaces that are the reveal.
The first half stands. The last clause is reversed below, and the amendment
supersedes it in place rather than by a new record.*

ADR-0017 ruling 7 prescribed an **always-light** Albescent register — identical
values in both cascades, the mechanism singularity uses to stay always-dark. That
clause is **retired**: a dark-mode reader gets a dark letter. Its other half was
already dead — the `--faction-albescent-card-*` tokens it prescribes were
deleted, and Albescent has rendered as unaffiliated everywhere since.
**Singularity's always-dark is untouched**; this amends a ruling about the
vellum, not about theme-invariant surfaces as a class.

**And there is no longer a vellum to rule about.** Owner ruling on #2632: *the
white aesthetic is purged from the codebase, and Albescent commits entirely to
the new setup.* The four surfaces that were the reveal — the directory tile, the
invitation letter, the metatask seal and the sealed placeholder — take
`--faction-default-card-*` like every other Albescent surface. **The society's
delta is the prism and the motion, not a colour of its own.** The private
register is deleted, and a token census in
`__tests__/albescentPrismSheet.test.ts` keeps its name out of `index.css`.

**Why the register could not simply be re-tinted in place.** All four wrote their
ground as a `background` in the **style attribute**, so no wrapper class could
reach them: §2's whole mechanism is that a dresser overrides
`--faction-default-card-sheet` and the `Default*` surface reads it, and an inline
declaration outranks every stylesheet. They were not missing a class; they were
drinking from a different tap. In light that made the letter a pure-white island
on a cream page — the one part of the kit that never adopted the prism.

**The deletion was smaller than it looked, because only the light half was ever
authored.** The dark half this section minted aliased the na card outright, so
after dark those four surfaces already *were* na; what went is one cascade.

**The tile pays a price and it is charged deliberately.** Collapsing
`AlbescentSelectCard` to a wrapper over `DefaultSelectCard` **deletes #1891
ruling 1** ("the tile keeps its face throughout"). What survives is the
redaction, unchanged and still on one predicate (ADR-0082), and the **conditional
ground**: a redacted tile keeps a flat sheet, because `[REDACTED]` is painted in
its own ground's colour and a bloom makes that 1:1 pairing only approximately
true. **The prism arrives with the reveal** — epic #2496 ruling 8, and the same
call is why the sealed placeholder, which *is* the un-revealed view, stays flat.

**Prism or flat is decided per surface by one question: does the surface read
`factionSheet()`?** The letter does and wears `.alb-prism`; the seal deliberately
does not, because a sticker on an Albescent host would inherit that host's ground
and composite the bloom twice.

## Consequences

**Building a new Albescent surface** is a lazy manifest row plus a wrapper. The
ground, the movement, the reduced-motion story and the stranded-sheet story all
arrive with the vocabulary; none of them is a decision the builder makes again.

**A reviewer has five questions**, and they are five of the sections above with
teeth: does stripping the wrapper class restore na byte for byte; is the ground a
token triple with matching arity rather than selector surgery; does the object
carry exactly one spectrum; does anything animate a gradient parameter; and is
each `.spectrum-rule` mount on the right side of the ornament/frame line.

**ADR-0048's per-surface mode is closed.** Its premise — Albescent is na plus a
deliberate tell, never a repaint — is not merely intact; it is what §1
generalises. What ends is *unfreezing one surface at a time as a design for that
surface lands*: there is now one design, and a surface adopts it rather than
commissioning its own.

**What this does not change.** ADR-0027's cut voice: no surface names itself as
Albescent. (This sentence used to continue "…and the reveal surfaces stay the
only readership of the reveal register"; §8's amendment deleted the register, and
the cut voice is untouched by that.) `factionCssVar('albescent')` still resolves
to `--faction-default-*`.
The manifest stays override-only, so an undeclared surface still falls through to
na — which remains the correct and complete statement of Albescent's appearance
everywhere the vocabulary has not been applied.

**The known sharp edge** is §6's floor. It is the one rule in this document that
no test can hold, because every check still passes on a ground quietened into
invisibility. It is written down because writing it down is the only guard
available.
