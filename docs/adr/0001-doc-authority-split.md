# Documentation authority is split: design canon vs. wiring

**Status:** Accepted
**Date:** 2026-06-22

The vault design docs and the repo (`SPEC-faction-ui-profile.md` + code) disagree about
faction facts — names, colors, slugs, which surfaces vary. Authority is split by the
*kind* of fact:

- **Faction design — color, aesthetic, typography, identity, abilities, lore, invitation
  voice** → the **vault design docs are canon** (`World-Zero-Design.md`, with the
  per-faction `design/` kits as supporting source). `index.css` and the rest of the
  frontend are the *implementation* of that canon and must match it; when they drift, the
  vault wins and the code gets synced. (Where the vault itself is stale because a newer
  design decision shipped without being written back, the fix is to *update the vault* to
  record the real decision — not to let code be the silent canon.)
- **Pure wiring — slug strings, dispatcher maps, DB plumbing, the legacy-slug reuse trick,
  file layout** → **code is canon.** The vault shouldn't dictate that "Everymen" rides the
  `analog` slug; that's an implementation detail.

The seam: "what it is and how it looks" (vault) vs. "how it's wired" (code).

Supersedes the session's first draft, which wrongly put color on the code side.
