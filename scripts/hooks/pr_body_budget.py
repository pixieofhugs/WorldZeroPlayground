"""PostToolUse hook (Bash): after `gh pr create|edit`, warn on an over-budget PR body.

Warns (exit 2, stderr goes to the agent); never blocks. Counts words, not lines, because
one bullet can be a paragraph. The attribution footer and session link are free.
"""

import json
import re
import subprocess
import sys

WORDS = 250
FREE = re.compile(
    r"Generated with \[Claude Code\]|^https://claude\.ai/code/|^Co-Authored-By:", re.I
)


def words(body: str) -> int:
    return sum(
        len(line.split()) for line in body.splitlines() if not FREE.search(line.strip())
    )


def pr_number(command: str, response: str) -> str | None:
    if not re.search(r"\bgh\s+pr\s+(create|edit)\b", command):
        return None
    match = re.search(r"/pull/(\d+)", response) or re.search(
        r"\bgh\s+pr\s+edit\s+#?(\d+)", command
    )
    return match.group(1) if match else None


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        number = pr_number(
            payload["tool_input"]["command"],
            json.dumps(payload.get("tool_response", "")),
        )
        if not number:
            return 0
        body = subprocess.run(
            ["gh", "pr", "view", number, "--json", "body", "-q", ".body"],
            capture_output=True,
            text=True,
            timeout=20,
            check=True,
        ).stdout
    except Exception:
        return 0
    count = words(body)
    if count <= WORDS:
        return 0
    print(
        f"PR #{number} body is {count} words; the budget is {WORDS} "
        "(docs/agents/writer-rules.md, 'PR body'). Trim it with "
        f"`gh pr edit {number} --body-file -`: no file list, one line per deviation, "
        "no restating the diff.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
