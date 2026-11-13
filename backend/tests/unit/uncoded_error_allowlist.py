"""The shrink-only allowlist of uncoded ``HTTPException`` raises (#1401).

Seeded with every uncoded site, so progress is arithmetic. **It may only
shrink**: a new raise uses :func:`errors.raise_coded`; a conversion lowers or
deletes its entry in the same commit (``test_uncoded_error_ratchet.py`` checks
both ways). No "permanently exempt" escape hatch: that list would need its own
guard against growth.

What #1652 left, by judgement: sole missing-row 404s (the status is the code),
admin-only surfaces (no catalog renders them), auth/dependency 401/403s, and
the tail of service-layer gates whose status already says everything a client
needs. Closing at zero would mint a code per 404 that no client branches on.

Keys: ``"<path under backend/>::<enclosing qualified name>"`` -> count; produced
by ``uncoded_error_scan.py``.
"""

from __future__ import annotations

#: Duplicated on purpose: the one number a reviewer reads; the test checks it.
UNCODED_RAISE_TOTAL = 108

UNCODED_RAISE_ALLOWLIST: dict[str, int] = {
    "dependencies.py::get_current_character": 1,
    "dependencies.py::require_admin": 1,

    "routers/admin.py::admin_cli_token": 2,
    "routers/admin.py::admin_import_tasks_csv": 1,
    "routers/admin.py::ban_character": 1,

    "routers/auth.py::dev_login": 3,

    "routers/characters.py::delete_character_route": 1,
    "routers/characters.py::get_character": 1,
    "routers/characters.py::update_character_route": 1,
    "routers/characters.py::upload_avatar": 1,

    "routers/comments.py::list_praxis_comments": 1,

    "routers/tasks.py::get_task": 1,
    "routers/tasks.py::list_tasks": 1,

    "routers/votes.py::list_voters": 1,

    "services/admin_service.py::admin_edit_task": 2,
    "services/admin_service.py::archive_message": 1,
    "services/admin_service.py::assign_or_revoke_role": 2,
    "services/admin_service.py::get_account_detail": 1,
    "services/admin_service.py::suspend_account": 1,
    "services/admin_service.py::update_task_status": 2,

    "services/auth.py::decode_jwt": 2,
    "services/auth.py::get_current_account": 2,

    "services/character.py::set_active_character": 2,
    "services/character.py::soft_delete_character": 1,
    "services/character.py::update_character": 1,

    "services/character_stats.py::recompute_votes_spent_this_era": 1,

    "services/comment.py::_clean_body": 2,
    "services/comment.py::edit_comment": 1,
    "services/comment.py::flag_comment": 1,
    "services/comment.py::get_comment": 1,
    "services/comment.py::moderate_comment": 1,
    "services/comment.py::withdraw_comment": 1,

    "services/duel.py::cancel_duel_challenge": 2,
    "services/duel.py::get_duel": 1,

    "services/era.py::get_current_era_row": 1,

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
    "services/praxis.py::invite_to_praxis": 2,
    "services/praxis.py::kick_member": 3,
    "services/praxis.py::leave_praxis": 1,
    "services/praxis.py::moderate_praxis": 1,
    "services/praxis.py::respond_to_invite": 4,
    "services/praxis.py::unsubmit_praxis": 1,

    "services/praxis_metatask.py::apply_metatask": 8,
    "services/praxis_metatask.py::remove_metatask": 2,

    "services/relationship_service.py::build_relationship_item": 1,
    "services/relationship_service.py::create_relationship": 3,

    "services/task.py::list_signups_for_task": 1,
    "services/task.py::list_tasks": 2,
    "services/task.py::propose_task": 2,

    "services/vote.py::cast_or_update_vote": 3,
    "services/vote.py::cast_vote_on_praxis": 1,
}


__all__ = ["UNCODED_RAISE_ALLOWLIST", "UNCODED_RAISE_TOTAL"]
