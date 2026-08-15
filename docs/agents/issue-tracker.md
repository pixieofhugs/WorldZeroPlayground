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

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue; its tickets are **child** issues. This repo
already expresses both relationships natively — the same mechanism the `needs-design` →
`ready-for-agent` pairs use — so wayfinding reuses it rather than inventing a parallel one.

- **Map**: one issue labelled `wayfinder:map`, holding the Destination / Notes / Decisions-so-far /
  Not-yet-specified / Out-of-scope body. `gh issue create --label wayfinder:map`.
- **Child ticket**: a native GitHub sub-issue of the map —
  `gh api --method POST repos/pixieofhugs/WorldZeroPlayground/issues/<map>/sub_issues -F sub_issue_id=<child-db-id>`.
  Labels: `wayfinder:<type>` (`research` / `prototype` / `grilling` / `task`).
- **Blocking**: native issue dependencies —
  `gh api --method POST repos/pixieofhugs/WorldZeroPlayground/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`.
  Both endpoints take the numeric **database id** (`gh api repos/pixieofhugs/WorldZeroPlayground/issues/<n> --jq .id`),
  not the `#number` or `node_id`, and **must** use `-F` — `-f` sends a string and 422s.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write. The assignee *is* the
  claim; an open unassigned child is unclaimed.
- **Frontier query**: the map's open children, minus any with an open blocker or an assignee; first
  in map order wins. Read both relationships back with the **GET** side of the same two endpoints —
  `gh api repos/pixieofhugs/WorldZeroPlayground/issues/<map>/sub_issues` returns the children as
  full issue objects (`state`, `assignee`), and `.../issues/<n>/dependencies/blocked_by` returns the
  blockers, so "open blocker" is a `state` check on that list. Do **not** reach for the
  `issue_dependencies_summary` / `sub_issues_summary` fields some GitHub docs describe: this repo's
  issue payload does not carry them, so `.issue_dependencies_summary.blocked_by > 0` reads as `null`
  on every ticket and quietly reports a blocked frontier as takeable.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append the
  gist + link to the map's Decisions-so-far.
- **Read a ticket** with `python scripts/gh_issue_comments.py <n>` — the collaborator filter below
  applies to wayfinder tickets exactly as it does to everything else.

The five `wayfinder:*` labels are orthogonal to the triage vocabulary in `triage-labels.md`: a
wayfinder label says *what kind of question this is*, a triage label says *readiness*. A map and its
children are working artifacts, not the intake queue — don't put `needs-triage` on them.

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
