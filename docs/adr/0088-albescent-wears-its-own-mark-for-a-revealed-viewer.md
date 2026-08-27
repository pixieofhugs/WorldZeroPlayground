# ADR-0088 — Albescent wears its own mark for a revealed viewer

**Status:** Accepted
**Date:** 2026-08-26

**Supersedes:** the no-livery half of #783 — on surfaces that identify a *player*. Albescent
still has no hue of its own and still reads na's neutral scalars and spectrum everywhere else;
what changes is that a viewer who has already been let in can now tell an Albescent member
from an unaffiliated one at a glance.
**Relates to:** [ADR-0082](0082-albescent-is-redacted-not-hidden.md) (redaction, whose
`isFactionRedacted` predicate is the gate this ADR spends), #2502 (the dormant avatar ring and
its na-byte-identical invariant, reversed here), #2529 (the labyrinth in `FactionSigil`, which
this ADR extends to the avatar), #1192 decision 13 and #2531 (Albescent keeps `DefaultComment`,
reversed here), #1891 (the name gate — untouched), #2409 (the eighth lane on the players page),
CONTEXT.md ("Faction")

## Context

Albescent's visual posture has been governed by one line: `CSS_KEY.albescent` maps to
`"default"`, so `isKnownFaction('albescent')` is false and `factionCssVar('albescent')` is na's
neutral grey. Everything downstream follows from that, and the intent was #783's: a secret
society must not wear livery.

Two things have since drifted out from under that rule.

**The app already disagrees with itself.** #2529 registered Albescent's labyrinth in
`FactionSigil`, so the filter facet, the credential card, the requests tray, the players roster
and the sidebar rail already draw a mark nobody else draws. But `AlbescentAvatar` renders, by
explicit contract, "the exact spectrum disc an unaffiliated player wears — the same ring, the
same monogram, the same `DefaultSigil` corner mark," and `albescentAvatar.test.tsx` asserts
that byte-for-byte. Same faction, two answers, depending on which component you happen to hit.

**Redaction replaced secrecy.** ADR-0082 stopped concealing Albescent's *existence* and started
withholding its *words*. Once an eighth lane sits on the players page reading `[REDACTED]`, the
secret being protected is no longer "there is a faction" — it is "these are its members," and
that is a question about the *viewer*, not about the *paint*. `isFactionRedacted()` already
answers it, and is already imported by the players page.

What surfaced the gap was concrete: the top player on the leaderboard is Albescent, and her
leader card rendered with a grey rank ring and no wash — reading as unaffiliated to the one
person who had been let in.

## Decision

**On a surface that identifies a player, a revealed viewer sees Albescent's own mark. An
unrevealed viewer sees na's, exactly as today.**

1. **The avatar badges with the labyrinth**, not `DefaultSigil`, at every mount — comment
   leaves, praxis bylines, roster rows, mobile lists, mentions. Gated on `isFactionRedacted()`.
2. **The players-page leader card** draws the spectrum wash and a spectrum rank ring for
   spectrum slugs (both `na` and `albescent`, which today get a flat grey and no wash at all),
   and Albescent additionally carries the labyrinth so it is tellable from unaffiliated.
3. **The comment leaf** wears Albescent's travelling spectrum edge instead of na's conditional
   spectrum cap.

**`CSS_KEY.albescent` stays `"default"`.** Forty-seven call sites read `isKnownFaction`, and
Albescent's five own files are wall-to-wall literal `var(--faction-default-*)` strings — the
flip repaints the seal band and moves none of them. This ADR is deliberately implemented
*above* that line, per surface, not by changing it.

## Consequences

**A revealed viewer can identify Albescent members.** Accepted knowingly. #2409 already
conceded most of it by putting the eighth lane on the players page; this finishes the thought
rather than opening a new one.

**#2502's gate argument does not transfer, and its invariant dies.** The dormant 64px ring gate
exists because "one turning ring in a column of still ones is a spotlight rather than a
shimmer." That is an argument about *motion* in a grid of forty avatars. A static badge is not a
spotlight. The ring gate stands; the na-byte-identical invariant and the test asserting it do
not.

**The comment sheet's signature changes.** The cap is `factionFill(slug,'bar')` inline with no
class, so no wrapper can reach it — `AlbescentComment` stops being a pass-through and passes a
suppression prop into na's `Sheet`. That is a change to a shared component, which is why #2531
concluded a wrapper alone could not do this.

**Three docblocks now argue against the code.** `AlbescentAvatar.tsx`, `AlbescentComment.tsx`
and `DesktopPlayers.tsx`'s `PodiumCard` each carry a paragraph defending the reversed position.
They must be rewritten alongside, or the next reader will restore the old behaviour from the
comment.

**An unrevealed viewer is unchanged.** Every surface above falls back to na's dress behind
`isFactionRedacted()`. #1891's name gate is untouched: this ADR is about marks, never labels.
