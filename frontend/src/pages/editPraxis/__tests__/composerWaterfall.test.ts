/**
 * #1379 — waterfall guard for the composer.
 *
 * The seam is the SHAPE OF THE LOAD: which requests wait on which. The composer
 * is the page every task signup lands on, and its chain ran
 * `getPraxis → getTask → the faction archetype's chunk` with `listMetatasks`
 * hanging off the first link for no reason. Three of those edges were false.
 *
 * WHAT THIS CANNOT DO. There is no jsdom in this repo — vitest runs in `node`
 * and every render goes through `renderToStaticMarkup`, so effects never run
 * and nothing here can observe "three requests instead of six". Two of the
 * three fixes are removals of a WAIT, not of a call, and a wait is invisible to
 * a test that cannot run the effect that does the waiting.
 *
 * So this reads the source, the posture `searchQueryParamAdoption.test.ts` set
 * for exactly this reason. It proves the false edges are not spelled in the
 * file; it does not prove the page is fast. The number belongs in the PR, off
 * `scripts/measure-load.mjs`. What it is worth is that all three regressions
 * are silent ones: re-nesting `listMetatasks` inside the praxis `.then()`, or
 * dropping the handoff for a plain `getPraxis`, would type-check, pass every
 * other test, and quietly restore the round trips.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))

function read(relativePath: string): string {
  return readFileSync(path.join(HERE, relativePath), 'utf8')
}

const hookSource = read('../useEditPraxis.ts')
const dispatcherSource = read('../../EditPraxis.tsx')

/**
 * The body of the initial-load effect, from its banner to its dependency list.
 * Sliced rather than searched whole-file, because "the file mentions
 * `listMetatasks`" is true either way — the question is whether the call sits
 * INSIDE this effect, waiting on a payload it reads nothing from.
 */
const loadEffect = hookSource.slice(
  hookSource.indexOf('// ---- Initial load ----'),
  hookSource.indexOf('}, [idParam,'),
)

describe('the composer does not re-read the praxis a signup just created', () => {
  it('slices the load effect it means to inspect', () => {
    // Guard the guard: if the banner or the dep list is renamed, this slice
    // would silently become empty and every assertion below would pass on air.
    expect(loadEffect).toContain('getPraxis')
    expect(loadEffect.length).toBeGreaterThan(200)
  })

  it('takes the carried row before deciding to fetch', () => {
    expect(loadEffect).toContain('takeJustCreatedPraxis(praxisId)')
  })

  it('still falls back to the read when nothing was carried', () => {
    // The handoff is an optimisation, never a requirement: a bookmark, a
    // reload, a co-author's link and a Back all arrive with an empty slot.
    expect(loadEffect).toMatch(/carried[\s\S]*getPraxis\(praxisId\)/)
  })
})

describe('the seal list does not wait on the praxis', () => {
  it('is not fetched inside the initial-load effect', () => {
    expect(loadEffect).not.toContain('listMetatasks')
  })

  it('is fetched from its own viewer-keyed effect', () => {
    expect(hookSource).toMatch(
      /listMetatasks\(\)[\s\S]{0,400}?\}, \[user\?\.character\?\.id\]\)/,
    )
  })
})

describe('the faction archetype chunk does not wait on getTask', () => {
  /** Everything the dispatcher does while `state.loading` is still true. */
  const loadingBranch = dispatcherSource.slice(
    dispatcherSource.indexOf('if (state.loading) {'),
    dispatcherSource.indexOf('if (!state.praxis) {'),
  )

  it('slices the loading branch it means to inspect', () => {
    expect(loadingBranch).toContain('editPraxis.loadingPageTitle')
  })

  it('warms the chunk from the praxis, which lands a round trip earlier', () => {
    expect(loadingBranch).toContain('preloadArchetype')
    // `task_faction_slug` IS `Task.primary_faction_slug` — one builder,
    // server-side — so the warm and the dispatch below can never disagree.
    expect(loadingBranch).toContain('task_faction_slug')
  })

  it('still dispatches on the task, so the warm cannot change what renders', () => {
    expect(dispatcherSource).toContain(
      'const slug = state.task?.primary_faction_slug ?? null;',
    )
  })
})
