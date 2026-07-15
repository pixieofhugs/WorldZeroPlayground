# Flag reasons are a fixed, shared vocabulary

Builds on [ADR-0006](0006-comment-system.md), which introduced the `Flag` table with a
free-text `reason` column shared by praxis and comment flags. Surfacing flags on the
moderator review screen (#237) needs `reason` to render as a clean badge and to be the
axis a card aggregates on ("top reason + count"). Free text can't do either. This records
the move to a constrained vocabulary.

## Decisions

- **`Flag.reason` is a fixed enum, not free text.** Values: **`spam` · `harassment` ·
  `nsfw` · `slop` · `other`**. Validated at the API trust boundary (`POST /praxes/{id}/flag`
  and the comment flag route). `slop` is the low-effort / AI-generated-proof catch.

- **One vocabulary for both targets — not per-target subsets.** The same five reasons apply
  to praxis and comment flags. A subset that differs by target (e.g. a praxis-only "fake
  evidence") was rejected: it doubles the vocabulary, forks every consumer, and a reason that
  doesn't fit is simply not chosen. This mirrors ADR-0006's "one moderation vocabulary" goal
  for `ModerationStatus`.

- **The enum is additive and lives in app code, not a DB enum.** `reason` stays a plain
  string column; the allowed set is a Python enum checked at the boundary. New reasons are a
  one-line enum addition with **no migration** — the vocabulary is expected to grow as
  moderation needs surface ("add more as we need more").

- **`other` keeps a free-text escape hatch.** When a flagger picks `other`, their note is
  preserved (nullable `reason_detail`, or fold into the flow — builder's call) so no signal is
  lost; `reason` still stores `other` as the queryable/badgeable key. The four named reasons
  carry no note.

- **The enum is the flag control's choices, not just an admin concern.** The player-facing
  flag affordance (per-archetype across `pages/praxisDetail/*` and the comment box) picks from
  this enum instead of typing free text. The reason a moderator sees is the reason a flagger
  chose — the vocabulary is defined once and used at both ends.

## Consequences

- Existing `Flag` rows written before this change hold arbitrary free text in `reason`; they
  render under the `other` badge (any value not in the enum → `other`). No backfill.
- The moderator card aggregates on the stored key (top reason = most-common; ties → most
  recent). That badge/aggregation UI is issue detail (#237), not owned here.
- `Flag.reason`'s `server_default=""` predates the enum; an empty string is treated as `other`.

## Status / tracking

Not yet built. Implementation tracked in #237 (moderator review screen + the flag-control
change). The enum's home (`schemas` vs a shared constant) is a build decision.
