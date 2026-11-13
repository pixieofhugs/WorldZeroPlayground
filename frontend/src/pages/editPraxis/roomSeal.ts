/**
 * May the body editor take text? Kept out of `archetypes/controls.tsx` so it is
 * callable in the effect-less `renderToStaticMarkup` harness.
 */

/**
 * `seeded` false = not yet: typing before the server's once-only seed merges
 * into unseen text (ADR-0073). `locked` = moderated (hidden/failed);
 * `EditPraxisState.controlsLocked`.
 */
export function composerWritable(seeded: boolean, locked: boolean): boolean {
  return seeded && !locked;
}
