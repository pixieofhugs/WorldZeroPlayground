"""The shrink-only allowlist of ruff findings the backend shipped with (#2427).

Ruff landed on a codebase that had never had a linter, so it landed on **777
existing findings across 172 files**. The owner's ruling was a ratchet, not a
repo-wide ``--fix``: a tree-wide autofix would rewrite 256 files, bury every
real diff behind it, and conflict with every open branch. So the seed below is
complete — that is the point. Without a complete seed, "the debt went down" is
a sentence someone has to agree with; with one, it is arithmetic.

WHAT THE 777 ARE
----------------
====== ======== ======= ========================================
 code   found    files   what it is
====== ======== ======= ========================================
 E501      585     133   line-too-long
 I001       97      80   unsorted-imports
 F401       69      23   unused-import
 E402       22       2   module-import-not-at-top-of-file
 F541        2       1   f-string-missing-placeholders
 F811        2       1   redefined-while-unused
====== ======== ======= ========================================

E501 is three-quarters of it, and 61% of the whole inventory sits under
``tests/``. Neither is a reason to exclude anything: tests are backend code,
and an excluded directory is a rule that is off, not a rule that is satisfied.

THE RULE
--------
**This mapping may only shrink.** Two directions, two meanings:

* A number that goes **up**, or a key that appears, means a new finding landed.
  Fix the code instead of editing this file — ``E``/``F``/``I`` findings in new
  code are cheap to fix at the moment you write them, which is the entire
  argument for having a linter. ``tests/unit/test_ruff_clean.py`` fails either
  way.
* A number that goes **down**, or a key that disappears, is a cleanup. Lower or
  delete the entry in the same commit — the test requires the allowlist to
  match reality exactly, so it cannot quietly stop describing the code.

There is deliberately no escape hatch for "this one is fine". If a *finding* is
genuinely wrong, ``# noqa: CODE`` on the line is the escape hatch ruff already
ships, and it costs one entry here going down by one. If a *rule* is wrong, it
comes out of ``select`` in ``backend/pyproject.toml`` and out of this file, in
the same commit, where a reviewer can see it.

KEYED ON FILE **AND** CODE
--------------------------
``services/praxis.py::F401``, not ``services/praxis.py``. Per-file
grandfathering would mean a file with one over-long line is also exempt from
unused imports forever; per file and code, with a count, is the tightest thing
that still lets the tree be green on day one. Line numbers are deliberately not
in the key — they churn on every edit above the finding, which would make this
a merge-conflict generator rather than a ratchet.

BURNING IT DOWN
---------------
``ruff check --fix`` fixes 170 of the 777 mechanically (F401, F541, F811,
I001). Do that **per directory, in its own PR**, and lower the entries here in
the same commit. Do not do it tree-wide — that is the thing this ratchet exists
to avoid having to review.

To regenerate this mapping after a cleanup, from ``backend/``::

    python -m ruff check --no-cache --output-format concise . |
        awk -F: '{print $1"::"}'   # ...or just read the test's failure message,
                                   # which prints the exact lines to edit.
"""

from __future__ import annotations

#: The headline number. Asserted against the sum of the entries below, so it
#: cannot drift into being a separate claim about the code.
RUFF_FINDING_TOTAL = 748

