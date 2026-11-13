/**
 * Cozy Coven page backdrop (#1209): the candlelight wash behind a Coven profile
 * and the Coven faction page (#2039). `.coven-backdrop` in index.css owns all
 * paint, shared with `.coven-candle-backdrop` (the mobile field desk, #2135).
 */
export default function CovenBackdrop() {
  return <div className="coven-backdrop" aria-hidden="true" />
}
