# Default faction behaviour: UA is an ordinary faction; the grid is a directory, not a join surface

**Status:** Amended by ADR-0087
**Date:** 2026-07-03

## Amendment

**Amended 2026-08-25 by [ADR-0087](0087-structural-faction-slugs-are-not-era-owned.md)** — the grid's hidden set is no longer
`HIDDEN_SLUGS = {na, aged_out}`. A faction the **live era does not list** is `retired` and
also absent from the directory, so the set is now "the sentinels, plus everything this era
dropped". Era 2 retires four (`ua`, `coven`, `ephemerists`, `singularity`).

This also retires the first bullet's subject as a standing fact: UA is an ordinary faction
*in Era 1*. Faction-specific behaviour is per-era (ADR-0087), so UA's ordinariness — like
Coven's collab bonus and Ephemerists' Task Vision — is an Era 1 statement, not a permanent one.

The rest stands: the grid is a directory, not a join surface, and joining still happens on the
faction detail page.

Building on [ADR-0019](0019-characters-start-unaffiliated-invite-gated-factions.md)
(characters are born unaffiliated `na`; faction membership is invite-gated), this
records the resulting **default faction behaviour** and the Factions-grid shape:

- **UA has no starter privilege.** It is an ordinary, invite-joinable faction — the
  "Gilt Salon" academy — with its own directory tile like every other faction.
- **The Factions grid is a pure directory of preview tiles.** It shows every real
  faction (including UA) and hides only the non-destination sentinel slugs `na`
  (unaffiliated) and `aged_out`. Implemented as `HIDDEN_SLUGS = {na, aged_out}`.
- **Joining does not happen on the grid.** Each tile's CTA links to the faction
  detail page, which owns the Join block (see #347 / #414). The grid never carries
  membership controls.

## Consequences

`backend/eras/era_1.py` still carries **inert pre-ADR-0019 remnants — do not trust
them**:

- UA's description said *"The default starting faction. Full points on all tasks.
  Must leave at level 3."* The auto-UA start and the level-3 graduation both have
  **no implementation anywhere**. This ADR corrects the string (UA is the Gilt Salon
  academy; it keeps its full-points modifiers, but is not a starter and has no L3 rule).
- The `is_selectable` `FactionConfig` flag is **read nowhere** in backend or
  frontend — join eligibility is decided solely by held `InvitationLetter`s. The flag
  is documentation-only and currently misleading (UA was `is_selectable=False`).
- The `aged_out` faction row is **never assigned to any character**; it is a leftover
  placeholder from the retired auto-UA / must-leave-at-L3 model.

Only UA's description is corrected in this change. Removing `is_selectable` and
retiring `aged_out` (the latter needs a data migration for any legacy rows) is
deferred to follow-up issue #428.
