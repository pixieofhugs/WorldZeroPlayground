# ADR-0094 — A character's location is a three-letter airport code, enforced by shape

**Status:** Accepted
**Date:** 2026-10-16

**Source:** #2798 (owner ruling, 2026-10-16), on the 2026-08-27 ruling split out of #2793

## Decision

`Character.location` holds **three letters or nothing**. On create and on update the schema
(`CharacterCreate`, `CharacterUpdate` in `backend/schemas/character.py`) trims the value,
uppercases it, then requires `^[A-Z]{3}$`; the empty string stays allowed. The column is
`String(3)`. A 422 is returned for anything else. `location` stays on `CharacterRead`: other
players need to read it for neighbours to find each other, and a code is safe to show.

## Why: privacy

The owner's 2026-08-27 ruling, verbatim:

> *"Note that we are doing it by airport so people near each other can find each other but not in a
> way that could get into weird tracking stuff."*

Coarse by construction: close enough to find a neighbour, too coarse to locate anyone. Three
letters cannot hold a street address, a postcode or a phone number, so the shape alone makes the
posture true. Until now it lived only in a placeholder, which backs the copy "World Zero doesn't
store any personal information except your email and whatever you post yourself" (#2766).

## Why no allowlist, now or later

There is **no IATA allowlist**, and the pattern rule is the permanent rule. An allowlist only
matters for proximity matching, nothing does that yet, and it would mean shipping and maintaining
about 9,000 codes. `ZZZ` is valid and harmless. The "in my area" filter (#3247) adds an airport
dataset to *match* on, but it does not tighten validation: a joke code stays valid and simply never
matches the filter.

## Existing rows

Normalise, clear the rest. Migration `0023_character_location_code` trims and uppercases every
value, keeps what matches `^[A-Z]{3}$`, sets everything else to `''`, and only then narrows the
column. World Zero is pre-launch, so there is no grandfathering: any address already stored is
cleared and not recovered (the downgrade only widens the column).

## Consequences

- The rule lives in the schema, once, shared by create and update; routes and services do not
  restate it.
- A later feature that needs *known* codes adds its dataset beside this rule, not in place of it.
