---
name: planner-bot
description: Sweeps the whole open issue board into a dispatchable state — closes finished epics, folds duplicates together, researches what looks under-specified, grills what only the owner can decide, and re-asks about stale deferrals. Ends with every open issue carrying `ready-for-agent`, `needs-design`, or a fresh `deferred`. Use for "sort out the board", "triage everything", "what's actually left", or a periodic planning pass.
disable-model-invocation: true
---

# planner-bot

`/builder-bot` needs a board full of `ready-for-agent`. This is the skill that produces one.

It is a **planning** pass, not a building one: it reads, classifies, and **relabels**. It
writes no feature code and opens no PRs.

**Invoke:** `/planner-bot` (or scope it — "just the duplicates", "skip the deferred ones").

**Four hard rules, up front:**

1. **The exit of every issue is a relabel, not a comment.** `needs-triage` is a queue and
   the queue should be empty when the pass ends. Leaving a considered opinion in a comment
   and moving on defers the decision to a future session with less context than this one.
2. **Read every issue whole, through the wrapper, tail first.** A later comment routinely
   reverses the body it sits under — including "I reopened this, it already shipped". A
   bulk `--json body` survey shows **zero comments by construction**; it is fine for
   footprint scouting and never sufficient for a verdict.
3. **Everything written down rots, and a name in an issue is a hypothesis.** Verify a
   premise by searching for the **concept** — the enforcement, the error code, the guard
   test — never for the identifier the issue invented. A miss on an invented name proves
   nothing.
4. **Labels are yours; closes are hers.** Relabelling is cheap and reversible, so do it.
   Closing is not: on a solo repo the owner filed most of these, and a close reads as
   *we have decided against this*. Every close goes to her first, with its evidence.

**Applying a label needs no approval and never waits for the close-out.** Rule 4 grants it
outright; the close-gate above covers closes only. Steps 2–7 each end with the labels they
decided already **on their issues** — not listed in a summary, not staged in a file of
commands to run later. A verdict you reached and did not write is a verdict this board
never received, and the next session starts from the body you already disproved.

---

## Step 0 — Agree the scope

Print the phases (Steps 2–8) with the count each will act on, and ask which to run. Any
phase can be skipped; the default is all of them. If she names a scope in the invocation,
honour it and skip this.

---

## Step 1 — Census the board, change nothing

```
gh issue list --state open --limit 500 --json number,title,labels,createdAt,updatedAt
gh issue list --state open --limit 500 --json labels --jq '[.[]|.labels|map(.name)]|flatten|group_by(.)|map({(.[0]):length})|add'
gh pr list --state open --json number,title,headRefName,body
```

**Count untriaged by the ABSENCE OF A STATE LABEL, never by `labels == []`.** A *kind* label
(`bug`, `enhancement`, `documentation`) makes an issue look triaged to an empty-labels check
while it carries no readiness at all. On the first run this reported **2** unlabeled when the
real number was **7** — the five extras were epics wearing `enhancement`.

```
gh issue list --state open --limit 500 --json number,title,labels \
  --jq '.[]|select([.labels[].name]|any(.=="needs-triage" or .=="needs-info" or .=="ready-for-agent"
        or .=="ready-for-human" or .=="needs-design" or .=="deferred" or .=="epic")|not)
        |"#\(.number) \(.title)"'
```

The same census catches an epic wearing a second state label. Print it here — Step 2 strips
what this finds, and a rule stated only where the fix happens gets skipped by any run that
never reaches that step:

```
gh issue list --state open --limit 500 --json number,title,labels \
  --jq '.[]|select([.labels[].name]|index("epic"))
        |select([.labels[].name]-["epic","bug","enhancement","documentation"]|length>0)
        |"#\(.number) epic also wearing \([.labels[].name]-["epic"]|join(", "))"'
```

Open PRs matter here: **a ruling for an open issue may already exist on an unmerged
branch.** Before asking the owner anything, `git fetch origin pull/N/head:prN` and grep the
relevant PRs — a review may have settled it already. When she then rules differently, say so
on the PR, because its record is now stale.

