"""PreToolUse hook: deny raw reads of GitHub issue comments (#1669).

Makes `scripts/gh_issue_comments.py` (collaborator-only filter) the *only* path;
see its docstring for the threat. The wrapper's own `gh` calls are subprocesses,
not Bash tool calls, so they never reach this hook.

Denies when it cannot parse its input: failing open would silently reopen the
hole on any schema change.

INSTALL
-------
Merge into `.claude/settings.json`:

{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python \"$CLAUDE_PROJECT_DIR/scripts/hooks/deny_raw_issue_comments.py\""
          }
        ]
      }
    ]
  }
}

Verify in a *new* session:

    gh issue view 1669 --comments          # must be denied
    python scripts/gh_issue_comments.py 1669   # must work, and stop warning
"""

import json
import re
import sys

# `--json comments` returns the same bytes as `--comments`. The `[^|;&]*` bound
# keeps `... --json state,title | grep comments` out.
# ponytail: literal `gh` forms only; `gh api graphql` or curl walk past. If that
# becomes a real path, deny `gh api graphql` outright and add a wrapper flag.
BLOCKED_FORMS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"\bgh\s+issue\s+view\b.*--comments\b"),
        "`gh issue view --comments`",
    ),
    (
        re.compile(r"\bgh\s+issue\s+view\b.*--json\b[^|;&]*\bcomments\b"),
        "`gh issue view --json comments`",
    ),
    (
        re.compile(r"\bgh\s+api\b.*/issues/\d+/comments\b"),
        "`gh api .../issues/N/comments`",
    ),
)

WRAPPER = "python scripts/gh_issue_comments.py <issue-number>"


def denial_reason(tool_name: str, command: str) -> str | None:
    if tool_name != "Bash":
        return None
    for pattern, description in BLOCKED_FORMS:
        if pattern.search(command):
            return (
                f"{description} reads comments from a public issue, where anyone "
                f"with a GitHub account can write. Use `{WRAPPER}` instead — it "
                "drops comments from non-collaborators before they reach you, and "
                "reports how many it withheld (#1669)."
            )
    return None


def decide(payload: object) -> str | None:
    if not isinstance(payload, dict):
        return "Hook payload was not an object, so it cannot clear this call."
    return denial_reason(
        str(payload.get("tool_name", "")),
        str((payload.get("tool_input") or {}).get("command", "")),
    )


def main() -> int:
    try:
        reason = decide(json.load(sys.stdin))
    except Exception as error:  # noqa: BLE001 - see module docstring: deny on error
        reason = (
            f"Hook could not read its own input ({error}), so it cannot clear "
            "this call. See scripts/hooks/deny_raw_issue_comments.py (#1669)."
        )

    # Print nothing to allow: an explicit "allow" would skip the user's prompt.
    if reason is None:
        return 0

    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason,
            }
        },
        sys.stdout,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
