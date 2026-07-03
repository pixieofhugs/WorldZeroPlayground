# Join / recruitment designs — vendored from the World Zero Design System

Vendored 2026-07-03 from the cloud "World Zero Design System" Claude Design project
(projectId `019e221c-7853-7530-a934-7d3b2b7c8b43`). These feed the join-flow work:
issue #347 (membership moves to the faction detail page), #395 (Albescent
invitation entry flow), and the ready-for-human design issue #243 (faction
invitation letter pop-ups).

## What's here

- `join-contract.json` — the canonical join/recruitment data contract (fetched
  fresh 2026-07-03). One shape, seven skins. Its `viewer` sub-shape is shared
  with `faction-contract.json` so one resolver drives both the full enlistment
  screen and the in-page join block on a faction page.
- `Albescent Join Screen.html` — "Take up the work" correspondence letter
  (contract-shaped, fresh). **This is the invitation card #395 uses.**
- `Warriors of Whimsy Join Screen.html` — join.exe pinned corkboard flyer
  (contract-shaped, fresh).
- `SNIDE Join Screen.html` — ransom-note recruitment demand. ⚠️ STALE ROSTER:
  its inline `FACTIONS` list predates the faction renames (Gestalt/Journeymen/
  UA Masters) and it does not consume the join contract. The *poster itself*
  (SnideRecruitPoster) is the canonical SNIDE treatment; ignore its chooser rail.

- `Everymen Join Screen.html` — union enlistment poster (from the 2026-06-26
  local export of the cloud project; may lag the cloud copy slightly).
- `Ephemerists Join Screen.html` — codex-leaf frontispiece "Walk with the
  keepers" (contract-shaped, fresh).
- `Singularity Join Screen.html` — terminal enlist printout "JOIN THE ARRAY"
  (contract-shaped, fresh, always-dark).

Same pattern as the above: one in-voice recruit poster per faction rendering
from the join contract, plus a shared chooser rail. For repo builds, compose the
faction's established repo archetype (task-card / faction-hero atoms) with the
contract fields if the vendored file isn't available.

## Design gap (flagged for #200 / #243)

There is **no UA Join Screen** in the design system — UA is the only faction
without a recruitment/enlistment design. The UA join popup needs a design round
(gilt-salon "letter of matriculation") before UA's join flow can match the others.