**Done when** you can state five numbers — open issues, unlabeled, `needs-triage`,
`ready-for-agent`, `deferred` — you have named every epic wearing a second state label, and
you have read every open PR **body** and named any open issue one of them already rules on.
A guess is not a number.

---

## Step 2 — Zero-question closes: the sub-issue graph

Epics never close themselves. Nothing notices that the last child went green, so finished
work sits open and inflates every estimate. Title and label tell you nothing; the graph
tells you everything.

```
gh api repos/pixieofhugs/WorldZeroPlayground/issues/<N>/sub_issues --jq '[.[]|.state]|group_by(.)|map("\(.[0])=\(length)")|join(" ")'
```

Run it over every issue that could be a parent. All children closed → propose a close.

**The graph alone is close to useless here, and both of its answers can be wrong.** On the first
run it saw native children on **4 of 71** issues, and:

- Both candidates it produced were **false positives**. One's closed children were work its own
  ruling listed under "not this issue"; the other's close-out named unfiled work that outlived
  every filed child. An all-closed graph is a prompt to read the epic, never a verdict.
- The one real close was **invisible to it** — eleven children declared in a body table and never
  wired, so `sub_issues` returned empty on a finished epic.

So **scan for prose parentage too**, and treat it as the primary signal:

```
gh issue list --state open --limit 500 --json number,title,body --jq '.[]|"\(.number)\t\(.body)"' |
  grep -oiE '^[0-9]+|(part of|child of|parent of|the answer to|split out of|blocked by) #[0-9]+'
```

Wire what you find (Step 3) so the next run's graph is worth trusting. Empty output from
`sub_issues` means **no native children**, not "no children".

The close itself is hers (Rule 4): propose it with its evidence — the child numbers, the
file now on `main` — and once she approves, close as **completed**, never "not planned".

**Done when** every parent has a counted graph, every all-closed one has a verdict, and every
epic you touched wears `epic` alone — `ready-for-agent` stripped where it had crept on,
applied, not proposed. An epic's state is its children's; one whose body says "one child per
cluster" is otherwise handed to a single agent as a single PR.

---

## Step 3 — Duplicates and consolidation

Cheap first pass over titles and bodies, then the test that actually decides it:

> **Two issues are duplicates only if one change to one place satisfies both.**

Anything short of that is a *relationship*, not a duplicate. Text similarity over-reports
badly, and an issue names **where a problem was noticed, not its extent** — two reports of
the same symptom on different surfaces are usually one root cause and two valid sites.

Three outcomes:

- **True duplicate** → keep the **older** one. Label the other `duplicate` and
  `ready-for-human`, naming the survivor; the close is hers like every other (Rule 4). A
  duplicate is not an exception because it looks obvious — it is the close most often taken
  without asking.
- **Same root cause, different sites** → keep both; make the root-cause issue the parent and
  attach the others as sub-issues:
  `gh api --method POST repos/pixieofhugs/WorldZeroPlayground/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`
  (the numeric **database id** from `gh api .../issues/<n> --jq .id`, and `-F` — `-f` 422s).
- **Should be one epic** → consolidate onto **her** issue, never onto one you wrote. Her
  issue carries her screenshots, her design link, her words; hiding it behind your tidier
  epic reads as a rejection. Add an `Epic:` title prefix that preserves her phrasing, move
  the children onto it (sub-issues have exactly one parent, so re-POSTing is a move), and
  propose *your* duplicate epic for closing instead — hers survives, yours goes to her as a
  close like any other.

**Done when** every proposed pairing has been through the one-change test, the survivors are
named, and each survivor's label is on the issue. Report the pairs you rejected too — a
near-miss you silently dropped is indistinguishable from one you never saw.

---

## Step 4 — Research before you ask

An issue that looks under-specified is usually one you have not read the code for yet.
Split its unknowns:

