# ADR-0070 — An unanswered obligation lives in the queue, never in the stream

**Status:** Accepted
**Date:** 2026-07-30

**Relates to:** ADR-0023 (the activity feed stays a read-time projection),
ADR-0036 (feed sources are a registry; counts derive from the same query),
epic #1192 (the feed gains an archive), epic #1419 (the Updates page gains a
filter bar and a Requests queue)

## Context

The activity feed mixes two kinds of item that look alike and behave nothing
alike.

Most of it is **news**: someone voted on your praxis, a friend completed a task,
a rival taunted you, a new task was activated. News is read and forgotten. You
can archive it, and archiving is the whole interaction.

Four of the fifteen types are **obligations**: `collab_invite`,
`duel_challenge`, `awaiting_submission`, and — once it gained an answer —
`invitation_letter`. These are not read, they are *answered*. Each carries a
counterparty who is waiting on you.

The feed has always drawn both in the same chronological river, distinguished
only by the presence of buttons on some cards. That produced three surfaces for
the same four items — a `Requests` filter tab, interactive companion cards
inline in every other tab, and a "Pending Requests" panel in the sidebar — each
with its own live accept and decline controls, each able to disagree with the
others about what was outstanding.

Promoting the obligations into a queue at the top of `/updates` fixes the
sidebar duplication but, on its own, makes the inline duplication worse: the
same four items would render twice on a single screen, once as a queue card the
player is being asked to clear and once as a companion card scrolling underneath
it, both live.

## Decision

**An unanswered obligation appears in the Requests queue and nowhere else in the
live feed.**

The four request types are excluded from the live `All` and `Your Stuff` views
while unanswered. Requests go in the queue; news goes in the stream. There is
exactly one place to answer a thing, and exactly one count of what is
outstanding.

Three consequences follow, and all three are intended:

1. **The `Requests` filter tab is deleted.** Under this rule it is
   byte-for-byte the queue's contents. The tab row goes from seven to six, and
   `/updates?filter=requests` becomes expand-and-scroll rather than a filter.
2. **`FeedCounts.all` and `.your_stuff` drop.** Counts derive from the identical
   windowed subquery (ADR-0036), so the badges follow the lists automatically.
   A badge that still counted the requests would be the exact drift ADR-0036
   exists to prevent.
3. **Bulk archive stops sweeping up obligations.** `dismiss-all` is scoped by
   the active filter, so "Archive all" on `All` no longer touches them. This is
   the sharpest possible statement of *archiving is a view state, never a
   decision*: you cannot answer an obligation by archiving it, and you
   certainly cannot answer forty of them with one click.

**Archived is unaffected.** A dismissed request still appears there, tagged
*still waiting*, because **archiving is a view state, never a decision** — it
never answered anything. That rule arrived with the archive itself (epic #1192)
and had no record of its own until this one, so this ADR is where it lives and
what the code should cite for it. This is the subtle part of the
implementation: the four types cannot simply be dropped from
the `ALL` source set, since the Archived view reads `filter=all` with
`archived=true` and would lose them too. The exclusion is a context axis applied
to the *live* view only — a sibling of the existing
`FeedContext.pending_invites_only`.

**"Unanswered" is defined per type**, because the four have four different
notions of doneness:

| type | unanswered while |
|---|---|
| `collab_invite` | status is `pending` |
| `duel_challenge` | status is `pending` |
| `awaiting_submission` | `PraxisMember.has_submitted` is false |
| `invitation_letter` | not dismissed **and** not already joined |

`invitation_letter` is the awkward one: it has no status column at all, because
it was never a thing you answered. It becomes one under #1419, and "not
dismissed and not already joined" is the closest honest reading.

## Consequences

**Good.** One surface per obligation, so the accept/decline handlers cannot
disagree. The red badge means one thing. The stream becomes purely readable —
everything in it is news, everything in it is archivable, and the archive
gesture has a single meaning again. And the queue's terminal state, *"Nothing is
waiting on you"*, is finally a claim the code can honour, which it could not
while `invitation_letter` and `comment_mention` sat in a pile that never
emptied.

**Bad.** A player who collapses the queue has no other route to an outstanding
invite in the live feed. Mitigated by the collapsed queue still showing its
count, and by the bell badge and sidebar handle both surviving. If that proves
insufficient the answer is to make the queue harder to lose, not to put the
items back in the stream.

**Also bad.** This is the first rule that makes a feed type's tab membership
*conditional* rather than a static registry fact. `FEED_SOURCES` remains the
single source of truth for which tabs a type belongs to; the exclusion is a
separate, explicitly-named axis on top. Anyone reading the registry alone will
see the four types listed under `ALL` and conclude they should appear there.
**That is why this ADR exists** — without it, the next person to touch
`FEED_SOURCES` will helpfully "fix" the missing request types and silently
restore the double render.

## Alternatives considered

**Leave them in the stream.** Rejected: two live accept buttons for one
obligation, on one screen, is a correctness problem before it is a design one.

**Keep the `Requests` tab and drop the queue.** That is the status quo, and it
is what produced three surfaces. The tab is a filter over a river; the queue is
a pile you clear. The pile is what an obligation wants.

**Grey the inline card out once it is in the queue.** Rejected on CLAUDE.md's
own rule — hide unusable controls, do not show them disabled — and because a
disabled duplicate is still a duplicate to read past.
