"""Read a GitHub issue with only the comments a repo collaborator wrote (#1669).

Agents read issues with `bros issue <N>` (Bot Bros); this copy stays only as the
library `scripts/board.py` imports, until board moves to Bot Bros' foreman.

The repo is public and batch skills act on `ready-for-agent` comments up to an
automatic merge, so a stranger's comment is a prompt injection with no human in
the path. Filtering here, outside any model, means non-collaborator text never
reaches context (only a count); a rule in a `SKILL.md` is read by the same model
reading the attacker's text.

The issue body is printed unfiltered: the label needs write access, so a
collaborator vouched for it. Fails closed: collaborators are fetched (never
hardcoded) before the issue, so a failed lookup prints nothing.

Usage:
    python scripts/gh_issue_comments.py <issue-number> [--repo OWNER/NAME]
        [--tail N] [--since ISO]

`--tail`/`--since` narrow only what the collaborator filter already kept.
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SETTINGS_PATH = REPO_ROOT / ".claude" / "settings.json"
HOOK_DOC = "the Bot Bros bouncer plugin (run /bros:setup)"

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
    """Empty is a failure: it would otherwise read as "nobody commented"."""
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
    """`(collaborator comments, withheld count)`; ``author: null`` is withheld."""
    kept = [
        comment
        for comment in comments
        if ((comment.get("author") or {}).get("login") or "").casefold()
        in collaborators
    ]
    return kept, len(comments) - len(kept)


def narrow(kept: list[dict], tail: int | None = None, since: str | None = None) -> list[dict]:
    if since:  # UTC ISO-8601: string order is time order
        kept = [c for c in kept if (c.get("createdAt") or "") >= since]
    return kept[-tail:] if tail else kept


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
    if not isinstance(settings, dict):
        return False
    plugins = settings.get("enabledPlugins") or {}
    return any(name.startswith("bouncer@") and on for name, on in plugins.items())


def hook_installed(settings_path: Path = SETTINGS_PATH) -> bool:
    """Check the enforcing hook exists rather than assume it (#1672)."""
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
    parser.add_argument("--tail", type=int, metavar="N", help="only the last N collaborator comments")
    parser.add_argument("--since", metavar="ISO", help="only comments created at/after this ISO time")
    arguments = parser.parse_args(argv)

    # cp1252 Windows consoles crash on em-dashes; a broken wrapper invites
    # bypassing it.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    # Collaborators first: a failed lookup must never read comments.
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
    kept = narrow(kept, arguments.tail, arguments.since)

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
