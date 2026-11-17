# Planning notes

What `/foreman:planner-bot` (Bot Bros) leaves to the repo. The skill is the pass; this is
World Zero's half of it.

## Where a premise is checked

After `origin/main` and the guard tests: `CONTEXT.md` (the glossary), `docs/adr/` (which are
still rules: `docs/adr/README.md`), `docs/spec/`, and `WORLD_ZERO_STYLE.md` for design intent.

## Rendering a visual question

> *"For visual questions, I like to actually see what I'm judging on and may ask you to
> render it."* — the owner, 2026-08-17

Render with `mcp__visualize__show_widget` (an Artifact also works). Take real token values
from `frontend/src/css/*.css`, both the light and dark cascades where the choice differs by
theme. A faction face may fall back to another in the widget; say so when it does.

## ADRs

Run `ls docs/adr/ | tail` before numbering one; two from one pass get their numbers assigned
explicitly. Status vocabulary is #2536. Regenerate the index with
`python scripts/adr_index.py`. `/mattpocock-skills:grill-with-docs` mints them, and only the
owner can invoke it.

## Label history

`deferred` was once spelled `differed`, and issue events keep the old name, so Step 6's
events loop also matches `.label.name=="differed"`.
