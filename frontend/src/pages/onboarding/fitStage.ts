// A beat's stage is drawn at one natural size; the sticky text box pins to the viewport bottom
// and covers whatever is taller than the room above it. This sets `--fit` (<= 1) on the stage,
// which flow.css turns into `zoom` on the beat, so a short window shrinks the scene, never hides it.

const GAP = 12
const FLOOR = 0.3

function fit() {
  const stage = document.querySelector<HTMLElement>('.ob-stage')
  const box = document.querySelector<HTMLElement>('.ob-box')
  const scene = stage?.firstElementChild as HTMLElement | null
  if (!stage || !box || !scene) return
  stage.style.setProperty('--fit', '1')
  stage.style.setProperty('--under', '0px')
  const cs = getComputedStyle(scene)
  const natural = scene.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom)
  const pinned = parseFloat(getComputedStyle(box).bottom) || 0
  const top = stage.getBoundingClientRect().top + window.scrollY
  const room = window.innerHeight - pinned - box.offsetHeight - top - GAP
  stage.style.setProperty('--fit', String(natural > 0 ? Math.max(FLOOR, Math.min(1, room / natural)) : 1))
  // The root is taller than the window, so the stage runs on under the pinned box: centre in what shows.
  stage.style.setProperty('--under', `${Math.max(0, stage.offsetHeight - room)}px`)
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
  const ro = new ResizeObserver(run)
  const mo = new MutationObserver(() => {
    ro.disconnect()
    const box = document.querySelector('.ob-box')
    if (box) ro.observe(box)
    run()
  })
  if (root) mo.observe(root, { childList: true, subtree: true })
  window.addEventListener('resize', run)
  run()
  return () => {
    cancelAnimationFrame(raf)
    mo.disconnect()
    ro.disconnect()
    window.removeEventListener('resize', run)
  }
}
