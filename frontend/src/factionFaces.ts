/**
 * The faction @font-face sheet, as a chunk (#2079).
 *
 * `src/fonts.faction.css` carries the 62 `@font-face` rules for the 15 families
 * only a faction surface renders in. This module exists to be the ONE importer
 * of that file, so Vite has exactly one chunk to attach the emitted CSS asset
 * to: import the stylesheet from several places instead and it is copied into
 * each importing chunk's sheet.
 *
 * IMPORTING THIS MODULE IS THE REQUEST. There is nothing to call — the side
 * effect is the point, and Vite injects the `<link>` when the chunk loads.
 *
 * TWO WAYS IN, AND THE DIFFERENCE MATTERS.
 *
 * `factions/lazyArchetype.tsx` reaches it with a dynamic `import()`, because that
 * module IS in the entry chunk: a static import there would fold all 62 rules
 * straight back into the render-blocking stylesheet. Every faction archetype
 * loads through `preload()`, so that one call covers ~150 of them.
 *
 * A lazy module that draws a faction face WITHOUT dispatching an archetype
 * imports this statically instead (`pages/Home.tsx` for the landing page's
 * Caveat and Permanent Marker, `components/AlbescentInvitation.tsx` and
 * `pages/AlbescentSecretPlaceholder.tsx` for the order's Cormorant). Static is
 * the better one where it is available: the sheet is then a dependency of that
 * chunk, so the browser has it before the module executes and there is no
 * fallback flash at all.
 *
 * `utils/__tests__/factionFaceSplit.test.ts` holds both halves of the boundary —
 * that every file rendering in one of the 62 can reach this module, and that
 * nothing statically reachable from `main.tsx` imports it.
 */
import "./fonts.faction.css";
