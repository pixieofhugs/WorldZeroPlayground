"""The shrink-only allowlist of uncoded ``HTTPException`` raises (#1401).

Every entry is a place in the shipped backend that still builds an
``HTTPException`` without an :class:`errors.ErrorCode`. It is **seeded with all
of them** — that is the point. Without a complete seed, "phase 1 is done" is a
sentence someone has to agree with; with one, it is arithmetic: the allowlist
got smaller by N.

THE RULE
--------
**This mapping may only shrink.** Two directions, two meanings:

* A number that goes **up**, or a key that appears, means a new uncoded raise
  landed. Convert it with :func:`errors.raise_coded` instead of editing this
  file. ``tests/unit/test_uncoded_error_ratchet.py`` fails either way.
* A number that goes **down**, or a key that disappears, is a conversion. Lower
  or delete the entry in the same commit — the test requires the allowlist to
  match reality exactly, so it cannot quietly stop describing the code.

There is deliberately no escape hatch for "this one is fine uncoded". A 404 for
a missing row is a perfectly reasonable thing to leave uncoded forever; leaving
it *here* costs nothing and keeps one number honest, whereas a second
"permanently exempt" list would need its own guard against growth.

KEY SHAPE
---------
``"<path relative to backend/>::<qualified name of the enclosing function>"``
mapped to how many constructions that scope holds. Line numbers are not part of
the key — they churn on every edit above the raise, which would turn this file
into a merge-conflict generator instead of a ratchet.

The scan that produces these keys is in ``uncoded_error_scan.py``, and it is AST
-based on purpose: nine of the entries seeded here were invisible to
``grep "raise HTTPException"`` because they are *returned*, not raised. See that
module's docstring.
"""

from __future__ import annotations

#: Sum of :data:`UNCODED_RAISE_ALLOWLIST`. Duplicated on purpose: this is the
#: one number a reviewer reads to see how far a PR moved the ratchet, and the
#: test asserts the two agree so it cannot drift.
UNCODED_RAISE_TOTAL = 164

#: ``"file::scope" -> count``. Grouped by file, sorted; see the module docstring.
UNCODED_RAISE_ALLOWLIST: dict[str, int] = {
    "dependencies.py::get_current_character": 1,
    "dependencies.py::require_admin": 1,

    "routers/admin.py::admin_cli_token": 3,
    "routers/admin.py::admin_create_task": 3,
    "routers/admin.py::admin_import_tasks_csv": 1,
    "routers/admin.py::ban_character": 1,

    "routers/auth.py::dev_login": 3,

    "routers/characters.py::delete_character_route": 1,
    "routers/characters.py::get_character": 1,
    "routers/characters.py::update_character_route": 1,
    "routers/characters.py::upload_avatar": 1,

    "routers/comments.py::list_praxis_comments": 1,

    "routers/praxes.py::delete_media_route": 2,
    "routers/praxes.py::get_praxis_route": 1,
    "routers/praxes.py::kick_member_route": 1,
    "routers/praxes.py::list_praxes_route": 5,
    "routers/praxes.py::upload_media_batch_route": 1,
    "routers/praxes.py::upload_media_route": 1,

    "routers/relationships.py::delete_relationship": 2,

    "routers/tasks.py::get_task": 1,
    "routers/tasks.py::list_tasks": 1,
    "routers/tasks.py::update_task_route": 1,

    "routers/votes.py::list_voters": 1,

    "services/activity_feed.py::parse_archivable_item_key": 1,
    "services/activity_feed.py::parse_item_key": 2,

    "services/admin_service.py::admin_create_character": 2,
    "services/admin_service.py::admin_edit_task": 2,
    "services/admin_service.py::archive_message": 1,
    "services/admin_service.py::assign_or_revoke_role": 2,
    "services/admin_service.py::create_faction": 1,
    "services/admin_service.py::get_account_detail": 1,
    "services/admin_service.py::reactivate_task": 2,
    "services/admin_service.py::suspend_account": 1,
    "services/admin_service.py::update_task_status": 2,

    "services/auth.py::decode_jwt": 2,
    "services/auth.py::get_current_account": 2,

    "services/character.py::create_character": 3,
    "services/character.py::set_active_character": 2,
    "services/character.py::soft_delete_character": 1,
    "services/character.py::update_character": 1,

    "services/character_stats.py::recompute_votes_spent_this_era": 1,

    "services/comment.py::_assert_commentable_target": 5,
    "services/comment.py::_clean_body": 2,
    "services/comment.py::edit_comment": 1,
    "services/comment.py::flag_comment": 1,
    "services/comment.py::get_comment": 1,
    "services/comment.py::moderate_comment": 1,
    "services/comment.py::withdraw_comment": 1,

    "services/duel.py::cancel_duel_challenge": 2,
    "services/duel.py::get_duel": 1,
    "services/duel.py::issue_duel_challenge": 3,
    "services/duel.py::respond_to_duel_challenge": 4,

    "services/era.py::get_current_era_row": 1,

    "services/faction_service.py::defect_to_faction": 6,

    "services/media.py::process_and_save_avatar": 1,
    "services/media.py::process_and_save_media": 1,

    "services/nudge.py::_authorize_collab": 2,
    "services/nudge.py::_authorize_duel": 3,
    "services/nudge.py::_load_praxis_with_members": 1,
    "services/nudge.py::_refuse": 4,
    "services/nudge.py::_send_nudges": 1,
    "services/nudge.py::send_nudge": 1,

    "services/praxis.py::_check_create_preconditions": 3,
    "services/praxis.py::_require_member": 1,
    "services/praxis.py::cancel_invite": 2,
    "services/praxis.py::change_praxis_type": 3,
    "services/praxis.py::delete_praxis": 2,
    "services/praxis.py::flag_praxis": 2,
    "services/praxis.py::get_praxis": 1,
    "services/praxis.py::invite_to_praxis": 3,
    "services/praxis.py::kick_member": 3,
    "services/praxis.py::leave_praxis": 1,
    "services/praxis.py::moderate_praxis": 1,
    "services/praxis.py::respond_to_invite": 4,
    "services/praxis.py::submit_praxis": 1,
    "services/praxis.py::unsubmit_praxis": 2,

    "services/praxis_metatask.py::apply_metatask": 8,
    "services/praxis_metatask.py::remove_metatask": 2,

    "services/relationship_service.py::block_relationship": 2,
    "services/relationship_service.py::build_relationship_item": 1,
    "services/relationship_service.py::create_relationship": 3,
    "services/relationship_service.py::unblock_relationship": 2,

    "services/task.py::list_signups_for_task": 1,
    "services/task.py::list_tasks": 2,
    "services/task.py::propose_task": 2,
    "services/task.py::update_task": 1,

    "services/vote.py::cast_or_update_vote": 3,
    "services/vote.py::cast_vote_on_praxis": 1,
}


__all__ = ["UNCODED_RAISE_ALLOWLIST", "UNCODED_RAISE_TOTAL"]