#: ``<path relative to backend/>::<rule code>`` -> how many that file is still
#: allowed. Sorted by path; keep it sorted so diffs stay readable.
RUFF_ALLOWLIST: dict[str, int] = {
    "alembic/env.py::E501": 1,
    "alembic/env.py::I001": 1,
    "alembic/versions/0002_squashed.py::I001": 1,
    "alembic/versions/0003_character_tagline.py::E501": 1,
    "alembic/versions/0004_onboarding_cross_faction.py::I001": 1,
    "alembic/versions/0005_praxis_member_habit_bonus.py::E501": 1,
    "config.py::E501": 2,
    "db.py::I001": 1,
    "elevate_admin.py::E501": 7,
    "eras/_template.py::E501": 2,
    "eras/_template.py::F401": 3,
    "eras/_template.py::I001": 1,
    "eras/era_1.py::I001": 1,
    "eras/era_2.py::I001": 1,
    "game_config.py::E501": 12,
    "import_tasks_csv.py::E501": 3,
    "main.py::E501": 9,
    "main.py::I001": 1,
    "models/__init__.py::I001": 1,
    "models/account.py::E501": 2,
    "models/character.py::E501": 2,
    "models/character_block.py::E501": 1,
    "models/character_block.py::I001": 1,
    "models/character_stats.py::E501": 3,
    "models/contact.py::E501": 1,
    "models/duel.py::F401": 1,
    "models/era.py::E501": 1,
    "models/faction.py::E501": 1,
    "models/praxis.py::E501": 3,
    "models/task.py::E501": 1,
    "models/task.py::I001": 1,
    "models/vote.py::E501": 1,
    "routers/admin.py::E501": 3,
    "routers/admin.py::I001": 1,
    "routers/auth.py::E501": 1,
    "routers/auth.py::I001": 1,
    "routers/characters.py::E402": 12,
    "routers/characters.py::E501": 1,
    "routers/duel.py::E501": 2,
    "routers/duel.py::F401": 2,
    "routers/factions.py::E501": 1,
    "routers/praxes.py::E402": 10,
    "routers/praxes.py::E501": 3,
    "routers/praxes.py::F401": 1,
    "routers/praxes.py::I001": 1,
    "routers/relationships.py::I001": 1,
    "routers/tasks.py::I001": 1,
    "schemas/activity_feed.py::E501": 2,
    "schemas/activity_feed.py::I001": 1,
    "schemas/admin.py::I001": 1,
    "schemas/auth.py::E501": 2,
    "schemas/auth.py::I001": 1,
    "schemas/character.py::E501": 1,
    "schemas/character.py::I001": 1,
    "schemas/comment.py::I001": 1,
    "schemas/contact.py::I001": 1,
    "schemas/duel.py::I001": 1,
    "schemas/faction.py::I001": 1,
    "schemas/praxis.py::E501": 10,
    "schemas/praxis.py::I001": 1,
    "schemas/relationship.py::I001": 1,
    "schemas/sidebar.py::I001": 1,
    "schemas/task.py::I001": 1,
    "schemas/vote.py::F401": 1,
    "schemas/vote.py::I001": 1,
    "script_utils.py::E501": 1,
    "script_utils.py::I001": 1,
    "scripts/backfill_character_stats.py::E501": 3,
    "scripts/backfill_vote_budget.py::E501": 3,
    "scripts/check_db_stamp.py::E501": 2,
    "scripts/era_reset.py::E501": 8,
    "scripts/reset_e2e_db.py::E501": 3,
    "scripts/reset_render_db.py::E501": 5,
    "scripts/seed_demo_praxes.py::E501": 11,
    "scripts/seed_demo_praxes.py::I001": 1,
    "scripts/sweep_orphan_media.py::E501": 11,
    "seed.py::E501": 3,
    "seed.py::F541": 2,
    "seed.py::I001": 1,
    "services/activity_feed.py::E501": 8,
    "services/activity_feed.py::I001": 1,
    "services/admin_service.py::E501": 6,
    "services/admin_service.py::I001": 1,
    "services/auth.py::E501": 5,
    "services/character.py::E501": 5,
    "services/character.py::I001": 1,
    "services/character_stats.py::E501": 4,
    "services/character_stats.py::I001": 1,
    "services/collab_consensus.py::E501": 3,
    "services/duel.py::E501": 5,
    "services/duel.py::I001": 1,
    "services/era.py::E501": 1,
    "services/era.py::I001": 1,
    "services/faction_service.py::F401": 1,
    "services/media.py::E501": 4,
    "services/media.py::I001": 1,
    "services/media_sweep.py::E501": 5,
    "services/media_sweep.py::I001": 1,
    "services/praxis.py::E501": 21,
    "services/praxis.py::I001": 1,
    "services/praxis_metatask.py::E501": 1,
    "services/praxis_out.py::E501": 8,
    "services/praxis_out.py::I001": 1,
    "services/praxis_room.py::E501": 1,
    "services/praxis_scoring.py::E501": 3,
    "services/relationship_service.py::E501": 1,
    "services/relationship_service.py::I001": 1,
    "services/scoring.py::E501": 2,
    "services/task.py::E501": 6,
    "services/task.py::I001": 1,
    "services/vote.py::E501": 3,
    "tests/integration/conftest.py::E501": 6,
    "tests/integration/conftest.py::F401": 1,
    "tests/integration/conftest.py::I001": 2,
    "tests/integration/factories.py::E501": 4,
    "tests/integration/factories.py::I001": 1,
    "tests/integration/test_account_linking.py::I001": 1,
    "tests/integration/test_activity_feed.py::E501": 2,
    "tests/integration/test_activity_feed.py::I001": 1,
    "tests/integration/test_activity_feed_archive.py::E501": 1,
    "tests/integration/test_activity_feed_global_task_backlog.py::E501": 2,
    "tests/integration/test_activity_feed_query_count.py::E501": 1,
    "tests/integration/test_activity_feed_vote_points.py::E501": 3,
    "tests/integration/test_admin.py::E501": 4,
    "tests/integration/test_admin.py::F401": 3,
    "tests/integration/test_admin.py::I001": 4,
    "tests/integration/test_albescent_unlock.py::E501": 2,
    "tests/integration/test_auth.py::E501": 2,
    "tests/integration/test_auth.py::I001": 1,
    "tests/integration/test_badges.py::E501": 1,
    "tests/integration/test_ban_and_departure.py::E501": 9,
    "tests/integration/test_blocks.py::E501": 1,
    "tests/integration/test_character_stats.py::E501": 4,
    "tests/integration/test_characters.py::E501": 16,
    "tests/integration/test_characters.py::F401": 2,
    "tests/integration/test_characters.py::I001": 1,
    "tests/integration/test_collab_solo_conversion.py::I001": 1,
    "tests/integration/test_collab_vote_recalc.py::E501": 3,
    "tests/integration/test_dev_login.py::E501": 4,
    "tests/integration/test_duel_era_resolution.py::F401": 9,
    "tests/integration/test_duel_era_resolution.py::I001": 2,
    "tests/integration/test_duel_opponent_lookup.py::E501": 2,
    "tests/integration/test_duel_opponent_lookup.py::F401": 1,
    "tests/integration/test_duel_self_duel.py::E501": 7,
    "tests/integration/test_duel_self_duel.py::I001": 1,
    "tests/integration/test_duel_service.py::I001": 1,
    "tests/integration/test_duel_victor_badge.py::E501": 5,
    "tests/integration/test_duel_victor_badge.py::F401": 12,
    "tests/integration/test_duelist_badge.py::E501": 3,
    "tests/integration/test_duelist_badge.py::F401": 15,
    "tests/integration/test_era_reset_retires_board.py::E501": 1,
    "tests/integration/test_era_reset_script.py::F401": 2,
    "tests/integration/test_era_reset_script.py::I001": 1,
    "tests/integration/test_era_scoped_recalc.py::E501": 1,
    "tests/integration/test_faction_filter_folds_albescent.py::E501": 1,
    "tests/integration/test_factions.py::E501": 2,
    "tests/integration/test_factions.py::I001": 2,
    "tests/integration/test_failed_praxis.py::E501": 1,
    "tests/integration/test_failed_praxis.py::F401": 2,
    "tests/integration/test_failed_praxis.py::I001": 1,
    "tests/integration/test_flag_account_scope.py::E501": 5,
    "tests/integration/test_game_config.py::E501": 1,
    "tests/integration/test_hidden_praxis_media_quarantine.py::E501": 10,
    "tests/integration/test_hidden_praxis_media_quarantine.py::I001": 1,
    "tests/integration/test_invitation_delivery.py::E501": 15,
    "tests/integration/test_leaderboard.py::I001": 1,
    "tests/integration/test_level_jump_signup.py::F401": 1,
    "tests/integration/test_me.py::E501": 4,
    "tests/integration/test_media_sweep_db.py::E501": 1,
    "tests/integration/test_multi_character.py::E501": 9,
    "tests/integration/test_nudge.py::I001": 1,
    "tests/integration/test_nudge_bulk.py::E501": 1,
    "tests/integration/test_player_facing_error_codes.py::I001": 1,
    "tests/integration/test_praxes.py::E501": 41,
    "tests/integration/test_praxes.py::F401": 2,
    "tests/integration/test_praxes.py::F811": 2,
    "tests/integration/test_praxes.py::I001": 4,
    "tests/integration/test_praxis_card_breakdown.py::I001": 1,
    "tests/integration/test_praxis_delete_and_signup_race.py::E501": 3,
    "tests/integration/test_praxis_era_stamp.py::E501": 2,
    "tests/integration/test_praxis_list_query_count.py::E501": 2,
    "tests/integration/test_praxis_media_batch.py::E501": 9,
    "tests/integration/test_praxis_room.py::E501": 17,
    "tests/integration/test_praxis_roster_avatars.py::E501": 1,
    "tests/integration/test_praxis_scoring.py::F401": 1,
    "tests/integration/test_praxis_scoring.py::I001": 1,
    "tests/integration/test_praxis_visibility.py::E501": 18,
    "tests/integration/test_praxis_voted_filter.py::E501": 2,
    "tests/integration/test_praxis_voted_filter.py::I001": 1,
    "tests/integration/test_relationships.py::I001": 1,
    "tests/integration/test_signup_eligibility.py::E501": 4,
    "tests/integration/test_task_can_sign_up_filter.py::E501": 2,
    "tests/integration/test_task_crown.py::E501": 1,
    "tests/integration/test_task_list_query_count.py::E501": 2,
    "tests/integration/test_task_signup_reason.py::F401": 2,
    "tests/integration/test_task_start_here.py::I001": 1,
    "tests/integration/test_task_visibility_gates.py::E501": 2,
    "tests/integration/test_task_visibility_gates.py::F401": 2,
    "tests/integration/test_tasks.py::E501": 10,
    "tests/integration/test_tasks.py::I001": 6,
    "tests/integration/test_taunts.py::I001": 1,
    "tests/integration/test_vote_dedupe_repair.py::E501": 11,
    "tests/integration/test_votes.py::E501": 14,
    "tests/integration/test_votes.py::F401": 1,
    "tests/integration/test_votes.py::I001": 2,
    "tests/test_adr_numbers_are_unique.py::E501": 1,
    "tests/test_deleted_routes_stay_deleted.py::E501": 1,
    "tests/test_issue_comment_guard.py::E501": 1,
    "tests/test_issue_comment_guard.py::I001": 1,
    "tests/test_migration_revision_ids.py::E501": 1,
    "tests/test_openapi_response_required.py::E501": 3,
    "tests/unit/test_character_capabilities.py::E501": 5,
    "tests/unit/test_character_capabilities.py::I001": 1,
    "tests/unit/test_era_config.py::E501": 12,
    "tests/unit/test_era_config.py::I001": 1,
    "tests/unit/test_era_reset.py::E501": 1,
    "tests/unit/test_era_reset.py::F401": 1,
    "tests/unit/test_errors.py::E501": 3,
    "tests/unit/test_errors.py::I001": 1,
    "tests/unit/test_faction_config.py::E501": 1,
    "tests/unit/test_i18n_catalog_coverage.py::E501": 1,
    "tests/unit/test_level_jump.py::I001": 1,
    "tests/unit/test_level_profiles.py::E501": 1,
    "tests/unit/test_media_service.py::E501": 3,
    "tests/unit/test_media_sweep.py::E501": 2,
    "tests/unit/test_metatask_cap.py::E501": 2,
    "tests/unit/test_model_conventions.py::E501": 1,
    "tests/unit/test_model_conventions.py::I001": 1,
    "tests/unit/test_praxis_mode_gates.py::I001": 1,
    "tests/unit/test_scoring.py::E501": 20,
    "tests/unit/test_scoring.py::I001": 2,
    "tests/unit/test_uncoded_error_ratchet.py::I001": 1,
    "tests/unit/test_vote_tally.py::E501": 1,
    "tests/unit/uncoded_error_allowlist.py::E501": 1,
    "tests/unit/uncoded_error_scan.py::E501": 2,
}
