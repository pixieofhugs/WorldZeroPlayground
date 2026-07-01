# A duel is two linked praxes, not one shared praxis

/ status: accepted

## Context

A duel is a head-to-head competition between two characters on the same task. The
original model made a duel **one `Praxis` row with two `PraxisMember`s**, sharing a
single owner, `body_text`, and `MediaItem` gallery, with votes split per member via
`Vote.praxis_member_id`. This is internally contradictory: a *competition* in which
both sides write into the *same* document and photo gallery, where a voter rating
"member A" has no way to know which evidence is A's (the UI literally renders a
"Shared Document" for a duel).

## Decision

A duel is **two separate praxes that compete**, joined by a new `Duel` row.

- **Each side is its own `type=solo` praxis** — own owner, body, media, and votes.
  "Duel-ness" lives entirely on the `Duel` link, not on the praxis. Votes target the
  praxis directly; the `Vote.praxis_member_id` column, its two partial unique indexes,
  and `DuelVoteSummary` are retired.
- **The `Duel` row owns the pairing and the challenge handshake**:
  `{ task_id, challenger_praxis_id, opponent_character_id, opponent_praxis_id
  (nullable until accept), status, lifecycle timestamps }`. It **replaces
  `PraxisInvite` for duels**.
- **Lifecycle states:** `pending` (challenged, only challenger's praxis exists) →
  `active` (opponent accepted, opponent's praxis created) → `settled` (both
  submitted, voting open). `declined` is terminal.
- **Cold symmetric challenge.** The challenge **attaches to the challenger's existing
  `in_progress` praxis** (created at signup), rather than creating one at challenge time.
  Decline/cancel drops the `Duel` row and the praxis remains a plain `type=solo` praxis
  (unchanged). The data model (two linked solo praxes + `Duel` row) is identical; only the
  challenge entry point changes. Both sides then work and `submit` independently, exactly
  like a solo praxis. No "challenger must finish first" rule.
- **Decline / cancel → convert to solo.** On decline or challenger-cancel, the `Duel`
  link drops and the challenger's praxis remains as a normal `type=solo` praxis. No
  data loss, no special delete path.
- **Voting opens only when both praxes are `submitted`.**
- **The winner floats with the votes until era reset.** Consistent with the
  always-live-on-read scoring model; there is no per-duel voting window or freeze. The
  duel win/loss multiplier is applied per side at scoring time from the current tally.

### Forfeit

Once a duel is `settled`, backing out of it forfeits the contest rather than reopening it.

- **Triggers.** Unsubmitting a `settled` duel side (`withdraw_praxis`), or the ban /
  soft-delete of a side's character (`soft_delete_character`), forfeits that side.
- **Opponent wins by default.** The forfeiter takes their faction **loss** modifier; the
  opponent takes their **win** modifier. Vote tallies no longer decide the outcome — the
  duel-side scoring branch reads `Duel.forfeited_by_character_id` and skips the tally
  comparison. The winner is scored even if the forfeited side is now `in_progress` or the
  forfeiter is banned.
- **Sticky.** `forfeited_by_character_id` is recorded on the first forfeit and never
  overwritten; the duel **stays `settled`**. Resubmitting the thrown side does not restore
  the contest — the forfeiter keeps the loss modifier on resubmit.
- **No body leak.** A forfeited-by-unsubmit side is `in_progress`, so its read link 404s
  for non-members exactly like any editing praxis (ADR-0024); read surfaces show only
  "forfeited — won by default".

## Consequences

- Scoring must determine "is this praxis a side of a duel?" via the `Duel` table
  instead of reading `praxis.type` — one extra lookup in the recalc path.
- The activity feed's duel-challenge projection must re-point from `PraxisInvite` to
  the `Duel` row (see `activity_feed.py`); the projection model is retained
  (issue #181 tracks the broader projection-vs-event-log question).
- There is no discrete "X won the duel" moment; a definitive winner only exists at era
  close. The `settled` transition feed event is "duel is live for voting."
