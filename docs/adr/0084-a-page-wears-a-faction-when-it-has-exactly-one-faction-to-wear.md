# ADR-0084 — A page wears a faction when it has exactly one faction to wear

**Status:** Accepted
**Date:** 2026-08-23
**Relates to:** ADR-0030 (the Factions grid is a directory, not a join surface —
the second, independent reason that page is undressed), ADR-0035 (the split the
collapses below narrow), ADR-0046 (the manifest is override-only; an undeclared
surface falls through to na), ADR-0056 / ADR-0058 / ADR-0061 / ADR-0065 /
ADR-0067 / ADR-0069 / ADR-0078 (the collapse programme — each scoped to its own
surface), ADR-0083 (the ornament vocabulary that rides the same dispatch seam),
`docs/kit-structure.md` (the *surface*-level companion to this *page*-level
rule), #2532 (this decision), #2539 (the `Settings` ruling), #2153 (the Settings
epic whose shell clause that ruling upholds), #2537 (`EditCharacter`), #2538
(`ProposeTask`), #2529 (the one live bypass of the seam in §2), #2530 (`na` gets
a real manifest — the same seam, the other question)

## Context

Seven pages dispatch to a per-faction archetype. Eight do not. Nothing recorded
why, so every new page re-argued it from first principles and the split read like
drift.

It is not drift. Counted against the tree it is a rule, and it is exact.

The cost of leaving it unwritten was not hypothetical. Three pages resolve to
exactly one faction and wear nothing — `Settings`, `EditCharacter`,
`ProposeTask` — and with no record, each is indistinguishable from a page that is
undressed *on purpose*. `ProposeTask` even carries a note in its own source
saying it should be dispatched one day, which is the shape of a decision nobody
ever made. Five `archetypes/` directories hold a single `Default*` file and no
dispatcher, so the directory name promises a fan-out that never happened and a
reader cannot tell scaffolding from a ruling.

The reverse error is the more expensive one, because it produces work rather than
merely confusion: read the seven dressed pages as the norm and the five list
pages look like a backlog of forty missing archetypes. They are not. `Tasks.tsx`
had already worked this out for its own case without generalising it:

