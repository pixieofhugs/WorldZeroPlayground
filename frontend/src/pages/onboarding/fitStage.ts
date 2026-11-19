// Beats render at their natural size; the sticky text box pins to the viewport bottom and can cover the
// part of a tall beat below the fold. The page scrolls past it; this only brings a live control into view.

const GAP = 12

/** How far to scroll so a control's bottom edge clears the box's top edge (0 when it already does). */
export function scrollNeeded(rowBottom: number, boxTop: number): number {
  return Math.max(0, rowBottom - (boxTop - GAP))
}

/** Scrolls once so the live vote row clears the sticky box; call it when the beat has settled. */
export function revealVoteRow(smooth: boolean) {
  const box = document.querySelector<HTMLElement>('.ob-box')
  const rows = document.querySelectorAll('.ob-stage button[aria-pressed]')
  if (!box || !rows.length) return
  const rowBottom = Math.max(...[...rows].map((b) => b.getBoundingClientRect().bottom))
  const over = scrollNeeded(rowBottom, box.getBoundingClientRect().top)
  if (over > 0) window.scrollBy({ top: over, behavior: smooth ? 'smooth' : 'auto' })
}
