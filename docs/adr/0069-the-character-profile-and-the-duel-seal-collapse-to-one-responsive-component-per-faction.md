# ADR-0069 — The character profile and the duel seal collapse to one responsive component per faction

**Status:** Accepted
**Date:** 2026-07-30

**Relates to:** ADR-0056 (task cards), ADR-0058 (task detail), ADR-0063 (praxis
detail), ADR-0065 (the edit-praxis composer), ADR-0067 (praxis cards) — the same
move, surface by surface. ADR-0035 established the split all of them narrow.
**Supersedes ADR-0035** for the character profile and the duel seal.
**Supersedes ADR-0067's scope clause**, which named these two surfaces as keeping
their distinct mobile archetypes.

## Why one record for two surfaces

Every previous collapse got its own ADR, and ADR-0067 says explicitly that
unifying another surface "needs its own record". Two are recorded together here
because they were built in the same batch against the same seam, and because the
interesting content is not the second instance of a settled pattern — it is that
the two surfaces reached the same decision from **opposite** starting conditions.
The duel seal was fourteen files of near-duplicate. The profile was two files and
six factions with nothing at all. Separate records would have said the same
sentence twice and hidden the contrast.

## Context

`mobileProfile` and `mobileDuelSeal` were the last two `mobile*` surfaces
carrying a per-faction *component* split. ADR-0035 established that axis
deliberately, and ADR-0067 — the most recent collapse — reaffirmed it for both:

> field desk, faction page, profile and the duel seal keep their distinct mobile
> archetypes and their `mobile*` surfaces.

That sentence was true of the duel seal and **false of the profile**, in a way
nobody had checked.

### The duel seal: fourteen files, one branch

Seven factions each shipped `<Faction>DuelSealConfirm.tsx` and
`<Faction>MobileDuelSealConfirm.tsx`. Every shared slot, token,
contrast-measured ink and both copy modes through `useDuelSealCopy` were already
byte-identical across each pair. The difference was the positioning shell: a
centred bounded card over a scrim on a laptop, a full-bleed sheet on a phone.
Fourteen files carried one branch, plus a scatter of hand-tuned cosmetic deltas
(a medallion 92px vs 88px, a radial glow at `60% 60%` vs `70% 40%`) that had
accumulated because nothing forced the pairs to agree.

### The profile: a surface only one faction ever filled

`mobileProfile` had **one** registration in the entire tree — `wow.ts`.
`CharacterProfile.tsx` passed `DefaultProfile` as `pickVariant`'s fallback, so on
a phone Coven, Snide, Ephemerists, Singularity, Everymen, UA, Albescent and na
all rendered **the na skin**. Six factions with their own bespoke desktop profile
body showed a stranger's on a phone.

The issue that proposed this collapse asserted the opposite — that six factions
"already serve both form factors from one component" — and, on that basis,
guaranteed the work would change no rendered output. Both halves were wrong. The
na-skin fallback was not a design position; it is what a dispatched surface does
when nobody registers against it, and no ADR ever chose it.

## Decision

Retire both surfaces. The character profile and the duel seal are each **one
responsive component per faction**.

Deleted: `pages/characterProfile/mobileArchetypes/` entirely (2 files), all seven
`*MobileDuelSealConfirm.tsx`, both manifest fields, both `SURFACE_KEYS` entries
and all eight registrations. No dormant revert path is left in the tree — the
same call ADR-0056 and ADR-0067 made after their own experiments, and for the
same reason: a second implementation kept "just in case" is the drift these
records exist to prevent.

## The two surfaces needed opposite mechanisms

This is the part worth carrying forward. "One responsive component per faction"
is a statement about the *seam*, not about how a given surface satisfies it.

**The duel seal needed a shared chassis.** `components/duel/DuelSealSheet.tsx` is
the only place the seal reads `useFormFactor()`. A skin hands it its frame in two
parts, and that split is the whole design:

- **`ground`** — the faction's paper: background, ink, face, and any edge that
  survives full-bleed, such as the opponent's coloured spine. Applied at **both**
  widths, so a Singularity terminal is still a terminal on a phone.
