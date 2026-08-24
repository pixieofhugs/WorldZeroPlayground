# ADR-0081 — Account deletion is a tombstone, not an erasure

**Status:** Accepted
**Date:** 2026-08-23
**Relates to:** ADR-0041 (Account vs Character identity — deletion is an
*account* act, and anti-self-voting is why the vote rows are account-keyed),
ADR-0011 (duel forfeit on a life ending), ADR-0073 (the room is not the record —
which is why the room has to go too), CONTEXT.md ("Tombstone", "Account"),
#2160 (this decision), #2161 (the confirm dialog), #2162 (the returning-player
gate), #2153 (the Settings epic this belongs to)

## Context

The Settings design offers a delete-account button and, beneath it, a promise:

> *"Points you awarded to other players stay with them."*

**That sentence is false under a hard delete**, and the reason is three facts
about this schema rather than anything about deletion policy:

1. `Vote.praxis_id` is `ON DELETE CASCADE` (`models/vote.py`). Deleting a
   departing player's praxes destroys **other people's** vote rows cast on them.
2. `votes_spent_this_era` is a **stored counter**, and a cascade cannot
   decrement it. There is exactly one application path that deletes a vote —
   `services.vote.void_account_vote_on_join` (#2216) — and it hand-decrements
   the caster's budget precisely because nothing else will. Nothing hooks the
   cascade, so every player who had voted on the departing player's work would
   stay charged, permanently, for a vote that no longer exists.
3. `recalculate_character_stats` recomputes score from **live vote rows** and
   runs after any vote change. Votes the departing player cast simply vanishing
   means the next recalculation on someone they voted for silently drops that
   person's score.

None of that is reachable today: `services.praxis.delete_praxis` refuses
anything past `in_progress`, and an `in_progress` praxis cannot have been voted
on. An account deletion would have been the **first** path in the codebase to
cascade a vote row away, and it would have done so in bulk, silently, on behalf
of a player who was told the opposite.

The alternative to what is decided below was a hard delete with compensating
writes: walk everyone who voted on the departing player's praxes, decrement each
budget, re-run each recalculation. That is a fan-out of unbounded size inside a
single request, it has to be exactly right or it corrupts strangers' scores in a
direction nobody will notice for weeks, and it makes other players *measurably
worse off* — they lose the votes they spent — in order to satisfy a tidiness
goal nobody asked for.

## Decision

**Deletion blanks the identity and keeps the rows.** The only things actually
destroyed are the ones that carry no arithmetic.

**What is blanked:**

- `Account.email` → `deleted-<id>@deleted.invalid`. It cannot be nulled — the
  column is `unique` and `nullable=False` — and it must not merely be kept,
  because the address has to be **released**: the same human signing up again
  months later must not collide with their own corpse. `.invalid` is reserved by
  RFC 2606, so no provider can ever hand us an address that collides with a
  released one.
- Every `Character` on the account: `status = banned`, `departed_at` stamped
  (both via the existing `soft_delete_character`, which also forfeits settled
  duels per ADR-0011 and unlinks the avatar), then `username` →
  `deleted-<character_id>`, `display_name` → a shared neutral placeholder, and
  `bio` / `tagline` / `location` / `avatar_url` emptied.
- Praxis `title` and `body_text`, and comment `body_text`, → a removed-marker.
  Comments additionally get `is_withdrawn`, the existing author soft-delete flag
  that both the comment list and the @mention feed already filter on.
- `Account.status = AccountStatus.deleted`, **reinstated**. `models/account.py`
  recorded that #1398 removed it for implying an erasure flow that did not
  exist. This is that flow.

**What is destroyed:**

- The `OAuthProvider` rows. A deleted account must not be resolvable by
  `(provider, provider_user_id)`, or the next sign-in hands the player back the
  corpse instead of a fresh start.
- `praxis_room_update` for the blanked praxes. This is the non-obvious one and
  it is not optional: the room holds the CRDT document behind the composer, and
  a CRDT **retains tombstones** — text the author typed and then deleted is
  still in the blob. Blanking `praxis.body_text` while leaving the room rows
  would erase the record and keep the draft, including material the player had
  already removed themselves. `models/praxis_room.py` makes the same argument
  about its own cascade.
- **The media files, off the disk, in place.** Not just the row: the files live
  on the Render disk mount, and an orphaned file there is a real photograph of a
  real person sitting on a server after they asked us to remove it. The
  quarantine mechanism (ADR-adjacent, `withdraw_media_from_mount`) is
  deliberately *not* used — its whole design keeps the bytes for a moderator,
  and a sibling directory of `MEDIA_ROOT` is not even on the persistent disk.

**Retained for the returning-player gate:** `provider` in the clear plus a
**salted SHA-256** of `provider_user_id`, in a new `account_tombstone` table.
Raw identifiers do not survive. The salt is `settings.SECRET_KEY`, because an
unsalted digest is reversible in practice — a Google `sub` is a 21-digit number
and a Discord snowflake is a 64-bit integer, both enumerable by anyone holding a
copy of the database.

**Retention is 90 days, enforced purge-on-access.** There is no job runner, so
the check happens when somebody shows up: `create_or_get_account` resolves the
tombstone on the branch where it does not recognise an identity, and a row past
its date is deleted there and then rather than returned.

**No grace period.** A recovery window means deferring the blanking to a
scheduled job, and there is no job runner. Deletion happens in the request or
not at all.

## Consequences

**Good.** The promise on the button is true. Nobody else's score moves, nobody
else's vote budget shrinks, and `recompute_votes_spent_this_era`'s identity —
the counter equals that character's vote rows — still holds afterwards, which
means the operator repair tool still works. Sign-in into the deleted account is
closed by the existing status gate (`get_current_account` accepts only
`active`), and the released email means a returning human lands in a **new**
account rather than being refused or, worse, reunited with the old one.

**The cost, stated plainly.** A "deleted" account is still a row, and its votes
still count toward other people's scores. That is genuinely surprising, and it
is the reason this is an ADR rather than a commit message. What a player is
promised is that nothing identifying them survives and that their files are
gone; what they are not promised, and must not be told, is that the database
forgets they existed.

**Known limitations, none of which are worth building a scheduler for:**

- A tombstone nobody ever returns to keeps its digest past ninety days, because
  a returning player is the only clock it has.
- Rotating `SECRET_KEY` orphans every existing digest and the returning-player
  gate silently stops recognising anyone deleted before the rotation. Acceptable
  because a rotation already invalidates every JWT and signs everyone out.
- Blanking is scoped to praxes the account **created**. A collab praxis it
  created is blanked whole, taking a co-author's contribution with it; a collab
  praxis someone else created keeps this account's words. That is the
  author-of-record line the codebase already draws (`delete_praxis` is
  creator-only), and splitting a shared document by contributor is not a
  question the schema can answer.
- An `@handle` mention of the departed player, typed into somebody else's
  comment, still reads as their old handle in that comment's text. Rewriting it
  would mean editing another player's words.

**If anyone ever changes this to a hard delete**, the sentence on the confirm
dialog has to change with it, and all three facts at the top of this document
have to be dealt with first.
