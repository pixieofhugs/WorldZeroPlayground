/**
 * The deferred faction-dress chunk (#2079, widened by #2073).
 *
 * TWO SHEETS, ONE CHUNK.
 *
 * `src/fonts.faction.css` carries the 62 `@font-face` rules for the 15 families
 * only a faction surface renders in. `src/motion.ornament.css` carries the
 * reduced-motion-gated ORNAMENT MOTION — the vote widgets' set, the Singularity
 * scanline and cursor, the Coven watermark's turn, the UA mandala. Neither is
 * first-paint content, and this module exists to be the ONE importer of both, so
 * Vite has exactly one chunk to attach the emitted CSS asset to: import either
 * stylesheet from several places instead and it is copied into each importing
 * chunk's sheet.
 *
 * They ride together because they need the identical delivery — off the entry
 * HTML, reachable from every chunk that draws faction dress — and one loader is
 * simpler than two parallel ones. Their FAILURE modes differ, and that
 * difference is why only one of them gets a reachability assertion: a stranded
 * face is a change of identity that looks like a slow network, so
 * `factionFaceSplit.test.ts` proves every load root can reach this module. A
 * stranded animation is just the reduced-motion state, which every ornament in
 * that sheet already has to render as a legible drawn frame — so
 * `motionSplit.test.ts` guards the sheet's CONTENTS and its gates instead.
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
import "./motion.ornament.css";
