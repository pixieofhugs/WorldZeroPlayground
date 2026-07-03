# Albescent is a secret society, revealed by a sticky per-account flag

Albescent is a **distinct faction**, not a visual alias of UA (see #232). Its
*existence as a faction* is a **secret**: hidden from an account until that
account has, at some point, had a character who joined Albescent. Two visibility
tiers, and a reveal trigger that is deliberately sticky.

## The two tiers

**Always visible to everyone (no gate).** Albescent characters/players, their
tasks, and their praxis cards/pages render with Albescent's *own* full identity
(name, skin, everything) wherever they legitimately appear. The distinctive
Albescent look is public — outsiders are meant to *see* Albescent members and
not know what faction that is.

**Hidden until reveal (the secret).** The faction-*listing* surfaces conceal
Albescent's existence:
- not listed on the faction-cards grid (`Factions.tsx`),
- the detail page (`/factions/albescent`) shows a **"You know not what you
  seek"** placeholder (issue #394), not the real page and not a 404,
- not a pennant in the filter strip (`FilterFactionTabs` / `GET /factions`),
- no description, roster, or lore anywhere.

## Reveal trigger — sticky, account-collective

The reveal fires when the account **has ever had a character who is / was a
member of Albescent**. It is **monotonic**: once revealed, always revealed —
age-out, death, or switching active character never re-hide it. "Once the secret
is out, it's out."

Implemented as a sticky `albescent_revealed: bool` (default `False`) on the
`Account` model, flipped `True` at the join site (`defect_to_faction` when the
target is Albescent) and never unset. Account-collective (consistent with
ADR-0021), O(1) to read (the account is already loaded for auth), and — because
it is *not* derived from live character membership — it survives age-out/death.

This reveal gate is **distinct from ADR-0021 join-eligibility** (level 8 + full
coverage). The flow is: eligibility → invitation → **join** → reveal. Receiving
the invitation does **not** reveal; only *having had a member character* does.

## Considered Options

- **Alias Albescent to UA (the pre-#232 status quo).** Rejected — Albescent is
  its own faction; masking it as UA erases a first-class identity and makes the
  secret a lie rather than a mystery.
- **Derive "revealed" from current character membership.** Rejected — a revealed
  secret must stay revealed after the member ages out or dies; live membership is
  non-monotonic. The sticky flag is the point.
- **Hide Albescent members/tasks/praxis too (full concealment).** Rejected — the
  intended experience is that you *see* Albescent members and cannot look the
  faction up. Concealing members as well removes the mystery.
- **404 the faction page pre-reveal.** Rejected — a 404 reads as "no such
  faction," which both leaks (a real slug 404s differently than a typo) and kills
  the mystery. The "You know not what you seek" wall is deliberate.

## Consequences

- The faction-listing endpoints (`GET /factions`, `GET /factions/status`,
  `GET /factions/{slug}`) become **account-aware** and exclude Albescent unless
  the account is revealed. `GET /factions` is currently unauthenticated — it must
  learn the current account.
- The join site (`defect_to_faction`) gains a side effect (flip the flag) on top
  of the #395 eligibility guard — both land in the same block.
- A one-column migration adds `account.albescent_revealed`.
- Composes with #232 (first-class identity), #394 (the placeholder wall), and is
  blocked by #395 (join-eligibility enforcement, so an ineligible join can't
  wrongly trip the reveal).
