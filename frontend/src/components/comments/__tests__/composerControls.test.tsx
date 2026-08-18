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
 * The save gate itself (#1524).
 *
 * `OwnerControls` used to export an `editSaveDisabled(draft, saving)` helper that
 * only its own unit test called, while every composer and every editor actually
 * gates here. These assertions moved onto the rule production runs.
 */
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

/**
 * #2238 — THE COUNT IS ONE TOKEN AND THE ROW HAS TO SAY SO.
 *
 * The foot is three things across one line — the hint, the count, the submit —
 * and on a narrow leaf they do not fit. What gave way was the count, which
 * broke as `100/5` over `00`: a figure severed mid-number, which is the one
 * thing in that row that means nothing in halves. The Ephemerists sheet reports
 * it because its note body sets `overflow-wrap: anywhere` (a long unbroken
 * word must not blow the leaf open) and the composer INHERITS it, so the count
 * gained break opportunities between its own digits.
 *
 * Two declarations answer it, and both are needed. `white-space: nowrap` beats
 * an inherited `overflow-wrap` outright, so the count can never be severed
 * wherever a voice mounts it; and the row WRAPS, so the width the count stops
 * yielding is taken from the line rather than from the hint's last word.
 *
 * The seam is the row's own declarations: this harness has no layout, so a
 * break is not observable — what is decidable is whether the row can produce
 * one.
 */
describe('ComposerControls — the foot row (#2238)', () => {
  const foot = (html: string) => html.slice(html.indexOf('</textarea>'))

  it('sets the count as one unbreakable token', () => {
    const html = composer({ value: 'x'.repeat(100) })
    const at = html.indexOf('100/500')
    const count = html.slice(html.lastIndexOf('<span', at), at)
    expect(count).toContain('white-space:nowrap')
    // It also stops yielding width: the hint beside it wraps and the count
    // cannot, so a shrinking count would only be squeezed to overflow.
    expect(count).toContain('flex-shrink:0')
  })

  it('lets the row wrap rather than crushing what is on it', () => {
    expect(foot(composer())).toContain('flex-wrap:wrap')
  })
})
