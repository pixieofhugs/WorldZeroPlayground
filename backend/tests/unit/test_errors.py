"""The coded-error shape (#1401): ``detail`` is ``{"code", "message"}``.

``frontend/src/utils/errors.ts::extractError`` shows nothing for a bare code
(#1581), so every coded raise needs its message.
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from errors import (
    DETAIL_CODE_KEY,
    DETAIL_MESSAGE_KEY,
    ErrorCode,
    coded_detail,
    coded_error,
    detail_code,
    detail_message,
    raise_coded,
)
from tests.unit.uncoded_error_scan import scan_coded_backend


def test_coded_detail_is_the_two_key_object_the_client_reads() -> None:
    detail = coded_detail(ErrorCode.vote_budget_exhausted, "No votes remaining.")
    assert detail == {
        DETAIL_CODE_KEY: "VOTE_BUDGET_EXHAUSTED",
        DETAIL_MESSAGE_KEY: "No votes remaining.",
    }


def test_raise_coded_raises_an_http_exception_with_the_status_it_was_given() -> None:
    with pytest.raises(HTTPException) as raised:
        raise_coded(403, ErrorCode.duel_level_too_low, "Duels require level 3.")

    assert raised.value.status_code == 403
    assert raised.value.detail[DETAIL_CODE_KEY] == "DUEL_LEVEL_TOO_LOW"
    assert raised.value.detail[DETAIL_MESSAGE_KEY] == "Duels require level 3."


def test_coded_error_builds_without_raising() -> None:
    """The shape ``_signup_denial_to_http`` and ``_refuse`` need."""
    error = coded_error(409, ErrorCode.task_bank_full, "Task bank is full.")
    assert isinstance(error, HTTPException)
    assert error.status_code == 409


def test_error_code_values_are_stable_screaming_snake() -> None:
    """A code's value is the wire contract."""
    for code in ErrorCode:
        assert code.value == code.value.upper()
        assert code.value.replace("_", "").isalnum()
        assert " " not in code.value


def test_detail_message_reads_prose_from_either_shape() -> None:
    assert detail_message("Task not found.") == "Task not found."
    assert (
        detail_message(coded_detail(ErrorCode.media_too_large, "File too large."))
        == "File too large."
    )


def test_detail_message_never_leaks_a_dict_repr() -> None:
    rendered = detail_message(coded_detail(ErrorCode.media_too_large, "File too large."))
    assert "{" not in rendered
    assert DETAIL_CODE_KEY not in rendered


def test_detail_code_reads_the_code_or_none() -> None:
    assert detail_code(coded_detail(ErrorCode.invite_self, "no")) == "INVITE_SELF"
    assert detail_code("plain prose") is None
    assert detail_code([{"msg": "field required"}]) is None




def test_every_error_code_is_emitted_with_prose() -> None:
    missing = [
        f"{site.module_path}:{site.line}"
        for site in scan_coded_backend()
        if not site.has_message
    ]
    assert not missing, (
        "Coded raises with no `message`:\n  "
        + "\n  ".join(missing)
        + "\n\nThe client displays `message`; a bare code renders nothing."
    )


def test_signup_denial_prose_matches_the_catalog_copy() -> None:
    """#1614: the fallback ``message`` shows during deploy skew, so it must
    equal the catalog entry rendered with the raise site's own ``params``."""
    import json
    import re
    from pathlib import Path

    from game_config import CURRENT_ERA
    from models.task import Task, TaskStatus
    from services.praxis import SignupDenialReason, _signup_denial_to_http
    from errors import DETAIL_CONTEXT_PARAM, DETAIL_PARAMS_KEY

    catalog = json.loads(
        (
            Path(__file__).resolve().parents[3]
            / "frontend" / "src" / "locales" / "en" / "errors.json"
        ).read_text(encoding="utf-8")
    )["codes"]

    def rendered(error: HTTPException) -> str:
        """Interpolated as i18next does."""
        detail = error.detail
        params = dict(detail.get(DETAIL_PARAMS_KEY, {}))
        context = params.pop(DETAIL_CONTEXT_PARAM, None)
        code = detail[DETAIL_CODE_KEY]
        key = f"{code}_{context}" if context and f"{code}_{context}" in catalog else code
        return re.sub(
            r"\{\{(\w+)\}\}", lambda match: str(params[match.group(1)]), catalog[key]
        )

    retired_task = Task(status=TaskStatus.retired, level_required=0)
    for reason, task in (
        (SignupDenialReason.bank_full, retired_task),
        (SignupDenialReason.task_status_closed, retired_task),
    ):
        error = _signup_denial_to_http(reason, task, CURRENT_ERA)
        assert error.detail[DETAIL_MESSAGE_KEY] == rendered(error), (
            f"{reason} renders differently depending on whether the catalog "
            f"resolved — the fallback prose and the catalog copy disagree"
        )


def test_every_error_code_has_a_raise_site() -> None:
    emitted = {
        site.code_member for site in scan_coded_backend() if site.code_member is not None
    }
    orphans = sorted(code.name for code in ErrorCode if code.name not in emitted)
    assert not orphans, (
        "ErrorCode members no raise site emits:\n  "
        + "\n  ".join(orphans)
        + "\n\nEither convert the raise that needs it or drop the member."
    )
