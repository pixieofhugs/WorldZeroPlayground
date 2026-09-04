# ADR-0090 — A per-faction difference is classified before it is designed: paint, tree, behaviour, or content

**Status:** Accepted
**Date:** 2026-08-29

**Relates to:** [ADR-0016](0016-per-faction-surfaces-share-one-data-contract.md) (per-faction
surfaces share one data contract; archetypes own only presentation — this record says how to
tell what "presentation" is), [ADR-0038](0038-faction-identity-is-config-canonical.md) and
[ADR-0031](0031-backend-emits-keys-frontend-catalog-resolves.md) (the content bucket),
[ADR-0042](0042-era-as-ruleset-config-owns-rules-db-owns-history.md) (the behaviour bucket:
abilities belong to eras and move between factions),
[ADR-0083](0083-albescent-is-one-ornament-vocabulary-over-na-not-a-skin-per-surface.md)
(Albescent is one ornament vocabulary, which is why its share of the stylesheet is class
rules rather than tokens), [ADR-0085](0085-snide-is-not-an-always-dark-faction.md) (the one
ground override the role map carries), #2649 — the *"Nine Kits, One Vocabulary"* plan
(the 2026-08-25 comment, which supersedes that epic's body), #2650 (the kill-test this
record exists because of), #2655, #2659, #2660, #2661, #2664, #2669 (the decisions cited
below, each with its own evidence)

## Context

#2649 was filed with a rule:

> *Chrome resolves from tokens. Ornament is drawn by an archetype. A surface that is only
> chrome should have no archetype file at all.*

The epic staked itself on that rule and named the cheapest possible test for it: migrate
`comments/voices`, the smallest of five families, 2,035 lines with zero SVG and zero shapes.
If the easiest case failed, the rule died there.

**It returned three of nine.** Three faction voices collapsed into tokens. Six kept a
component, and only one of the six — S.N.I.D.E. — was held by a drawing. The other five were
held by things no custom property can reach:

| faction | what held the file |
|---|---|
| UA | the avatar moves, and a sigil is mounted |
| Everymen | author identity is relocated into a band |
| Singularity | content is added that the other kits do not render |
| Albescent | the mention is a gradient **clip**, not a colour |
| WOW | `FactionAvatar`'s `size?: 'sm' \| 'md' \| number` — a **prop** |

Under the epic's own rule all five are "only chrome" and should have lost their files. The
rule would have mispredicted five of six.

**The interesting part is not that the rule was wrong. It is why nobody could see that it was.**
The epic's scope was a table of 26,320 lines built by counting `style={{` literals, and that
count cannot tell a literal that paints from a literal that positions a node the other kits do
not have. The rule and the census shared one blind spot, so the census could only ever confirm
the rule.

That failure mode then repeated twice more, on work that already knew about it:

- **#2655.** The plan's diagnosis was *"nine stamps each declare their own outer spacing"*.
  None did. The defect was the mirror image — two **hosts** declared no gap at all.
- **`pressGrounds`.** It resolved S.N.I.D.E.'s ground aliases by grepping the literal token
  spelling. After migration it reported two grounds instead of six, and stayed green.

Three censuses, one shape: a measurement that could not distinguish the thing being counted
from a thing that looks like it. A rule stated over such a measurement inherits its blindness.
So this record does not state a rule about where faction difference lives. It states the
procedure for finding out, case by case, **before** anything is designed for it.

## Decision

**Every per-faction difference is classified into exactly one of four buckets before it is
designed. The bucket determines the mechanism; skipping the classification is what produced
every case above.**

### The four buckets

