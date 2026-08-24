# ADR-0078 — Faction detail collapses to one responsive component per faction

**Status:** Accepted
**Date:** 2026-08-16

**Relates to:** ADR-0056 (task cards), ADR-0058 (task detail), ADR-0063 (praxis
detail), ADR-0065 (the composer), ADR-0067 (praxis cards), ADR-0069 (the
character profile and the duel seal) — the same move, surface by surface.
ADR-0035 established the split all of them narrow.
**Supersedes ADR-0035** for faction detail.
**Closes the collapse programme** opened by epic #1312: `mobileFieldDesk` is the
only `mobile*` component surface left, and it is not a twin.

## Context

`mobileFactionPage` was the last per-faction *component* split of a surface that
also had a desktop counterpart. It looked like the six collapses before it —
eight `mobileArchetypes/*FactionPage.tsx` skins beside eight
`archetypes/*FactionBody.tsx` bodies, symmetric registrations, line counts in the
same order of magnitude (bodies 500–615, pages 255–333).

It was not like them, and the copy is what proves it.

**The two registries held two different content sets.** Coven's body reads
twenty bespoke `coven.*` keys — `manifesto.heading`, `spotlight.label`,
`roster.heading`, `tasks.kicker`, a whole `coven.join.*` flow. Coven's phone skin
read **one** (`coven.mobile.eyebrow`) plus a shared generic set:
`mobile.topMembers`, `mobile.recentPraxis`, `mobile.membersEmpty`, `mobile.join`.
Snide was the same shape with 34 bespoke desktop keys against the same generic
phone set.

So on a phone, every faction showed **generic chrome in a faction dress**. The
manifesto, the spotlight and the faction's own join flow did not exist there at
all. This is ADR-0069's profile finding again — *"six factions with their own
bespoke desktop profile body showed a stranger's on a phone"* — expressed in copy
rather than in components, and it is why this collapse needed an owner ruling
rather than an engineering judgement: it could not be output-neutral.

The blocker was real and is gone. This sat `needs-design` because WOW had a
`FactionPage` and no `FactionBody`, so there was no merge target for it; #1611
derived `WowFactionBody` from the WOW kit and that gap closed.

## Decision

Retire the surface. Faction detail is **one responsive component per faction**.

Deleted: `pages/factionDetail/mobileArchetypes/` entirely (8 skins +
`shared.tsx`), the `mobileFactionPage` manifest field, its `SURFACE_KEYS` entry
and all seven registrations. `FactionDetail.tsx` drops its
`formFactor === "mobile"` early return and serves both widths from the
`factionBody` dispatch below it.

No dormant revert path is left in the tree — the same call ADR-0056, ADR-0067 and
ADR-0069 each made after their own experiments, for the same reason: a second
implementation kept "just in case" is the drift these records exist to prevent.

## The mechanism this surface needed: none

ADR-0069's carry-forward was that *"one responsive component per faction" is a
statement about the seam, not about how a given surface satisfies it*. The duel
seal needed a shared chassis; the profile needed one `useFormFactor()` read in
`ProfileSkin`.

**Faction detail needed neither, because the responsive layout was already
there.** Every bespoke body's root is `.wz-faction-grid`, and that class has
carried `grid-template-columns: 1fr` under 860px since it was written. Seven
bodies were already single-column at 375px; nothing had ever mounted them there.
`WowFactionBody`'s own header comment says why the class is used instead of a
hand-rolled `1fr 320px` — *"the class carries the ≤860px collapse to one column,
which a hand-rolled grid silently loses"* — and that note turned out to be the
whole migration plan.

Two files did need a form-factor read, and both are named below rather than
generalised into a mechanism.

## Cosmetic deltas collapsed; structural ones survived

ADR-0069's rule, applied to every difference found between the twins: a
*cosmetic* delta is drift until someone can say what it is for; a *structural*
one is a requirement.

**Collapsed to the desktop value:**

- Every faction's generic phone copy, which is the headline change and the point
  of the exercise.
- The phone's own burn wording. `mobile.burnedHint` said the same thing as
  `detail.burned.body` in different words; the neutral platform sentence wins,
  per ADR-0057 — the dress is the faction's, the words are the platform's.
- WOW's `.wow-btn` glisten on the phone join button. The desktop enlist rail
  never carried it; a travelling highlight on one of two renderings of one button
  is drift.

**Survived:**

- **WOW's 46px touch targets**, which #895 requires and which ADR-0069 preserved
  through the duel-seal collapse for the same reason. Applied at both widths on
  `WowFactionBody`'s roll row rather than behind a `useFormFactor()` read: it is
  a floor the laptop row already clears, so a branch would cost a hook to change
  nothing.
- **The pinned action band.** `MobileStickyBar` moved up a directory to
  `pages/factionDetail/MobileStickyBar.tsx` rather than dying with its
  neighbours. See the limit below.

## The pinned action band has one consumer, and that is a decision

