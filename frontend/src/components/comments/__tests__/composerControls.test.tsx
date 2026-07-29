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

  it('yields the slot to the live character count while editing', () => {
    const html = composer({ maxLength: MAX_COMMENT_BODY })
    expect(html).toContain(`0/${MAX_COMMENT_BODY}`)
    expect(html).not.toContain('@ to mention')
  })

  it('no longer repeats the affordance in the placeholder', () => {
    const html = composer()
    expect(html).toContain('Say something worth keeping')
    expect(html.match(/to mention/g)).toHaveLength(1)
  })
})
