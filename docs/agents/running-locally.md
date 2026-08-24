# Running the stack locally

What the commands in CLAUDE.md's "Running locally" section assume, and the two
things that make them fail silently. Read this before starting the backend.

## The backend needs the venv on `PATH`

`.claude/launch.json`'s **Backend (FastAPI)** entry runs `python -m uvicorn`.
`python` resolves off `PATH`. uvicorn is installed in `backend/.venv`, not
globally, so on a shell with an unactivated venv the preview dies instantly:

    ...\Python313\python.exe: No module named uvicorn

**Activate `backend/.venv` before starting the backend preview** — and before
running `uvicorn main:app --reload`, `pytest`, or `alembic` by hand.

The entry stays as `"python"` on purpose (#2408). Pointing it at the venv means
committing `Scripts/python.exe` (Windows) or `bin/python` (POSIX), which fixes
one platform and breaks the other; and it would be wrong in a worktree anyway,
for the reason below.

## The backend preview does not work from a git worktree

CLAUDE.md tells agents to work in an isolated worktree for any non-trivial
change, so this is the common case, not the edge one.

`launch.json` is read relative to the session's cwd, so a worktree session reads
*the worktree's* copy — and **no worktree under `.claude/worktrees/` carries a
`backend/.venv`**. There is no interpreter there with uvicorn on it, whatever
the config points at.

The missing venv is the whole of the problem — nothing deeper is broken. A venv
already on `PATH` is a real workaround: a worktree session that inherits an
activated environment (the main checkout's, or any venv holding the backend's
dependencies) starts the backend fine.

Making this work *by default* from a worktree needs a venv strategy — a shared
venv on `PATH`, or a bootstrap step that creates one per worktree. That is a
separate issue, not a path edit to `launch.json`.

## `--reload` does not notice a branch switch

`uvicorn --reload` watches for file writes. A `git checkout` of another branch
rewrites the working tree, and the reloader does **not** reliably pick it up —
you can read a response produced by the code you just checked out *away* from,
and mistake it for a bug on the branch you are now on.

**Restart the backend after changing branches.**