- **Mechanical unknown** — what the config value is, which route enforces it, whether it
  already shipped, which ADR governs it. **Answer it yourself** and write the answer into
  the issue. This is most of them.
- **Product fork** — a decision only the owner can make. That goes to Step 5.

Where to look, in order: `origin/main` (not your worktree, which can predate recent merges
and manufacture false premises), the guard tests that would fail if the claim were true,
`CONTEXT.md`, `docs/adr/`, and open PR branches.

**The strongest cheap check is running the guard test that would fail if the issue were
right.** An "X is missing" issue has been wrong here before, with 33 green tests proving it.

**Run this step one subagent per issue, and have each apply its own label.** This is the
widest step and the one attention runs out on: by the time a single pass has read twelve
issues it writes summaries instead of labels, and a verdict reached in a summary never
reaches the board. Per-issue agents are independent, so the split matches the seam.

Dispatch one agent for every issue still carrying `needs-triage` or no state label after
Steps 2–3 — no batching, one issue each. Give each agent exactly: the issue number, the repo
path, `python scripts/gh_issue_comments.py <N>` as the only way to read it, the "where to
look" list above, and the label definitions from Step 8. Give it no other issue's contents.

Require each to return this shape, and nothing else:

```
{number, verdict, label_applied, evidence, owner_question}
```

- `verdict` is one of `already-shipped`, `already-built`, `answered`, `product-fork`.
- **The agent applies `label_applied` itself before returning.** It may relabel; it may
  never close, and it may never write feature code.
- `already-shipped` and `already-built` take `ready-for-human` — the close is hers, and
  proposing one is work only she can finish. Never `ready-for-agent`: dispatching finished
  work is the expensive mistake here.
- `product-fork` keeps `needs-triage` and fills `owner_question`. That is the only label
  that survives this step, and only into Step 5.

Merge by re-running the Step 1 census, not by trusting the returns: an agent that failed,
returned nothing, or returned a shape you cannot read leaves its issue visibly unlabelled,
so re-dispatch that one. Collect every `owner_question` into Step 5's queue and every
`already-*` verdict into the close-out's proposed-close list.

**`needs-info` is nearly always the wrong label on this board.** It means *waiting on the
reporter* — and the reporter is the owner, and she is in the session. Use it only for
something genuinely outside the repo: a screenshot of a device you cannot reach, a
third-party response. Everything else is Step 5.

If you do land on `needs-info`, post triage notes in the usual shape — everything
established so far, then specific answerable questions.

**Done when** no surviving issue carries an unknown you could have answered by reading, and
every issue you answered has both the answer and its new label written to it.

---

## Step 5 — Grill what only she can decide

For each issue needing a human decision — `needs-triage`, an unlabeled issue with a real
fork in it, or anything Step 4 could not resolve — grill her on it **here, in this session**.
`/mattpocock-skills:grill-with-docs` is the same shape but is user-invocation-only, so you
cannot call it yourself; ask her to run it when an issue needs an ADR minted.

Working rules, learned the hard way:

- **One issue at a time, one question at a time.** A four-part question gets a one-part
  answer.
- **Bring evidence, not the question.** Read the config values, count the files, price the
  work, then put a *bounded* choice in front of her. She rules fast on concrete numbers and
  slowly on abstractions.

