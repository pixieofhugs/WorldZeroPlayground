/**
 * The deferred faction-dress chunk (#2079, #2073): the ONE importer of
 * `fonts.faction.css` (faction-only @font-face) and `motion.ornament.css`
 * (reduced-motion-gated ornament motion), so Vite attaches the CSS to one chunk
 * rather than copying it into each importer. Importing it is the request.
 *
 * `factions/lazyArchetype.tsx` imports it dynamically (it is in the entry chunk;
 * static would make it render-blocking). Lazy modules drawing a faction face
 * without an archetype (`pages/Home.tsx`, `AlbescentInvitation.tsx`,
 * `AlbescentSecretPlaceholder.tsx`) import it statically: no fallback flash.
 *
 * Guards: `utils/__tests__/factionFaceSplit.test.ts` (reachability; a stranded
 * face looks like a slow network), `motionSplit.test.ts` (sheet contents).
 */
import "./fonts.faction.css";
import "./motion.ornament.css";