`MobileStickyBar` pins the primary verb above the tab bar and clears the home
indicator via `--tab-bar-clearance` (#495, #1566). All eight deleted skins used
it, and all eight used it for exactly one thing: the **eligible** branch of the
join block. Every other membership state — member, gate, burn — was inline prose
in the page.

Its one consumer now is `DefaultFactionBody`, at phone widths.

The seven bespoke bodies do **not** pin, and the reason is that the thing the bar
was pinning no longer exists for them. The bar paints a bar — neutral
`--color-nav-bg`, a blur, a top rule — because it was designed to hold a bare
button. What each bespoke body puts in front of an eligible viewer is not a bare
button: it is a *drawn join plate* — Coven's slip band over candle-lit ward
paper, Snide's dispatch letterhead, WOW's gilt enlist rail — with a kicker, a
title, body copy and its own frame. Lifting a drawn plate into a neutral bar, or
splitting each plate so its verb pins while its prose stays behind, is a design
decision about seven skins. This record does not make one, and the collapse does
not require it: the plate is still on the page, at the foot of a single column,
in the faction's own voice, which is more than a phone had before.

`ponytail:` the ceiling is "the pinned band serves the fall-through skin only".
The upgrade path is #951's join/gate design, which is the record that should say
where a *drawn* join plate belongs on a phone; when it lands, the bespoke bodies
either adopt the bar or replace it, in one pass, deliberately.

## The join asymmetry this had to fix first

`DefaultFactionBody` carried **no join block at all**. Its own `ponytail:` note
explained why — the factions falling through to it were waiting on #951 — and
that note was stale: WOW stopped falling through when #1611 landed, leaving
Albescent as the only faction there.

Meanwhile `DefaultFactionPage`, the phone twin queued for deletion, *did* carry
one: sticky Join, confirm step, confirm-switch copy, the soft gate, ADR-0019
gating.

**So you could join from a phone and not from a laptop, and collapsing the pair
without acting would have taken the phone's away too.** The block was lifted into
`DefaultFactionBody` first, in its own commit, keeping the `mobile.*` catalog
keys it arrived with — those key names now misdescribe a responsive body, and
renaming them is a catalog change this work deliberately did not make.

This is not inert. `albescent_level_required = 8` gates who may *become*
Albescent — `choose_faction` raises `faction_albescent_not_eligible` for an
account below the bar — but Albescent's `can_always_rejoin` resolves a revealed
account's status to `can_return`, which the hook reads as `eligible`. A revealed,
eligible account genuinely could not join Albescent from a desktop and now can;
an ineligible one gets the backend's 403 in `membership.joinError`, which is the
same path the phone always used. `DefaultFactionBody` is also the fall-through
for any future faction that ships without a body, so the gap was never
Albescent-specific.

## Two heroes reached a phone for the first time

The deleted early return sat *above* the `factionHero` dispatch, so a phone never
reached a faction hero either. Six of the seven lay their masthead out with
`flexWrap: "wrap"` and reflow on their own. Two did not:

- `SingularityFactionHero` is the one hard `1fr 240px` grid in the set. It takes
  a single `useFormFactor()` read — one branch, in the one file that needs it.
- `SnideFactionHero`'s identity column had `minWidth: 300` inside a band whose
  own `--space-3xl` gutters leave 263px at 375px. `min(300px, 100%)` is inert
  wherever there is room.

Both are JS because the CSS-only forms are media queries in `index.css`, which
the PR that found them did not own. Neither changes a desktop rendering.

## Consequences

- `SURFACE_KEYS` no longer advertises `mobileFactionPage`. A faction cannot
  register against it. The kit is **20 dispatched surfaces**, and
  `docs/kit-structure.md` says so.
- **`mobileFieldDesk` is the only `mobile*` component surface left, and the
  licence granted here does not reach it.** It is not a twin: `pages/FieldDesk.tsx`
  shows the account's roster of lives on a laptop and the carried life's home on
  a phone — different content, different job (#1320). Collapsing it would need
  its own record on its own evidence, and the evidence would have to be that the
  two screens answer the same question, which they do not.
- `surfaceDispatch.test.ts`'s `mobileFactionPage` row **moved to `factionBody`**
  rather than being deleted — the same move ADR-0067 made for
  `mobilePraxisCard`. It carries the identical seven slugs, which is itself the
  cleanest statement of the finding: the phone registry and the body registry had
  the same shape and different content.
- `mobileArchetypeSlots.test.tsx` and `uaMobileDispatch.test.tsx` are replaced by
  `factionDetailResponsive.test.tsx`, which walks **one registry at both form
  factors** through `FactionDetail` itself. Strictly stronger, and here for a
  reason the duel seal did not have: two registries holding two content sets
  could both be green while a phone spoke in the wrong voice, and this test's
  central assertion is that it does not.
- The retired skins' `factions:mobile.*` and `<slug>.mobile.*` keys lose their
  readers, except the handful `DefaultFactionBody`'s join block still uses. They
  are left in the catalog on purpose; deleting them is #1909's job.
- **The evaluation window is closed.** A second faction-detail implementation
  reappearing is drift, not an experiment.