- **Render anything visual BEFORE you ask. This is a standing instruction, not a courtesy.**

  > *"For visual questions, I like to actually see what I'm judging on and may ask you to
  > render it."* — 2026-08-17

  A table of contrast ratios is not a visual. Neither is a hex value. If the answer depends on
  how something **looks**, or on a distinction that is easier to see than to describe, build it
  with `mcp__visualize__show_widget` first and ask underneath it.

  - **Draw the current state as panel one, each option beside it.** The comparison is the
    point; an option shown alone tells her nothing.
  - **Use the REAL token values**, pulled from `index.css` — both cascades where the choice
    differs by theme. A stand-in colour invented for the mock-up changes what the answer means.
    On this run the cast vote petal was drawn as a flat swatch when it is really a seven-stop
    gradient; the render had to be rebuilt before the question was fair.
  - **Hold one variable per comparison.** Move the ground *or* the ornament, never both.
  - **Label anything exaggerated for legibility, and anything illustrative rather than
    proposed.** Say when a face may fall back to a different one in the widget.

  It is cheaper to render unasked than to be asked. Both times this rule was skipped on the
  first run, the reply was *"can you visualize this for me"* / *"please explain more clearly"* —
  and in one case the rendered version got a **different answer** than the ratios were steering
  toward. It applies to triage as much as to grilling: an issue whose fix is a taste call
  belongs in the ruling bucket **with a rendering**, not in the straightforward bucket where an
  agent guesses a token.
- **Never offer an option more restrictive than what already ships.** Read the sibling
  route's real gate before writing the choices, not after — an option that quietly retires
  an advertised unlock is a trap, not a choice.
- **The ruling gets written into the issue with its reason attached.** A ruling whose reason
  is not recorded is indistinguishable from an oversight three weeks later.
- **The tracker moves while you grill.** Re-read an issue before acting on a decision made
  several issues ago.

**ADR hazard.** A grill mints ADRs. An ADR number is claimed at *merge* time on
disk but written into an issue at *authoring* time, so any number sitting in a backlog can
already be taken. Run `ls docs/adr/ | tail` before writing one, and if two ADRs come out of
one pass, assign their numbers explicitly rather than letting both take "the next free" one.
Follow the status vocabulary in #2536; do not rewrite or delete ADR bodies.

**Done when** every issue that entered this step has left it with a new label.

---

## Step 6 — Re-ask about stale deferrals

`deferred` means *later, not now*. Only the stale ones get re-opened for discussion — the
rest are skipped in silence, not re-litigated.

Age it by **when it was deferred**, not when it was filed. Step 1's `createdAt` and
`updatedAt` are both wrong for this — a re-defer moves neither, so an issue she deliberately
re-deferred last week reads as years stale. Run the events loop:

```
for n in $(gh issue list --label deferred --state open --limit 100 --json number --jq '.[].number'); do
  d=$(gh api repos/pixieofhugs/WorldZeroPlayground/issues/$n/events --jq '[.[]|select(.event=="labeled" and .label.name=="deferred")|.created_at]|last')
  echo "$n $d"
done
```

Anything deferred more than **3 months** ago goes to her in one `AskUserQuestion` round —
title, one line of what it asked for, and whether the codebase has moved under it since.
Three outcomes: promote it (`deferred` off, into Step 4/5), close it, or **re-defer** — and
a re-defer means re-applying the label so the clock restarts from today.

**Done when** every deferral is either under 3 months old or has an answer, and every answer
is on the issue as a label — a promote, a close proposal, or a re-applied `deferred`.

---

## Step 7 — Offer to walk the `ready-for-human` work

`ready-for-human` means an agent structurally cannot do it — a dashboard only she can log
into, a credential, a visual judgement, a one-off cutover. List them and offer
`/mattpocock-skills:wizard` for each: a bash script that opens each URL, says what to click,
captures the values and writes them where they belong.

Offer, don't assume — a wizard is worth building for a tedious multi-stage procedure and is
overkill for a two-minute click. Say which you think it is. Do not build a wizard for a step
you could have done yourself; that is a mislabelled issue, so fix the label instead. Skip the
issues wearing this label because they are proposed closes — those need a ruling, not a
script; list them with the close-out instead.

---

## Step 8 — Close out with the board

Steps 2–7 applied these as they went; this step **verifies**, it does not apply. Re-run the
Step 1 census and confirm every open issue already carries one of — and `needs-triage` is
not on this list, so an issue still wearing it has not been triaged:

- **`ready-for-agent`** — dispatchable, with an agent brief. Durable and behavioural: name
  types, contracts and acceptance criteria; never file paths or line numbers, which rot.
  Never on an issue whose comments say it already shipped, and never on one whose fork
  Step 5 has not ruled on — the label is not the ruling, and applying it to an open question
  hands an agent a coin toss.
