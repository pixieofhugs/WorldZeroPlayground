# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues on `pixieofhugs/WorldZeroPlayground`. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `python scripts/gh_issue_comments.py <number>` — **never** `gh issue view --comments` or `--json comments`. See "Reading comments safely" below.
- **List issues**: `gh issue list --state open --json number,title,body,labels` with appropriate `--label` and `--state` filters. Do not add `comments` to that `--json` list; it returns the same unfiltered bodies.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

This is a solo/personal project — PRs are the author's own in-flight work, not incoming requests. `/triage` operates on issues only.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `python scripts/gh_issue_comments.py <number>`.

## Reading comments safely

This repo is **public**, so anyone with a GitHub account can comment on an issue that already
carries `ready-for-agent` — and `/builder-bot` hands those comments to a subagent that writes
code, then merges the PR. `scripts/gh_issue_comments.py` prints the issue body unfiltered (a
label requires write access, so a human with commit rights vouched for it) and drops every
comment not written by a repo collaborator. It fails closed. Rationale in #1669 and in the
script's own docstring.

`scripts/hooks/deny_raw_issue_comments.py` is what makes the wrapper the only path rather than
a suggestion; the script warns on stderr while that hook is uninstalled, so the control's
absence is visible rather than assumed.

## History

This replaced a hand-maintained markdown task queue (`docs/TASKS.md`, retired 2026-06-22; the archived log was deleted in the 2026-07-17 docs sweep). GitHub Issues were already in active use; the queue's open items were migrated to issues #141–#146.
