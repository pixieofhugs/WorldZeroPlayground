/** ComposerControls' foot slot (#1195): the "@ to mention" hint defaults, voices may override. */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { ComposerControls } from '../shared'
import { MAX_COMMENT_BODY } from '../OwnerControls'

function composer(extra: Partial<Parameters<typeof ComposerControls>[0]> = {}): string {
  return renderToStaticMarkup(
    <ComposerControls
      value=""
      onChange={() => {}}
      onSubmit={() => {}}
      submitting={false}
      accent="var(--color-accent-primary)"
      onAccent="var(--faction-default-on-accent)"
      {...extra}
    />,
  )
}

describe('ComposerControls — the mention hint', () => {
  it('defaults the hint, so a voice that passes nothing still states the affordance', () => {
    expect(composer()).toContain('@ to mention')
  })

  it('lets a voice override it with its own dressed caption', () => {
    const html = composer({ hint: <span>speak thy handle</span> })
    expect(html).toContain('speak thy handle')
    expect(html).not.toContain('@ to mention')
  })

  it('keeps the slot even though the count is now always lit (#1205)', () => {
    const html = composer()
    expect(html).toContain(`0/${MAX_COMMENT_BODY}`)
    expect(html).toContain('@ to mention')
  })

  it('no longer repeats the affordance in the placeholder', () => {
    const html = composer()
    expect(html).toContain('Say something worth keeping')
    expect(html.match(/to mention/g)).toHaveLength(1)
  })
})

/** The save gate (#1524): every composer and editor gates here. */
describe('ComposerControls — the save gate', () => {
  it('is inert on an empty or whitespace-only body', () => {
    expect(composer({ value: '' })).toContain('disabled=""')
    expect(composer({ value: '   ' })).toContain('disabled=""')
  })

  it('is inert while a save is inflight, even on a good body', () => {
    expect(composer({ value: 'seedlings', submitting: true })).toContain('disabled=""')
  })

  it('is live on a non-empty body at rest', () => {
    expect(composer({ value: 'seedlings' })).not.toContain('disabled=""')
  })
})

/** The body cap (#1205): 500, per the design sheets; defaults so no voice can omit it. */
describe('ComposerControls — the body cap', () => {
  it('caps at 500 without being asked, so no voice composes uncapped', () => {
    expect(MAX_COMMENT_BODY).toBe(500)
    const html = composer()
    expect(html).toContain('maxLength="500"')
    expect(html).toContain('0/500')
  })

  it('still honours an explicit override', () => {
    expect(composer({ maxLength: 120 })).toContain('0/120')
  })

  it('counts what is typed', () => {
    expect(composer({ value: 'x'.repeat(140) })).toContain('140/500')
  })

  // Legacy bodies may exceed 500; `maxLength` doesn't truncate a seeded value.
  it('blocks the save on an over-length legacy body rather than letting it 422', () => {
    const html = composer({ value: 'x'.repeat(1500) })
    expect(html).toContain('1500/500')
    expect(html).toContain('var(--color-danger)')
    expect(html).toContain('disabled=""')
  })

  it('releases the save once the body is trimmed under the cap', () => {
    const html = composer({ value: 'x'.repeat(499) })
    expect(html).toContain('499/500')
    expect(html).not.toContain('var(--color-danger)')
    expect(html).not.toContain('disabled=""')
  })
})

/**
 * #2238: the count must never break mid-number (a voice may set an inherited
 * `overflow-wrap: anywhere`). `nowrap` on the count plus a wrapping row fixes it;
 * no layout here, so we assert the declarations.
 */
describe('ComposerControls — the foot row (#2238)', () => {
  const foot = (html: string) => html.slice(html.indexOf('</textarea>'))

  it('sets the count as one unbreakable token', () => {
    const html = composer({ value: 'x'.repeat(100) })
    const at = html.indexOf('100/500')
    const count = html.slice(html.lastIndexOf('<span', at), at)
    expect(count).toContain('white-space:nowrap')
    expect(count).toContain('flex-shrink:0')
  })

  it('lets the row wrap rather than crushing what is on it', () => {
    expect(foot(composer())).toContain('flex-wrap:wrap')
  })
})
