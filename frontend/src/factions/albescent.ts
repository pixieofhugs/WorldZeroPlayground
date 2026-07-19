/**
 * albescent — a REGISTERED faction that overrides nothing (#783).
 *
 * Albescent is a secret society hiding in plain sight (ADR-0027): at first
 * glance it must be indistinguishable from an unaffiliated player, revealing
 * itself only through the invitation flow and, later, through flourishes inside
 * its own components. It was built as the opposite — a first-class faction
 * (#232) with a 35-declaration token block, a rainbow slot and ~20 bespoke
 * skins — so it announced itself on every surface it touched.
 *
 * This manifest is therefore deliberately EMPTY of surfaces. Because the
 * manifest is override-only, every surface falls through to its own `Default*`
 * archetype, which reads `--faction-default-*` — the unaffiliated identity
 * (ADR-0039). Albescent gets that treatment automatically, everywhere, forever,
 * including on surfaces that do not exist yet. `albescent` is also absent from
 * `CSS_KEY`, so `isKnownFaction('albescent')` is false and it takes the same
 * branch as `na` on every ornament surface.
 *
 * The module stays because the faction is still REGISTERED — it keeps its slug,
 * its catalog copy, its reveal mechanics and its `/factions` row. Registration
 * and theming are separate things; this issue removed the second, not the first.
 *
 * A row added back here re-themes that surface. When the flourishes land
 * (#783 commit 7, deliberately unbuilt), they arrive as components named here —
 * and each must EARN its row by adding a flourish. A component that merely
 * re-renders Default's structure is worse than no file, because the fallthrough
 * already does that for free.
 */
import type { FactionManifest } from './manifest'

export const ALBESCENT_MANIFEST: FactionManifest = {
  slug: 'albescent',
}
