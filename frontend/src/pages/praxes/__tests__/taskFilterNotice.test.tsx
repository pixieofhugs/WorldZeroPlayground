/**
 * #1050: a `?task_id=` feed announces itself. `useSearchParams` is read during
 * render, so this exercises the real `usePraxes` param read; the feed stays in
 * its loading state, which is enough for page chrome.
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

import Praxes from '../../Praxes'

const NOTICE = i18n.t('praxis:listPage.taskFilter.notice')
const CLEAR = i18n.t('praxis:listPage.taskFilter.clear')
// Deleted intro (#2262), as a literal (deleted key) and in full: the notice
// also opens "Proof of action".
const INTRO = 'Proof of action. All praxis from across World Zero.'

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

describe.each(['desktop', 'mobile'] as const)('%s intro copy (#2262)', (formFactor) => {
  it('is gone — the title says "Praxis" and the body is the praxis', () => {
    mocks.formFactor = formFactor
    expect(text('/praxis'), 'the bare feed').not.toContain(INTRO)
    expect(text('/praxis?task_id=7'), 'the filtered feed').not.toContain(INTRO)
  })
})
