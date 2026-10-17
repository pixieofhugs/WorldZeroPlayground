"""One table of the open `ready-for-agent` board (#3236).

Replaces ~40 `gh` calls (blocked_by per issue, the comment wrapper twice per
issue) with one GraphQL query. GitHub's GraphQL `Issue` exposes `blockedBy` and
`closedByPullRequestsReferences`, which the REST issue payload does not.

Comments come through the same collaborator filter as
`gh_issue_comments.py` (imported, not re-implemented): a stranger's comment is
dropped before any verdict is read from it.

Columns: issue, open blockers, the open PR that closes it (in flight), body
length, and the latest planner stamp (`Verified-at` sha + its Premise line).

Usage:
    python scripts/board.py [--repo OWNER/NAME]
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import gh_issue_comments as wrapper  # noqa: E402

QUERY = """
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    issues(first: 100, states: OPEN, labels: ["ready-for-agent"]) {
      nodes {
        number title body
        blockedBy(first: 20) { nodes { number state } }
        closedByPullRequestsReferences(first: 5, includeClosedPrs: false) {
          nodes { number isDraft }
        }
        comments(last: 20) { nodes { author { login } createdAt body } }
      }
    }
  }
}
"""

STAMP = re.compile(r"\*\*Verified-at:\*\*\s*`?([0-9a-f]{7,40})")
PREMISE = re.compile(r"\*\*Premise:\*\*\s*(.+)")


def latest_stamp(comments: list[dict]) -> str:
    """`sha — premise` from the newest comment carrying a Verified-at, else `-`."""
    for comment in reversed(comments):
        body = comment.get("body") or ""
        if sha := STAMP.search(body):
            premise = PREMISE.search(body)
            return f"{sha[1][:9]} — {premise[1][:70]}" if premise else sha[1][:9]
    return "-"


def build_rows(issues: list[dict], collaborators: frozenset[str]) -> list[dict]:
    rows = []
    for issue in issues:
        kept, _ = wrapper.filter_comments(issue["comments"]["nodes"], collaborators)
        blockers = [b["number"] for b in issue["blockedBy"]["nodes"] if b["state"] == "OPEN"]
        prs = issue["closedByPullRequestsReferences"]["nodes"]
        rows.append(
            {
                "number": issue["number"],
                "title": issue["title"],
                "blocked_by": ",".join(f"#{n}" for n in blockers) or "-",
                "pr": ",".join(f"#{p['number']}{' (draft)' if p['isDraft'] else ''}" for p in prs) or "-",
                "size": len(issue.get("body") or ""),
                "stamp": latest_stamp(kept),
            }
        )
    return rows


def render(rows: list[dict]) -> str:
    head = "| issue | blocked_by | in flight | size | planner stamp |\n|---|---|---|---|---|"
    lines = [
        f"| #{r['number']} {r['title'][:60]} | {r['blocked_by']} | {r['pr']} | {r['size']} | {r['stamp']} |"
        for r in rows
    ]
    return "\n".join([head, *lines]) if lines else "No open ready-for-agent issues."


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repo", help="OWNER/NAME (default: this checkout's remote)")
    arguments = parser.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    try:
        repo = arguments.repo or wrapper.resolve_repo()
        collaborators = wrapper.fetch_collaborators(repo)  # first: fails closed
        owner, name = repo.split("/")
        raw = wrapper._gh(
            ["api", "graphql", "-f", f"query={QUERY}", "-f", f"owner={owner}", "-f", f"name={name}"]
        )
    except wrapper.CollaboratorLookupError as error:
        print(f"REFUSING TO PRINT THE BOARD: {error}", file=sys.stderr)
        return 1
    nodes = json.loads(raw)["data"]["repository"]["issues"]["nodes"]
    print(render(build_rows(nodes, collaborators)))
    # ponytail: first 100 issues, last 20 comments each; page if the board outgrows it.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