- **`card`** — the floating-card chrome: border, radius, the clip that goes with
  the radius, the drop shadow. **Desktop only.** On a phone the sheet *is* the
  screen; a hard offset shadow or a rounded corner at the viewport edge is a card
  pretending it still floats.

Putting `useFormFactor()` inside each of the seven skins — ADR-0056's literal
shape — was considered and rejected: it repeats one branch seven times, which is
the duplication the work existed to remove. A CSS-only fix was rejected too,
because the difference is structural rather than stylistic: desktop has a scrim
element and an extra wrapper level that mobile does not.

**The profile needed no chassis at all.** Each `<Faction>ProfileBody` already
existed and already rendered; what it had never done was render at 375px. The
shared `ProfileSkin` grew one `useFormFactor()` read and stacks single-column,
because its 300px badge rail and 300px identity floor would otherwise scroll
sideways on a phone. Six bespoke bodies reached a viewport they had never been
shown at, and no faction's desktop rendering changed.

## What changed on screen, and that it was a decision

Neither collapse was output-neutral, and both changes were put to the owner and
accepted.

- **Six factions' mobile profiles** now render their own body instead of the na
  skin. This is the direct meaning of "one responsive component per faction"; the
  previous rendering was an unregistered fallback, not a design.
- **The duel seals' hand-tuned phone deltas collapsed to their card values.**
  Coven's, Snide's and Ephemerists' mastheads are left-aligned at both widths
  rather than centred on phones; Coven loses a grab handle a sheet you cannot
  drag had no use for; Everymen's, UA's and WOW's phone size tunings resolve to
  one number. Preserved deliberately: the full-bleed sheet itself, Everymen's and
  UA's pinned action band and scrolling middle (now plain flex regions, free on
  desktop), and WOW's 46px touch targets, which #895 requires.

The rule this settles: a *cosmetic* delta between a desktop and mobile twin is
drift until someone can say what it is for. A *structural* one — a pinned band, a
touch target — is a requirement and survives the collapse.

## The one escape hatch, and its ceiling

`DuelSealSheet` takes a `phoneClassName` applied to the phone shell only. It has
exactly one consumer: WOW's `.wow-seal-actions--mobile`, a rule with no media
query, whose 46px targets #895 asks be kept. Inline styles cannot express "only
under 768px", and applying the class at both widths would restyle WOW's desktop
buttons.

It is marked `ponytail:` in place with its upgrade path: wrap that rule in
`@media (max-width: 767px)` in `index.css` and the skin can carry the class
itself, at which point the prop goes. Recorded here so it is understood as a
known ceiling rather than a second form-factor mechanism.

## Consequences

- `SURFACE_KEYS` no longer advertises `mobileProfile` or `mobileDuelSeal`. A
  faction cannot register against either.
- **Two `mobile*` component surfaces remain: `mobileFactionPage` and
  `mobileFieldDesk`.** ADR-0035's reasoning still governs both. The licence
  granted here is scoped to the character profile and the duel seal and **does
  not generalise** — unifying either survivor needs its own record, on evidence,
  the same way each collapse so far has.
- `surfaceDispatch.test.ts` and `wowRendersDefault.test.tsx` walk `SURFACE_KEYS`
  and were updated by dropping the retired rows, not weakened.
  `duelSkinSlots.test.tsx` previously walked two registries; it now walks one at
  **both** form factors, so it newly catches a phone shell that drops a slot —
  something two separate component lists could not catch for a faction
  registering only one.
- **A dispatched surface with one registration is a finding, not a shape.**
  `mobileProfile` advertised eight slots and filled one for two years' worth of
  faction work. The lesson is not specific to profiles: when auditing a surface,
  count its *registrations*, not its files. A file listing showed two mobile
  profiles and implied a choice; the manifest showed one and revealed a gap.
- `docs/adr/0064` line 94 named the twelve `*DuelSealConfirm.tsx` /
  `*MobileDuelSealConfirm.tsx` skins as present on disk, verified at the time it
  was written. Seven of those files no longer exist. That record is not rewritten
  — it was true when made — but this one supersedes its inventory.
- The evaluation window is closed for both surfaces. A second profile or duel
  seal implementation reappearing is drift, not an experiment.
