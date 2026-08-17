/**
 * The mobile home's two CTAs land on a NARROWED view (#1554).
 *
 * A link that quietly lands unfiltered is this repo's most expensive class of
 * frontend bug: the page renders, the request 200s, the list is simply the whole
 * catalogue, and tsc, eslint, the render assertions and CI all pass over it (see
 * `api/__tests__/client.test.ts` for the version of this that shipped, and for
 * the repeated-bare-key rule that now guards it). Asserting
 * `href="/tasks?can_sign_up=1"` in a skin test only proves
 * the string was typed correctly — it says nothing about whether the destination
 * reads that key.
 *
 * So each URL is fed back through the very reader its page uses, and the axis is
 * asserted to come out ON. If `TASK_FILTER_PARAMS.canSignUp` or `VOTED_PARAM`
 * is ever renamed, or `CAN_SIGN_UP_ON` stops being `'1'`, this fails here rather
 * than turning the home screen's buttons into a plain browse in production.
 *
 * `readTaskFilters` takes the viewer's has-a-character answer since #1972, and
 * `true` is the only honest value here: the field desk is the signed-in home,
 * and eligibility is exactly the axis a viewer without a character cannot use.
 */
import { describe, it, expect } from 'vitest'
import { CAST_VOTES_LINK, FIND_TASK_LINK, UPDATES_LINK } from '../homeDestinations'
import { readTaskFilters } from '../../tasks/useTasks'
import { readFeedFilters } from '../../praxes/feedFilterParams'

/** Split a same-origin app link into its path and its parsed query. */
/** The field desk only renders for a signed-in viewer carrying a character. */
const HAS_CHARACTER = true

function parse(link: string): { path: string; params: URLSearchParams } {
  const [path, query = ''] = link.split('?')
  return { path, params: new URLSearchParams(query) }
}

describe('the mobile home CTA destinations', () => {
  it('sends "Find a Task" to the task browse with the eligibility axis on', () => {
    const { path, params } = parse(FIND_TASK_LINK)
    expect(path, 'the task browse').toBe('/tasks')
    expect(readTaskFilters(params, HAS_CHARACTER).canSignUp, 'can-sign-up axis').toBe(
      true,
    )
  })

  it('does not pin a status alongside eligibility', () => {
    // `can_sign_up` makes the SERVER run its own predicate, which is what lets a
    // faction ability bend the level bar (the Ephemerists reach retired tasks).
    // A `status=active` riding along would cancel that silently.
    const { params } = parse(FIND_TASK_LINK)
    const filters = readTaskFilters(params, HAS_CHARACTER)
    expect(filters.status, 'no status narrowing').toBe('All')
    expect(filters.factions, 'no faction narrowing').toEqual([])
  })

  it('sends "Cast Your Votes" to the praxis feed filtered to needs-my-vote', () => {
    const { path, params } = parse(CAST_VOTES_LINK)
    expect(path, 'the praxis feed').toBe('/praxis')
    expect(readFeedFilters(params).voted, 'needs-my-vote axis').toBe('no')
  })

  it('leaves the era scope alone so the feed keeps its landing narrowing', () => {
    const { params } = parse(CAST_VOTES_LINK)
    expect(readFeedFilters(params).eraScope).toBe('this_era')
  })

  it('sends the notifications row to Updates with no filter on it', () => {
    expect(UPDATES_LINK).toBe('/updates')
    expect(UPDATES_LINK).not.toContain('?')
  })
})
