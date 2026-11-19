// Beats render at their natural size; the sticky text box pins to the viewport bottom and can cover the
// part of a tall beat below the fold. The page scrolls past it; this only brings a live control into view.

const GAP = 12

/** How far to scroll so a control's bottom edge clears the box's top edge (0 when it already does). */
export function scrollNeeded(rowBottom: number, boxTop: number): number {
  return Math.max(0, rowBottom - (boxTop - GAP))
}

function reveal() {
  const box = document.querySelector<HTMLElement>('.ob-box')
  const rows = document.querySelectorAll('.ob-stage button[aria-pressed]')
  if (!box || !rows.length) return
  const rowBottom = Math.max(...[...rows].map((b) => b.getBoundingClientRect().bottom))
  const over = scrollNeeded(rowBottom, box.getBoundingClientRect().top)
  if (over > 0) window.scrollBy({ top: over, behavior: 'smooth' })
}

/** Keeps a beat's pressable row clear of the sticky box; returns the cleanup. */
export function watchStageFit(): () => void {
  let raf = 0
  const run = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(reveal)
  }
  const root = document.querySelector('.ob-root')
  // The box grows a line as its text types out on a narrow screen.
  const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(run)
  const mo = new MutationObserver(() => {
    ro?.disconnect()
    const box = document.querySelector('.ob-box')
    if (box) ro?.observe(box)
    run()
  })
  if (root) mo.observe(root, { childList: true, subtree: true })
  window.addEventListener('resize', run)
  run()
  return () => {
    cancelAnimationFrame(raf)
    mo.disconnect()
    ro?.disconnect()
    window.removeEventListener('resize', run)
  }
}