- **`needs-design`** — the shape needs drawing before it can be built.
- **`deferred`** — deliberately later, deferred within the last 3 months.
- **`ready-for-human`** — with Step 7's verdict attached. This is also where a **proposed
  close** waits: Rule 4 reserves the close for her, so an issue you found already shipped or
  already built is work only she can finish, and it wears this until she rules. Do not invent
  a sixth label for it, and do not park it on `needs-triage`. An **epic** proposed for closing
  is the exception — it keeps `epic` and nothing else, because its state is still its
  children's; the proposal rides in the close-out list, not in a label.
- **`epic`** — a tracking issue. Its state is its children's, not its own, so it wears no
  other state label (Step 2 strips `ready-for-agent`) and the grill skips it. If an epic has
  no open children, it needs children filed or it needs closing — say which.

Print the before/after counts, every close you proposed and what she ruled, the duplicate
pairs and how they were resolved, and — explicitly — **anything still unlabeled and why**.
An issue you merely did not reach is not classified; say so rather than letting the summary
imply a clean board.

Then say what `/builder-bot` would pick up next. Do not start it.

---

## Hazards

1. **Read issues only through `python scripts/gh_issue_comments.py <N>`.** The `gh` CLI's
   own comment reads bypass the collaborator filter on a public repo — and a repo hook
   blocks them, so a raw read fails rather than silently succeeding. Read the wrapper's
   output **whole**: it prints the body first and the comments last, so any `| head -N`
   drops exactly the part most likely to reverse the issue. Page with `sed -n`, or read the
   tail first. If the wrapper warns its hook is uninstalled, say so in the close-out.
   Cheap batch check for which issues even have comments:
   `for n in ...; do echo -n "$n "; python scripts/gh_issue_comments.py $n | grep -cE '^@'; done`
2. **Age is the tell for a reversing comment.** An issue filed hours ago has none. One
   filed days ago frequently has two, and both may contradict the body.
3. **Coupling can live only in the comments.** Two issues that each say "whatever value the
   other lands on" are invisible to any body-only survey.
4. **Write issue and comment bodies with the Write tool, then `--body-file`.** Backticks in
   a `gh ... --body "..."` string are executed by the shell.
5. **A tool that errors is not a tool that says "empty".** An empty `sub_issues` response and
   a failed call look identical through `| wc -l`. Check that each measurement succeeded
   before classifying on it.
6. **Never dispatch from this pass, and never build in it.** Labelling something
   `ready-for-agent` is the end of planner-bot's job; building it is `/builder-bot`'s. When
   she asks for a fix mid-pass — *"it's a one-liner, just do it"* — the answer is the label
   plus "`/builder-bot` picks that up next", not a branch. Refuse the code and the PR even
   when the diff really is one line; a planning pass that ships is no longer reviewable as
   a planning pass.
7. **The repo's guard hook matches on SUBSTRING, not intent.** A heredoc or file whose *text*
   quotes the banned `gh` comment-read command is blocked exactly like a real call. Write such
   content with the Write tool, which the hook does not gate.
8. **Check for a live `/builder-bot` before you start, and again before you rule.** The first run
   had a batch merging underneath it: an issue vanished between two reads ninety seconds apart,
   and five closed during the pass. `gh pr list --state open` plus `gh issue list --state closed`
   filtered to today shows it. Issues in a live batch are **in flight — label them, do not
   re-litigate them.**
9. **A `deferred` ruling needs its blockers wired**, or "revisit when X lands" is a sentence
   nobody reads again. Post the reason, then `POST .../dependencies/blocked_by` for each one.
10. **If the user wants work preserved but not done, a branch is not enough.** `/git-reaper`
    sweeps branches. Tag the commit (`git tag -a keep/<name>` + push) — tags survive branch
    deletion — and record the tag and the file list in the issue.
