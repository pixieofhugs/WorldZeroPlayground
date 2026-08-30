# ADR-0089 — The role map answers for every slug; the rail keeps its own guard

**Status:** Accepted
**Date:** 2026-08-29

**Relates to:** [ADR-0048](0048-albescent-unfreezes-per-surface-as-designs-land.md) and
[ADR-0083](0083-albescent-is-one-ornament-vocabulary-over-na-not-a-skin-per-surface.md)
(Albescent takes the neutral family — unchanged by this record),
[ADR-0085](0085-snide-is-not-an-always-dark-faction.md) (the `chrome` ground and its
per-ground override; its decision 4 clause "an unaffiliated viewer still declares no local
at all" is about the *rail* and stays true), [ADR-0039](0039-unaffiliated-fill-is-a-gradient-not-a-hue.md)
(na's fill is a gradient), #2361 (the rail wears the viewer's faction — where the
construction guarantee was written), #2659 / #2649 ("Nine Kits, One Vocabulary" decision 06 —
a faction supplies a MAP, not values), #2689 (the derived standing rule that made the proof
possible), #2690 (this change), CONTEXT.md ("Faction")

## Context

`utils/factionRoles.ts` maps nine roles onto tokens `index.css` already declares, and
`factionRoleVars(slug, prefix, ground)` spreads them as custom properties on a surface's root.
Until now it declined to answer for four cases: `na`, `albescent`, `null`, and any slug the
server invents tomorrow. It returned `{}`.

That was deliberate, and it bought something real. #2361 called it **pixel-identical by
construction**: with not one property declared, every `var(--x, <today's token>)` at every read
site rendered the fallback, which was the value that already shipped. There was no second
render path to keep in step.

Three things then made the guarantee cost more than it bought.

**The singular already disagreed.** `factionRoleVar(slug, role, ground)` — one role, not the
map — has always answered for `na` and Albescent with the neutral `--faction-default-*` family,
on the recorded grounds that a single read has no all-or-nothing seam to protect. Two functions
over the same table, two answers for the same slug.

**The measurement existed.** `factionContrast.test.ts` loops nine slugs including `na` and
`albescent` over this resolver in both cascades, so "nothing to measure twice" had stopped
being true.

**The fallbacks were the cost.** The construction guarantee is paid for by an arm at every
read: 65 of them across twelve `Default*` surfaces. Each one is a second spelling of a value
the map already knows, in a file a lane will edit for other reasons, and #2689 built the gate
that pins every one of them to the map's own answer precisely because they can drift.

## Decision

### 1. `factionRoleVars` answers for all nine slugs

The `isKnownFaction` guard comes off. `na`, Albescent, `null` and an unrecognised slug now get
the same nine properties as `ua`, pointing at the neutral `--faction-default-*` family — the
same family `factionRoleVar` has always given them, and the same family the 65 deleted
fallbacks named.

### 2. Pixel-identical by CONSTRUCTION becomes pixel-identical by PROOF

The guarantee is not weakened, it is re-based. Before the arms came off,
`factionRoleFallbacks.test.ts` clause 3 asserted that every one of the 65 named exactly the
token the map resolves to — so the declared value and the fallback were the same string, and
the read renders identically whether the property reaches it or not. That is the proof, it was
green before the deletion, and the same gate now bans a new arm from appearing.

What is given up, honestly: the guarantee is now mechanical rather than structural. A future
repointing of the `default` family moves the unaffiliated viewer's pixels, where before nothing
was declared to move. That is the same exposure every identified faction has always had, and
the contrast loop already measures `na` and `albescent` on both cascades.

### 3. The rail keeps the construction guarantee, deliberately

`components/layout/Sidebar.tsx` is the one surface that does **not** follow this record, and it
is not a straggler. `railFaceVars` guards its own call — `if (!isKnownFaction(slug)) return {}`
— and its 25 role reads keep their fallbacks, 23 of which name the app's own neutral tokens
rather than faction ones.

The reason is what `chrome` means. The rail is the app's own furniture wearing a faction, not a
content card, and an unaffiliated viewer is a viewer with **no** faction: what they should see
is the app, not a neutral faction family standing in for one. Rendered side by side from the
real `index.css`, both cascades, the cost of the other answer was concrete:

- The app has **three** neutral ink tiers and the `default` family has **two**, so
  `--color-text-secondary` at a heading and `--color-text-tertiary` at a timestamp collapse
  onto one colour and the heading/timestamp distinction disappears. This is exactly the
  per-SITE fallback behaviour `factionRoles.ts` documents for the `quiet` role — one role, not
  two, *because* three neutral tiers survive a family that has two.
- The rail stops being translucent: `rgba(255,255,255,0.72)` becomes an opaque `#fffdf9` in
  light, and `rgba(255,255,255,0.04)` an opaque `#1c1b24` in dark.

**The guard belongs to the surface, not to the resolver.** A surface that wants the app's own
furniture for an unaffiliated viewer withholds the map itself, at its own boundary, where the
reason is legible. Pushing it back into `factionRoleVars` would make every future `chrome`
caller inherit a decision it never took.

### 4. The standing rule gains a named exception, carrying its reason

The rule in `factionRoleFallbacks.test.ts` was "ban arms in identified files, require them in
`na`/dynamic files, pin their value". It does **not** collapse to one clause, because the rail
exists. It restates as:

1. **BAN** — a role fallback is illegal in any file that spreads `factionRoleVars`, because the
   map always emits and the arm is unreachable code. The old narrowing to *identified* factions
   is gone, and with it the literal-vs-dynamic slug test.
2. **REQUIRE** — except in a file that withholds the map from its own reads. There is exactly
   one, and it is listed with the reason above it rather than as a bare allowlist entry.
3. **PIN** — where such a required fallback names a faction token, it must be the token the map
   resolves to for an unaffiliated viewer.

The exemption is **checked, not asserted**: the gate reads `Sidebar.tsx` and fails if the guard
that justifies the exemption is no longer there, and fails again if a second file grows such a
guard without being listed. An exemption nobody re-checks is the thing that rots.

## Consequences

- 65 fallback arms leave twelve files. No CSS value changes; no token is minted, repointed or
  deleted. `index.css` is untouched.
- `factionRoleVar` and `factionRoleVars` now give one answer instead of two.
- Twelve `Default*` surfaces gain nine declared properties on their root that they did not
  carry before. Some declare a role they do not read — `DefaultScoreStamp` declares
  `--na-score-stamp-paper` and grounds itself on the score plate instead. **A declaration is
  not a paint**, and one markup assertion had to be narrowed to say so.
- A surface added tomorrow may spread the map for any slug and read it bare. Nothing has to
  classify the file first.

## What does NOT change

**Albescent still takes the neutral `--faction-default-*` family.** That is ADR-0048 and
ADR-0083, and it is the design, not a gap: a colour family minted for a society that hides in
plain sight would put it back into the spectrum. This record alters how that family is
*delivered*, never which family it is.

**`CSS_KEY.albescent` stays `"default"`,** and `isKnownFaction` keeps its meaning and its
callers. This is implemented above that line, as ADR-0088 was.

**na's fill is still a gradient** (ADR-0039). The `fill` role resolves to the bare
`--faction-default` for an unaffiliated viewer, exactly as `factionRoleVar` already returned.