**1. Paint** — a value a custom property can carry: a colour, a radius, a face, a scalar.
Paint travels through the role vocabulary in `frontend/src/utils/factionRoles.ts` — nine
roles (`paper`, `ink`, `quiet`, `line`, `accent`, `fill`, `onFill`, `radius`, `face`), two
grounds (`sheet`, `chrome`), read via `factionRoleVar` / `factionRoleVars`. A faction
supplies a **map**, not values (#2659): the map points at tokens that already exist, so
joining the vocabulary declares nothing new.

**2. Tree** — which nodes exist, where they sit, and what crosses a component boundary.
A token can repaint anything; it cannot move a node, add a node, or cross a prop. Tree stays
an archetype file, and nine files stay nine files — `frontend/CLAUDE.md` forbids unifying
them, and getting smaller by not repeating each other is not the same as merging.

**Amended 2026-09-01 (#2992): the shared chassis is the expected substrate, not the
exception.** The owner's ruling during `/bug-bot` — *"I do want to, in general, have all
factions read from the same chassis … The 7 factions which use the chassis all do have
distinct looks and look very good, while being consistent readable experiences. I want to
bring NA and Albescent into that"* — settles which half of the sentence above governs.
Nine files still stay nine files, and each still owns its own tree, dress, ground and
ornament. What an archetype may **not** do is re-author the sheet, the section and the
footer its eight siblings already mount out of
`pages/editPraxis/archetypes/shared.tsx`; a kit that does drifts on information, which is
what the ruling is about. The forbidden thing is unchanged and is narrower than it reads:
**one component with a runtime skin table rendering nine trees.** A shared chassis is not
that. See ADR-0065's scope paragraph, amended the same day and for the same reason.

**3. Behaviour** — a capability or a rule. **Never slug-keyed.** Abilities belong to eras and
move between factions, so they live in `FactionConfig` in `backend/game_config.py` and are
read through a service, mirroring ADR-0042. #2660 and #2664 are the live violation history.

**4. Content** — words. Faction name and description by slug in
`frontend/src/locales/en/factions.json` (ADR-0038); taunt and rank wording behind keys the
backend emits (ADR-0031).

### The order the question is asked

The buckets are not symmetric and the order is load-bearing. Ask, in this order, and stop at
the first yes:

1. **Would a future era want to move this to a different faction?** → **behaviour**.
   Asked first because it is the bucket with an actual violation history, and because a slug
   branch freezes a rule the next era cannot re-tune. Note what #2660's fix was *not*: no flag
   was added to `FactionConfig`, because there was never a rule there to configure. **A slug
   branch can be stale rather than load-bearing, and then deletion is the whole fix** — and
   deleting the `slug` parameter with it means the seam cannot grow the branch back.

2. **Is it words a translator would edit?** → **content**. Asked second because copy is the
   difference most often mistaken for paint: a per-faction voice reads as styling and is not.

3. **Could a custom property change it, with no edit to any component?** → **paint**.
   The honest form of this question is *"which declaration would I change"* — if the answer
   needs a component edit as well, it is not paint.

4. **Otherwise → tree**, and say what holds it: a moved node, an added node, or a prop.

**Tree is the residue, deliberately.** It is the expensive bucket and it is where an
unclassified difference lands by default, so it is the one answer that has to be earned by
eliminating the other three rather than reached by not asking.

### What the classification obliges

- **State the split in the issue, before designing.** The four cases in Context are all cases
  where a design was chosen and the classification inferred afterwards.
- **Do not classify from a literal count.** `style={{` counts, token-spelling greps and
  "declares its own spacing" readings have each produced a confident wrong answer here.
  A census must be able to distinguish paint from position, or it is not evidence.
- **A forked family is a failure state.** Three migrated and six not is the outcome that hides
  from the next census. A lane migrates its whole family or is not filed.
- **Payload has a veto.** Per-faction paint rides lazy chunks; `index.css` carries the shell.
  #2650's migration cost ~1.1 KB gzipped on the render-blocking stylesheet to delete two files
  that were free on the critical path — a maintenance win traded for a load-time loss on every
  page. Colour, layout and type may never be deferred (`motionSplit.test.ts`).

### Convergence is bounded

Classification says which mechanism carries a difference. It does not license removing one.
The **invariant** layer may converge — element order, rhythm, radius, busy and error states,
a11y. The **identity** layer may not — hue, typeface, ground, ornament, copy voice.

### The ratio is in no bucket, and that is why the gate is a loop

The faction lanes produced one hazard the four buckets do not catch, twice: **a role left
behind when its ground moved** — `onFill` at 2.07:1 and `accent` at 1.03:1.

A type can force one pair to travel together; `GroundOverride` in `factionRoles.ts` makes a
fill-only override unrepresentable for exactly that reason. What no type can know is that
moving `paper` invalidates the measurement of every ink standing on it. A contrast ratio is
not a property of either token — it is a property of the pair, so it belongs to neither
bucket and no amount of classification will surface it.

That is why the contrast gate is a **loop** over roles × factions × grounds × cascades (#2661)
rather than a hand-curated pair list, and why #2669 matters: the loop caught, at 1.03:1, what
review had already passed. **Every lane that adds a ground override will meet this.** Read the
docblock in `frontend/src/utils/__tests__/factionContrast.test.ts` first — it lists five things
the loop still cannot see, and a claim that "the gate covers it" is false by default until
checked against that list.

## Consequences

**This record cannot tell you the answer for any surface.** That is the deliberate difference
between a procedure and a rule, and it is the cost the evidence justifies: the rule that could
answer in advance answered wrong five times out of six on the easiest family in the repo. What
this buys is that a wrong answer now has to be argued for in the issue, in the classification,
before the design exists to defend it.

**It does not settle the surface lanes.** #2649's batches 11+ each classify their own family
and state the split; nothing here pre-decides what they will find. The faction lanes deliberately
cut no lines and no CSS — `index.css` was byte-identical across all five, and the shipped payload
moved −16 bytes gzipped — because the rows exist to make the columns possible, not to do the
cutting themselves.

**Two censuses in this repo already carry the fix**, and they are the shape to copy.

`factionRoleFallbacks.test.ts`'s `stragglers` sweep derives the token family from
`factionCssVar(surface.slug)` rather than from the slug. Hunting `--faction-${slug}` directly
would pass vacuously for `na` and `albescent`, whose family is `default` — it would have
cleared every surface whatever they said.

`singularityRoleReads.test.ts`'s `CARVED_OUT` list is the non-vacuity half: each carved-out
file must *still* name its faction directly (`"%s still names this faction directly"`), so a
row that goes newly empty is a failure rather than a pass. `components/sigil/FactionSigil.tsx`
is on that list.

**The checklist is the other half.** A tenth faction is a documentation goal, not an
architecture goal; `docs/spec/SPEC-faction-ui-profile.md` §4 is where that is written down, and
it is the artefact this record hands work to.
