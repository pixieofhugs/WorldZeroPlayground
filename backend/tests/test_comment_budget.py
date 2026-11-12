"""scripts/comment_budget.py and scripts/hooks/pr_body_budget.py.

Here because CI runs pytest only from backend/.
"""

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path[:0] = [str(REPO_ROOT / "scripts"), str(REPO_ROOT / "scripts" / "hooks")]

import comment_budget as cb  # noqa: E402
import pr_body_budget as pb  # noqa: E402

PY = '''"""Module docstring."""
x = 1  # trailing comments are code lines
# a comment
answer = """
not a docstring
"""
# ponytail: free
def f():
    """Doc
    string."""
'''

TS = """// line
/**
 * block
 */
const a = 1;
{/* jsx */}
// eslint-disable-next-line
"""


def test_classify_python():
    assert cb.classify(PY, ".py") == ["c", "x", "c", "x", "x", "x", "", "x", "c", "c"]


def test_classify_c_like():
    assert cb.classify(TS, ".tsx") == ["c", "c", "c", "c", "x", "c", ""]


def test_budget_has_a_floor_and_a_ratio():
    assert cb.budget(0) == 4
    assert cb.budget(50) == 10


def _hook(tool_input):
    return subprocess.run(
        [sys.executable, str(REPO_ROOT / "scripts" / "comment_budget.py"), "--hook"],
        input=json.dumps({"tool_input": tool_input}),
        capture_output=True,
        text=True,
    )


def test_hook_nudges_a_comment_heavy_edit():
    r = _hook(
        {
            "file_path": "a.py",
            "old_string": "x = 1",
            "new_string": "# c\n" * 6 + "x = 1",
        }
    )
    assert r.returncode == 2 and "6 comment lines" in r.stderr


def test_hook_passes_a_rewrite_that_cuts_comments():
    r = _hook(
        {"file_path": "a.ts", "old_string": "// c\n" * 9, "new_string": "// c\n" * 6}
    )
    assert r.returncode == 0


def test_hook_ignores_non_code_and_bad_input():
    assert _hook({"file_path": "a.md", "content": "# h\n" * 50}).returncode == 0
    assert _hook({}).returncode == 0


def test_pr_body_words_skip_the_footer():
    footer = "🤖 Generated with [Claude Code](https://claude.com/claude-code)"
    body = f"one two three\n\n{footer}\nhttps://claude.ai/code/x"
    assert pb.words(body) == 3


def test_pr_number_from_create_output_or_edit_arg():
    assert (
        pb.pr_number("gh pr create --fill", "https://github.com/o/r/pull/12\n") == "12"
    )
    assert pb.pr_number("gh pr edit 34 --body-file -", "") == "34"
    assert pb.pr_number("gh pr view 34", "") is None