> Mobile browse is faction-agnostic page chrome (#565): the page shows every
> faction's tasks, and each card in the results list picks its own skin from its
> task's faction slug. […] No viewer-faction page skin.

That comment is the whole rule, stated once, in the one place that happened to
need it.

## Decision

### 1. The rule

**A page wears a faction if and only if the page as a whole resolves to exactly
one faction. A page showing many factions' things wears none of them — its items
dress themselves.**

The "only if" half is as load-bearing as the "if" half, and §3 is what it costs.

Counted against `origin/main`, there are exactly seven non-test page dispatch
sites under `frontend/src/pages/`, and they are these:

| page | the one faction | dispatches on | dressed |
|---|---|---|---|
| `TaskDetail` | the task's | `surfaceMap('taskDetail')` | yes |
| `PraxisDetail` | the praxis's task | `surfaceMap('praxisDetail')` | yes |
| `EditPraxis` | the praxis's task | `surfaceMap('editPraxis')` | yes |
| `FactionDetail` | the faction's own | `surfaceMap('factionHero')` + `('factionBody')` | yes |
| `CharacterProfile` | the character's | `surfaceMap('profileBody')` | yes |
| `CreateCharacter` | the calling being picked, live | `surfaceMap('createCharacter')` | yes |
| `FieldDesk` | the carried life's | `surfaceMap('mobileFieldDesk')` | yes |
| `Tasks` | many — every faction's tasks | — | no |
| `Praxes` | many | — | no |
| `Updates` | many | — | no |
| `Leaderboard` | many | — | no |
| `Factions` | many — it is the directory (ADR-0030) | — | no |

`CreateCharacter` is the row that proves the rule is about *resolution* and not
about *records*. Every other dispatcher reads a faction off a loaded row; there
is no character yet on this page, so it dispatches on the calling being chosen
right now and reskins live as the pick changes. A page can resolve to one faction
without owning one.

Two rows in that table are less tidy than the others, and the untidiness is in
the tree rather than in the rule. `FactionDetail` resolves **two** surfaces, hero
and body, from the one slug. And `FieldDesk` dresses **only its phone branch** —
`mobileFieldDesk` is the last surviving `mobile*` component surface, which
ADR-0078 records as explicitly out of reach of the collapse licence it granted;
desktop FieldDesk is undressed. Neither is an exception to §1: both pages still
resolve to exactly one faction, which is what the rule is about. `CharacterProfile`
is a third mild case — its dispatch sits one level down, in
`characterProfile/FactionProfileBody.tsx`, rather than in the page file.

**The corollary matters as much as the rule: an undressed page is not an
unfinished page.** `Tasks` is not missing eight archetypes. It is correct.

### 2. The seam is `surfaceMap(<key>)` + `pickVariant`, and there is one live bypass

A page that dresses does it by calling `surfaceMap('<key>')` and handing the
result to `pickVariant`, with an explicit `Default*` fallback. Nothing else
dresses a page. The key must exist in both `FactionManifest` and `SURFACE_KEYS`,
which a `satisfies` clause makes check each other, so a surface cannot exist
without appearing in both — that pairing is the guard that stops a new dispatcher
from quietly acquiring a private registry.

**No dispatcher may inject a slug at the call site.** A hard-coded slug in the
map literal is a faction the manifest cannot see, cannot count, and cannot
retire; every census, every exhaustiveness test and every surface count still
passes while one identity is wired in beside them.

**This invariant does not hold at the time of writing, and that is recorded here
rather than asserted away.** `frontend/src/components/sigil/FactionSigil.tsx`
resolves as `pickVariant({ albescent: AlbescentSigilAdapter, ...surfaceMap('sigil') }, slug, DefaultSigilAdapter)`
— the `albescent` key is injected ahead of the spread — and `factionSigilRing`
branches on the same slug beside it. The file argues its own case (a bespoke
emblem is not "Default plus a flourish", so it is not a manifest row) and is
deliberately written so the manifest wins the day Albescent declares a `sigil`.
Whether that argument survives is **#2529's** question, not this record's. What
belongs here is that it is the *one* known bypass, that it is a component rather
than a page, and that anyone citing §2 as a clean invariant should check #2529's
state first.

### 3. A list page's items dress themselves; the page chrome stays neutral

On `Tasks`, `Praxes`, `Updates` and `Leaderboard`, every faction in the result
set is represented by its own item — a task card, a praxis card, a feed frame —
each dispatching on its own row's slug. The page around them is neutral chrome.
None of the five reads a `--faction-*` token or calls `useFactionBackdrop` at
page level. `Updates.tsx` states the same thing `Tasks.tsx` does, in its own
words — the stream stays a mixed, multi-faction river, every card keeping its own
frame via `context_faction_slug`, *never one uniform tint*.

**Adding faction chrome to any of those four is a reversal of this record, not an
increment on it.** In particular, dressing a list page in the *viewer's* faction
is the failure the `Tasks.tsx` comment names outright: it paints one player's
identity over other players' work. `pickVariant` has no cross-faction path at
all, and that absence is a guard rather than a gap — it is what `FactionSelectCard`
lacked when its UA fallback dressed every unaffiliated and unknown slug in UA's
costume (#796, the third instance of #418/#636).

### 4. `Factions` is undressed twice over

`Factions` fails the rule — it shows every faction — and it would stay undressed
even if the rule changed, because ADR-0030 makes it **a pure directory of preview
tiles** that carries no membership controls. Two independent reasons, and a
future amendment to this record does not reach it. It is listed in §1 for
completeness, not because the rule is what keeps it plain.

### 5. The live exceptions

Three pages resolve to exactly one faction and are not dressed. Their statuses
differ, and the difference is the point.

**`Settings` — a deliberate exception (owner ruling, 2026-08-23, #2539).**
#2153's shell clause stands: Settings is not a faction-dispatched surface. The
grounds are the ones it was grilled under on 2026-08-17 — **the landed design
draws only `--faction-default-*`, so dispatching the page would be invention
rather than fidelity to a sheet.** Accordingly `settings` is not in
`SURFACE_KEYS` and `FactionManifest` has no `settings` field, and neither gains
one. #2153 and its seven children are unaffected; #2154 builds one responsive
page with no dispatcher and no archetype fan-out.

Two things about that reason, stated so a later reader is not misled by either.
The claim about the sheet is recorded **on the authority of #2153 and #2539**:
`Settings.dc.html` is not in this repository, so the grounds cannot be
re-derived from the tree and must be re-read against the design itself if they
are ever re-opened. And the *shipped* page does not match the reason yet —
today's `settings/mobileArchetypes/DefaultSettings.tsx` draws the viewer's own
faction hue into its avatar placeholder via `factionCssVar(character.faction_slug, …)`.
That file is the pre-#2154 mobile archetype the chassis retires, so it is a
statement about what has not been rebuilt yet rather than a counter-example to
the ruling — but anyone checking "does Settings really only draw default?"
against `origin/main` today will find that line, and should know it is expected.

The reason is written down because **an exception whose reason is not recorded is
indistinguishable from an oversight in six months** — which is the exact failure
this ADR exists to stop. Reading the exception without §6 attached is a
misreading.

**`EditCharacter` — no ruling either way. Tracked as work in #2537.**

That is the status #2539 assigned it on 2026-08-23, and it stands. But the page
is **not** simply undressed by neglect, and #2537 has to answer what is already
in the file rather than discover it late. `pages/EditCharacter.tsx`'s docblock
states a reason:

> Edit Character — themed in the spectrum default skin for EVERYONE, regardless
> of the character's faction (#434). "Your character is yours before any faction
> is" […] on the `--faction-default-*` tokens.

That is a stated intent of exactly the shape §6 asks an exception to supply, and
it is older than this record. It is **not** recorded here as a second exception,
for two reasons: a docblock is a claim about a decision, not the decision itself,
and the owner filed #2537 as open work on 2026-08-23 *after* the audit that read
this tree. So the live status is "open question", and the #434 rationale is the
first thing #2537 must weigh — either it is promoted to an exception under §6
with its reason restated here, or it is overridden and the page dresses. What it
must not do is stay in a docblock deciding the outcome silently.

Separately, and not a reason for anything: `mobileEditCharacter` was declared by
#516/#901, never claimed by a single faction, and retired on the grounds that *a
slot no faction fills is not a seam, it is a lookup that always returns the same
answer*. That is a statement about an empty registry, not about whether the page
should dress.

**`ProposeTask` — no ruling either way. Tracked in #2538.** `pages/ProposeTask.tsx`
carries a `ponytail:` note saying a `pickVariant` dispatch belongs there once a
faction has a bespoke proposal form, and `pages/proposeTask/archetypes/` holds
one file and no dispatcher.

Neither of the two is licensed by the `Settings` exception, and neither is
licensed to stay bare by this record. They are open questions with issues on
them.

**The route back for both is fixed by precedent, not open to invention:** the
chassis and the first registration land in the **same PR**. `createCharacter`
is that precedent — #2346 minted a new responsive surface and shipped it with
Ephemerists' registration in the same change, precisely because four surfaces
died the first time by shipping a slot no faction filled.

### 6. The `Settings` exception is grounded in a specific landed design, not in a class of page

Say this explicitly or the record gets read as *"account-management pages are
exempt"*, and the exemption spreads to every page a reader files under that
heading.

It does not generalise. What earns `Settings` the exception is that it **has a
sheet and the sheet is neutral** — a designed, landed, deliberately
`--faction-default-*` drawing. A page with *no* sheet has not earned anything;
it has simply not been drawn yet, which is a different situation with two
standing rulings already on it. This exception overrides **neither**:

- **2026-07-23 — a faction missing a custom experience is a bug regardless.**
- **2026-08-16 — a surface with no sheet gets derived rather than left generic.**
  ADR-0078 is that ruling in practice: faction detail's collapse sat `needs-design`
  because WOW had a `FactionPage` and no `FactionBody`, and #1611 **derived**
  `WowFactionBody` from the WOW kit rather than leaving WOW generic.

A future single-faction page with no sheet falls under both. "The design only
draws default" is a reason **only when a design exists and was read**; absent a
sheet it is not an argument, it is the thing those two rulings were made to
override.

Anyone adding a second exception owes this section the same two things `Settings`
supplied: a landed design, and the reason written down beside the entry.

## Consequences

**A new page has one question, and it is answerable before any code is written:**
does this page as a whole resolve to exactly one faction? Yes → it dispatches
through §2, chassis and first registration in one PR. No → it is neutral chrome
and its items dress themselves, and that is a finished state, not a TODO.

**The five single-`Default*` `archetypes/` directories stop being ambiguous.**
Under §1 a reader can now tell which are scaffolding awaiting a fan-out and which
are a lookup that will always return the same answer — the question the directory
name could never answer on its own.

**Nothing is licensed to collapse by this record.** Every prior collapse
(ADR-0056, 0058, 0061, 0065, 0067, 0069, 0078) is scoped to its own surface and
says so. This ADR is about **pages gaining** dispatch; a licence to collapse one
surface has never been a licence to collapse the next, and this document does not
become one.

**What this record does not settle.** Whether `EditCharacter` and `ProposeTask`
get dressed (#2537, #2538) — the rule says they qualify, and qualifying is not a
ruling. In particular, whether `EditCharacter`'s standing #434 rationale is
promoted to an exception under §6 or overridden is #2537's to answer, and §5
says why it cannot be left to a docblock. Whether `FactionSigil`'s injected slug
survives (#2529). Whether `na` gains a real manifest (#2530), which changes the
*mechanism* under §2 without touching which pages use it.

**The known sharp edge** is §5's exception. It is the one entry here that a
future reader can mistake for an oversight, and the only guard against that is
§6 staying attached to it. Anyone editing §5 without §6 has removed the guard.
