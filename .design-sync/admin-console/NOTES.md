# Admin console — vendored design (epic #3663)

Pulled from the "Admin redesign" canvas (claude.ai/artifact/ByLy2i6bgXBMVkfvbcYAbU,
version 1795142318-308d) on 2026-11-19. Boards, `admin.css`, and `canvas.json` (the
orange and blue build notes live in its `notes`). `ds/` and `support.js` are not
vendored: the kit is in the repo, so the boards don't render standalone. Read them
as source.

Corrections before building:
- Names and counts on the boards are sample data for a ~20-player launch. The
  EraRoll board's "Era 2 · Metamorphosis" and its list of leaving factions are
  illustrative, not the Era 2 roster. Read real values from `era.*`.
- The 48h countdown and the level in the proposal warning come from
  `era.pending_task_admin_review_hours` and `era.level_to_see_pending_tasks`.
- `ModMode` mounts the real `WZ.TaskCard`; build it on the real `TaskCard`.

Each child deletes the boards it has built. The epic's last PR deletes this folder.
