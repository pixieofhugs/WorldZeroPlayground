// A beat's stage is drawn at one natural size; the sticky text box pins to the viewport bottom
// and covers whatever is taller than the room above it. This sets `--fit` (<= 1) on the stage,
// which flow.css turns into `zoom` on the beat, so a short window shrinks the scene, never hides it.

const GAP = 12
const FLOOR = 0.3
// WCAG 2.5.8: a control a player must hit never renders under 24 CSS px.
const MIN_TARGET = 24

/** The smallest scale a scene may take; `smallestTarget` is its tiniest live control at full size (px), or null. */
export function fitFloor(smallestTarget: number | null): number {
  return smallestTarget ? Math.min(1, Math.max(FLOOR, MIN_TARGET / smallestTarget)) : FLOOR
}

function fit() {
  const stage = document.querySelector<HTMLElement>('.ob-stage')
  const box = document.querySelector<HTMLElement>('.ob-box')
  const scene = stage?.firstElementChild as HTMLElement | null
  if (!stage || !box || !scene) return
  stage.style.setProperty('--fit', '1')
  stage.style.setProperty('--under', '0px')
  const cs = getComputedStyle(scene)
  const natural = scene.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom)
  const targets = [...scene.querySelectorAll('button[aria-pressed]')].map((b) => {
    const r = b.getBoundingClientRect()
    return Math.min(r.width, r.height)
  })
  const floor = fitFloor(targets.length ? Math.min(...targets) : null)
  const pinned = parseFloat(getComputedStyle(box).bottom) || 0
  const top = stage.getBoundingClientRect().top + window.scrollY
  const room = window.innerHeight - pinned - box.offsetHeight - top - GAP
  const want = natural > 0 ? room / natural : 1
  stage.style.setProperty('--fit', String(Math.max(floor, Math.min(1, want))))
  if (want >= floor) {
    // The root is taller than the window, so the stage runs on under the pinned box: centre in what shows.
    stage.style.setProperty('--under', `${Math.max(0, stage.offsetHeight - room)}px`)
    return
  }
  // Held at its floor: the live controls scroll into view rather than shrink below a hittable size.
  const row = scene.querySelector('button[aria-pressed]')
  const over = row ? row.getBoundingClientRect().bottom - (box.getBoundingClientRect().top - GAP) : 0
  if (over > 0) window.scrollBy({ top: over, behavior: 'smooth' })
}

/** Keeps `--fit` current on the open flow; returns the cleanup. */
export function watchStageFit(): () => void {
  let raf = 0
  const run = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(fit)
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
