/**
 * #1050, rendered end-to-end as far as this harness reaches.
 *
 * `renderToStaticMarkup` never runs effects, so the fetch can't be observed —
 * but `useSearchParams` is read during render, not in an effect, so mounting
 * <Praxes /> under a `MemoryRouter` at `/praxis?task_id=7` DOES exercise the
 * real `usePraxes` param read. That makes this the closest thing to the bug's
 * actual symptom the repo can assert: the page landed on with a task filter used
 * to be indistinguishable from the bare feed.
 *
 * `listPraxes` is mocked so no axios call is attempted (same posture as
 * `pages/__tests__/praxesFeedDispatch.test.tsx`); the feed sits in its loading
 * state, which is enough — the notice is page chrome, above the results.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))
vi.mock('../../../api/praxis', () => ({
  listPraxes: async () => [],
}))

// Imported after the mocks are registered.
import Praxes from '../../Praxes'

const NOTICE = i18n.t('praxis:listPage.taskFilter.notice')
const CLEAR = i18n.t('praxis:listPage.taskFilter.clear')
const INTRO = i18n.t('praxis:listPage.intro')

function text(entry: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[entry]}>
      <Praxes />
    </MemoryRouter>,
  ).replace(/<[^>]*>/g, '')
}

describe.each(['desktop', 'mobile'] as const)('%s praxis feed with ?task_id=', (formFactor) => {
  it('announces that the feed is narrowed to one task', () => {
    mocks.formFactor = formFactor
    const out = text('/praxis?task_id=7')
    expect(out, 'the notice').toContain(NOTICE)
    expect(out, 'a way back to the whole feed').toContain(CLEAR)
  })

  it('says nothing about a task filter on the bare feed', () => {
    mocks.formFactor = formFactor
    const out = text('/praxis')
    expect(out).not.toContain(NOTICE)
    expect(out).not.toContain(CLEAR)
  })

  it('treats a junk task_id as no filter at all', () => {
    mocks.formFactor = formFactor
    expect(text('/praxis?task_id=abc')).not.toContain(NOTICE)
  })
})

describe('desktop intro copy', () => {
  it('drops the "all praxes from across World Zero" claim when filtered', () => {
    mocks.formFactor = 'desktop'
    expect(text('/praxis'), 'unfiltered still says it').toContain(INTRO)
    expect(text('/praxis?task_id=7'), 'a subset must not claim to be all').not.toContain(INTRO)
  })
})
