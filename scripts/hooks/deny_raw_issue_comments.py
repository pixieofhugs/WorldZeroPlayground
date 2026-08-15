"""PreToolUse hook: deny raw reads of GitHub issue comments (#1669).

This repo is public. Anyone with a GitHub account can comment on an issue that
already carries `ready-for-agent`, the batch skills read those comments as
authoritative instructions, and `/wz-next-batch` merges the resulting PR without
a human in the path.

`scripts/gh_issue_comments.py` filters those comments down to repo
collaborators. This hook is what makes that wrapper the *only* path. Without it
the wrapper is advisory: one more thing a model may or may not choose, and the
injected text is arguing with that choice at the moment it is made. A rule in a
`SKILL.md` cannot close this, because a `SKILL.md` is a prompt handed to the
same model that is reading the attacker's text.

The wrapper's own `gh` calls are Python subprocesses, not `Bash` tool calls, so
they never reach this hook — blocking the raw forms does not block the wrapper.

**This hook denies when it cannot parse its own input.** That is deliberate. A
hook that cannot read its payload cannot clear the command, and silently
allowing would reopen the hole on any schema change. Denying is loud,
self-announcing, and fixed in minutes; the alternative fails silently for
months.

INSTALL (manual, and it will not travel to a fresh clone)
---------------------------------------------------------
`.gitignore:14` ignores `/.claude/*` except `/.claude/agents/`, so
`.claude/settings.json` cannot be committed. Merge this into it by hand:

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

Then verify, in a *new* session so settings reload:

    gh issue view 1669 --comments          # must be denied
    python scripts/gh_issue_comments.py 1669   # must work, and stop warning

Until it is installed, `scripts/gh_issue_comments.py` prints a warning on stderr
every run, so the control's absence is visible rather than assumed.
"""

import json
import re
import sys

# Every documented route from a Bash tool call to a raw comment body. The
# `--json` form is not an afterthought: it returns the same bytes as
# `--comments`, so leaving it open would make this hook cosmetic. The
# `[^|;&]*` bound keeps `... --json state,title | grep comments` out of it.
#
# ponytail: literal `gh` invocations only. `gh api graphql` with a hand-written
# comments query, or curl against api.github.com, both walk past this. Closing
# those means matching intent rather than syntax; if it becomes a real path,
# the upgrade is to deny `gh api graphql` outright and add a wrapper flag.
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
    """Return why this call must be denied, or None to leave it alone."""
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

    # Nothing to deny means print nothing: an explicit `"allow"` would wave the
    # call past the user's normal permission prompt, and this hook has no
    # business granting permissions it was never asked about.
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
