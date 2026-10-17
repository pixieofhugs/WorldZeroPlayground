"""`scripts/board.py` row building from canned GraphQL data, plus its gh boundary."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "scripts"))

import board  # noqa: E402
import gh_issue_comments  # noqa: E402

STAMP = (
    "> *Verified by /planner-bot.*\n**Verified-at:** `abcdef1234567890`\n"
    "**Premise:** the thing holds"
)


def _issue(number, blockers=(), prs=(), comments=(), body="x" * 10):
    return {
        "number": number, "title": f"issue {number}", "body": body,
        "blockedBy": {"nodes": [{"number": n, "state": s} for n, s in blockers]},
        "closedByPullRequestsReferences": {
            "nodes": [{"number": n, "isDraft": d} for n, d in prs]
        },
        "comments": {
            "nodes": [
                {"author": {"login": a}, "createdAt": "t", "body": b}
                for a, b in comments
            ]
        },
    }


def test_rows_show_open_blockers_in_flight_pr_size_and_collaborator_stamp():
    issues = [
        _issue(
            1,
            blockers=[(7, "OPEN"), (8, "CLOSED")],
            prs=[(50, True)],
            comments=[("molly", STAMP)],
        ),
        _issue(2, comments=[("stranger", STAMP)]),  # a stranger's stamp is not a stamp
    ]
    one, two = board.build_rows(issues, frozenset({"molly"}))
    assert (one["blocked_by"], one["pr"], one["size"]) == ("#7", "#50 (draft)", 10)
    assert one["stamp"] == "abcdef123 — the thing holds"
    assert two["blocked_by"] == "-" and two["pr"] == "-" and two["stamp"] == "-"


def test_main_makes_one_graphql_call(monkeypatch, capsys):
    calls = []

    def fake_gh(args):
        calls.append(args)
        if args[0] == "api" and args[1] == "graphql":
            nodes = {"nodes": [_issue(1)]}
            return json.dumps({"data": {"repository": {"issues": nodes}}})
        return "molly\n"

    monkeypatch.setattr(gh_issue_comments, "_gh", fake_gh)
    assert board.main(["--repo", "o/r"]) == 0
    assert sum(c[1] == "graphql" for c in calls if c[0] == "api") == 1
    assert "#1 issue 1" in capsys.readouterr().out
