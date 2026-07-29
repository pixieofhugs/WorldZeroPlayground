/**
 * ComposerControls' foot slot (#1195).
 *
 * The "@ to mention" affordance used to live in the shared placeholder, which
 * every one of the eight voices reads. The Unaffiliated design moves it to the
 * foot's left slot, so that slot DEFAULTS rather than sits empty: a voice opts
 * out or overrides, and no voice loses the affordance by not having been
 * redressed yet (#1196–#1202).
 *
 * Rendered to static markup (no DOM) per the comments-test convention; `useAuth`
 * resolves to its anonymous default so the mention hook renders without a
 * provider.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so the neutral copy keys resolve to English text.
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
    // The count used to displace this hint, on the reasoning that `maxLength`
    // was edit-only and the two states were mutually exclusive. Capping the
    // composer makes the count permanent, so displacing would have retired the
    // affordance outright. They share the foot from opposite ends instead.
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

/**
 * The body cap (#1205).
 *
 * 500 is the number every design sheet shows. It was 2000 in the editor, 2000 at
 * the API and ABSENT from the composer, because `maxLength` was a prop each voice
 * had to remember. It defaults now, so the cap cannot be dropped by omission.
 */
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

  /**
   * The legacy case: nothing capped a comment below 2000, so a stored body can
   * exceed 500. `maxLength` blocks fresh typing but does not truncate a seeded
   * value, so it loads intact and the author deletes their way under the cap.
   * Blocking the save is what keeps the API from answering with a 422.
   */
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
