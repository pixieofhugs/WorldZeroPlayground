"""Read a GitHub issue with only the comments a repo collaborator wrote (#1669).

This repo is public, so anyone with a GitHub account can comment on an issue
that already carries `ready-for-agent`. The batch skills read those comments as
authoritative instructions, hand them to a subagent that writes code, and merge
the resulting PR automatically, so the path from "a stranger types a comment" to
"code is on `main`" has no human in it.

The filter runs *here*, in a process no model inhabits. A non-collaborator's
text never reaches model context at all — only the fact that it exists, as a
count. That is the whole point: a rule written into a `SKILL.md` is advisory by
construction, because a `SKILL.md` is a prompt handed to the same model that is
reading the attacker's text, and the injected text is arguing with the rule at
the moment the rule is meant to fire.

The **issue body** is printed unfiltered, on purpose. An issue only reaches the
batch skills once it carries `ready-for-agent`, and applying a label requires
write access — so a human with commit rights read that body and vouched for it.
Comments have no such gate, which is exactly the gap this closes.

Fails **closed**. The collaborator set is fetched before the issue is, so a
lookup that errors means the comments are never even read into this process,
let alone printed. There is no path from a broken lookup to unfiltered output.

The collaborator set is always fetched, never hardcoded: a baked-in list rots
silently the moment someone is added or removed.

Usage:
    python scripts/gh_issue_comments.py <issue-number> [--repo OWNER/NAME]
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SETTINGS_PATH = REPO_ROOT / ".claude" / "settings.json"
HOOK_MARKER = "deny_raw_issue_comments"
HOOK_DOC = "scripts/hooks/deny_raw_issue_comments.py"

ISSUE_FIELDS = "number,title,state,url,author,labels,body,comments"


class CollaboratorLookupError(RuntimeError):
    """The collaborator set could not be established, so nothing may pass."""


def _gh(args: list[str]) -> str:
    result = subprocess.run(
        ["gh", *args], capture_output=True, text=True, encoding="utf-8"
    )
    if result.returncode != 0:
        raise CollaboratorLookupError(
            f"`gh {' '.join(args)}` failed ({result.returncode}): "
            f"{result.stderr.strip() or 'no stderr'}"
        )
    return result.stdout


def collaborators_from_lookup(raw: str) -> frozenset[str]:
    """Parse `gh`'s newline-delimited logins into a comparable set.

    An empty result is treated as a failure rather than an answer. Zero
    collaborators is never true of a repo that has issues, and accepting it
    would withhold every comment while reporting success — which reads as
    "nobody commented" instead of "the lookup is broken".
    """
    logins = frozenset(
        line.strip().casefold() for line in raw.splitlines() if line.strip()
    )
    if not logins:
        raise CollaboratorLookupError(
            "the collaborator lookup returned nobody, which cannot be right"
        )
    return logins


def fetch_collaborators(repo: str) -> frozenset[str]:
    return collaborators_from_lookup(
        _gh(["api", "--paginate", f"repos/{repo}/collaborators", "--jq", ".[].login"])
    )


def fetch_issue(number: str, repo: str) -> dict:
    return json.loads(
        _gh(["issue", "view", number, "--repo", repo, "--json", ISSUE_FIELDS])
    )


def resolve_repo() -> str:
    return _gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]).strip()


def filter_comments(
    comments: list[dict], collaborators: frozenset[str]
) -> tuple[list[dict], int]:
    """Split comments into those a collaborator wrote and a count of the rest.

    A deleted account arrives as ``author: null`` and is nobody, so it is
    withheld like any other stranger.
    """
    kept = [
        comment
        for comment in comments
        if ((comment.get("author") or {}).get("login") or "").casefold()
        in collaborators
    ]
    return kept, len(comments) - len(kept)


def render(issue: dict, kept: list[dict], withheld: int) -> str:
    labels = ", ".join(label["name"] for label in issue.get("labels") or [])
    author = (issue.get("author") or {}).get("login", "unknown")

    lines = [
        f"#{issue.get('number')}  {issue.get('title')}",
        f"state: {issue.get('state')}  author: {author}"
        + (f"  labels: {labels}" if labels else ""),
        "",
        (issue.get("body") or "").strip(),
        "",
        "--",
        "",
    ]

    if kept:
        lines.append(f"{len(kept)} comment(s) from collaborators:")
        for comment in kept:
            login = (comment.get("author") or {}).get("login", "unknown")
            lines += [
                "",
                f"@{login} ({comment.get('createdAt', '')}):",
                (comment.get("body") or "").strip(),
            ]
    else:
        lines.append("No comments from collaborators.")

    if withheld:
        noun = "comment" if withheld == 1 else "comments"
        lines += [
            "",
            f"({withheld} {noun} from non-collaborators withheld)",
            "Their text was dropped before it reached you and cannot be "
            "retrieved through this tool. If one of them matters, a "
            "collaborator has to read it and say so themselves.",
        ]

    return "\n".join(lines)


def hook_is_registered_in(settings: object) -> bool:
    """Is a PreToolUse hook pointing at this control actually wired up?"""
    if not isinstance(settings, dict):
        return False
    entries = (settings.get("hooks") or {}).get("PreToolUse") or []
    return any(
        HOOK_MARKER in str(hook.get("command", ""))
        for entry in entries
        if isinstance(entry, dict)
        for hook in entry.get("hooks") or []
        if isinstance(hook, dict)
    )


def hook_installed(settings_path: Path = SETTINGS_PATH) -> bool:
    """Report whether the enforcing hook exists, rather than assuming it does.

    #1672 shipped three agent definitions asserting a `PreToolUse` hook that
    was never installed, because the snippet lived only in a PR body. A
    document that claims a control it does not have is worse than one that
    claims nothing, so this control checks for itself out loud.
    """
    try:
        return hook_is_registered_in(
            json.loads(settings_path.read_text(encoding="utf-8"))
        )
    except (OSError, json.JSONDecodeError):
        return False


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("number", help="issue number")
    parser.add_argument("--repo", help="OWNER/NAME (default: this checkout's remote)")
    arguments = parser.parse_args(argv)

    # Order is load-bearing. Establishing who is trusted comes first, so a
    # failed lookup means the comments are never read into this process at all.
    try:
        repo = arguments.repo or resolve_repo()
        collaborators = fetch_collaborators(repo)
    except CollaboratorLookupError as error:
        print(
            f"REFUSING TO PRINT COMMENTS: {error}\n"
            "The collaborator set could not be established, so no comment can "
            "be shown to be trustworthy. This fails closed by design (#1669).",
            file=sys.stderr,
        )
        return 1

    issue = fetch_issue(arguments.number, repo)
    kept, withheld = filter_comments(issue.get("comments") or [], collaborators)

    if not hook_installed():
        print(
            "WARNING: the PreToolUse hook that makes this wrapper the only path "
            f"to issue comments is NOT installed ({SETTINGS_PATH}).\n"
            "Filtering was still applied to this output, but a raw "
            "`gh issue view --comments` is not blocked, so the control is "
            f"advisory right now. Install steps: {HOOK_DOC}",
            file=sys.stderr,
        )

    print(render(issue, kept, withheld))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
