# Comment timestamps read the same for every faction

**Status:** Accepted
**Date:** 2026-10-13

**Amends:** the timestamp-dialect clause of [ADR-0018](0018-comment-voice-reuses-task-card-atoms.md), restated in [ADR-0026](0026-ua-comment-adopts-the-gilt-salon.md)
**Source:** #3148 (owner decision), recorded by #3166

## Decision

A comment's timestamp reads the same for every faction. The shared catalog holds one set of
comment-time strings (`praxis.json`, `comments.time.default`), and the comment-time seam takes no
faction identity: it receives the elapsed time and nothing about who wrote the comment.

This replaces ADR-0018's "the timestamp slot is a per-faction dialect" and its six dialect
strings. The `edited` marker still rides the same slot.

## Why

A timestamp keyed on the author's faction announces that faction to every reader. The text of
the timestamp becomes a tell, in a surface where the box chrome is already the only intended
faction signal. Making the seam take no faction means a slug-keyed dialect cannot be re-added
without changing its signature.

## Consequences

- ADR-0002's "content invariant, presentation per-faction" no longer reaches the timestamp
  wording. The timestamp slot still exists in every box; only its text is uniform.
- ADR-0018 and ADR-0026 stay in force except for that clause.
