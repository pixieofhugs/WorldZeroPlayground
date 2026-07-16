# Design references

Vendored design deliverables for the faction-surface work, so build agents have the
visual source in-repo (no external login or Downloads dependency).

**These are references, not production code.** Read the markup/styles for *intent* and
rebuild on the real app state with this repo's components and conventions. Do **not**
port the prototyping runtime (`support.js`, `_ds_bundle.js`, `*.dc.html` harness mounts).
The prop shapes in the kits (`PraxisEntry`, `CommentEntry`, `onSignUp`, …) are demo
stand-ins — discard them and consume the real state (`useTaskDetail`, `usePraxisDetail`, …).

## What's here

| Path | Use for |
|---|---|
| `design-system/tokens/` | **Source of truth for colors/type/spacing.** `colors.css` holds the `--faction-*` blocks (light + dark). |
| `design-system/components/` | Shared faction component specs (`FactionTaskCard`, `FactionPraxisCard`, `FactionVoteStamps`, `FactionCommentBox`, pennant, etc.) — `*.prompt.md` + `*.card.html`. |
| `design-system/guidelines/` | Palette / type / spacing / brand reference cards. |
| `design-system/templates/<faction>/` | Per-faction kit sources (`*.jsx`/`*.css`) — vote, backdrop, avatar, hero, feed surfaces. Used by #221–#224. |
| `task-detail/` | The 7 task-detail archetypes (`*TaskDetail.tsx`). Used by #210–#214, #242. See the locked spec on #242. |
| `praxis-read/factions/<faction>/` | The 7 praxis read-page designs. Used by #205–#209, #231. |
| `collab-submission/` | 4-state collab-submission composer mockup (Wow dark-mode), the recipe for the other 7 factions in its `README.md`. Shipped only as a single rendered `design-reference.html` — no separate `.tsx`/`.jsx` source was provided, so unlike the kits above there's nothing lighter to vendor instead. Read for intent per the note above; don't port its runtime. Used by #590, #591, #592. |

## Token truth vs. stale text

- **UA is the gilt salon** — burnt amber + antique gold on parchment (`--faction-ua-*` in
  `design-system/tokens/colors.css`), **always-light**. Ignore any older note calling UA
  purple (`#7c3aed`) — the DS tokens win.
- **Albescent is always-light** (vellum, near-black ink `#1c1c1a`); **Singularity is
  always-dark** (terminal). Always-fixed factions use identical light/dark token values —
  never by mutating the global `[data-theme]`.

## Provenance

Exported from the World Zero Design System (claude.ai/design project
`019e221c-7853-7530-a934-7d3b2b7c8b43`) plus the task-detail and faction-praxis handoff
bundles. Heavy rendered `.dc.html` canvases (2–4 MB each) were intentionally **not**
vendored — only the portable `.tsx`/`.jsx`/`.css`/token/`.md` sources.
