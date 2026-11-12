/**
 * Everymen page backdrop: the union poster wall (`.em-backdrop` in index.css).
 * The sunburst is the faction's ONE ornament (#2195), a child because its mask
 * would eat the paper. A PATTERN, so cards on it go plain
 * (`ornamentedGrounds.ts`).
 */
export default function EverymenBackdrop() {
  return (
    <div className="em-backdrop" aria-hidden="true">
      <div className="em-burst" />
    </div>
  )
}
