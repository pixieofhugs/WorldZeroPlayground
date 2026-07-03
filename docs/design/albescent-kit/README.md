# Albescent design kit — vendored for issue #232 (first-class Albescent identity)

Vendored 2026-07-03. Two sources, two freshness tiers:

1. **Canonical (cloud, FRESH — fetch these first):** the cloud "World Zero Design
   System" project (`019e221c-7853-7530-a934-7d3b2b7c8b43`) holds the
   restructured, contract-aligned React components under
   `components/factions/albescent/`:
   `AlbescentTaskCard.jsx`, `AlbescentPraxisCard.jsx`, `AlbescentPraxisRow.jsx`,
   `AlbescentEditPraxis.jsx`, `AlbescentAvatar.jsx`, `AlbescentNavBadge.jsx`,
   `AlbescentSigil.jsx` (+ `.d.ts` prop contracts). If you have DesignSync
   access, read those. They consume the root contract JSONs
   (`task-card-contract.json`, `praxis-card-contract.json`,
   `edit-praxis-contract.json`).

2. **Fallback (this directory, 2026-06-26 export of the deprecated `templates/`
   tier):** the files here carry the same *visual identity* (vellum
   correspondence: always-light, near-black ink, Cormorant Garamond, quiet
   fleur/laurel marks, "bear witness", no points logged on the feed) but predate
   the 2026-07-02 contract restructure — e.g. they don't surface `votePoints`.
   Where they disagree with a contract slot, the contract wins.

Also relevant, already in the repo: `AlbescentComment` voice
(`frontend/src/components/comments/voices/`), the Albescent praxis-READ page
(#231/#358, `AlbescentPraxisDetail`), the `--faction-albescent-*` tokens in
`index.css`, and the join letter in `docs/design/join/Albescent Join Screen.html`.
