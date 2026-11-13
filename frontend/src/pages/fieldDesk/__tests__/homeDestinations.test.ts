/**
 * The mobile home's two CTAs land on a narrowed view (#1554). Each URL is fed
 * through the reader its destination page uses, since an unfiltered list
 * passes every other check.
 */
import { describe, it, expect } from 'vitest'
import { CAST_VOTES_LINK, FIND_TASK_LINK, UPDATES_LINK } from '../homeDestinations'
import { readTaskFilters, type EligibilityDefault } from '../../tasks/useTasks'
import { readFeedFilters } from '../../praxes/feedFilterParams'

/** Past level 0, the board opens whole, so the axis being on is the link's doing. */
const LEVELLED_PLAYER: EligibilityDefault = 'off'

function parse(link: string): { path: string; params: URLSearchParams } {
  const [path, query = ''] = link.split('?')
  return { path, params: new URLSearchParams(query) }
}

describe('the mobile home CTA destinations', () => {
  it('sends "Find a Task" to the task browse with the eligibility axis on', () => {
    const { path, params } = parse(FIND_TASK_LINK)
    expect(path, 'the task browse').toBe('/tasks')
    expect(readTaskFilters(params, LEVELLED_PLAYER).canSignUp, 'can-sign-up axis').toBe(
      true,
    )
  })

  it('does not pin a status alongside eligibility', () => {
    // A `status=active` would silently cancel faction abilities (see link doc).
    const { params } = parse(FIND_TASK_LINK)
    const filters = readTaskFilters(params, LEVELLED_PLAYER)
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
