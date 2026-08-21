/**
 * Everymen full-page backdrop — union poster wall (manila stock, screen-print
 * halftone, burlap weave). Theme-aware via the `.em-backdrop` rule in
 * index.css. Fixed behind page content at z-index 0.
 *
 * The propaganda sunburst is the faction's ONE ornament (#2195) and is mounted
 * here rather than drawn: `.em-backdrop` used to fan its own conic at its own
 * pitch and its own origin, which made the wall one of nine Everymen bursts.
 * It is a child rather than a background layer because the drawing carries a
 * mask, and a mask on `.em-backdrop` itself would eat the paper with it.
 *
 * This wall is a PATTERN, which is what makes a card standing on it go plain —
 * see `backdrop/ornamentedGrounds.ts`.
 */
export default function EverymenBackdrop() {
  return (
    <div className="em-backdrop" aria-hidden="true">
      <div className="em-burst" />
    </div>
  )
}
