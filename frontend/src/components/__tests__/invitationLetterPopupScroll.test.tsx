/**
 * The invitation prospectus is reachable on a short viewport (#2130).
 *
 * Seam: the RENDERED MARKUP's inline style strings — the same seam
 * `levelUpPopupScroll.test.tsx` uses, because this repo's harness is
 * renderToStaticMarkup with no jsdom. There is no layout, so an overflow
 * cannot be measured; what can be pinned is the rule that makes the overflow
 * scrollable, which this popup carries inline (the whole file is inline-styled,
 * nothing here lives in index.css).
 *
 * The reported defect was the scrim pinning its content: `position: fixed` with
 * no scroller at all and `align-items: center`, so a prospectus taller than the
 * phone overflowed off BOTH ends — the masthead cut off above, ENLIST cut off
 * below, and a scroll container cannot scroll to a negative offset, so neither
 * came back. Two properties, and they only work as a pair:
 *   - the fixed scrim scrolls on the y-axis;
 *   - the card centres with `margin: auto`, NOT `align-items: center`.
 *
 * TWO controls were stranded, the ENLIST button and the confirm button one
 * click past it. This harness fires no click, so the confirm step's own markup
 * is out of reach; what stands in for it is that the popup renders exactly ONE
 * fixed scrim — the confirm step swaps in place inside that same card, so it
 * inherits the scroller rather than getting a second, unscrolled chassis — plus
 * the autoFocus contract, which is what scrolls the newly-mounted confirm
 * button into view when the taller step swaps in.
 *
 * Parametrised over Coven (the reported faction) and one other, because the
 * prospectus is ONE component skinned by faction tokens, not seven chromes:
 * the fix is at the chassis, so it has to hold for a faction nobody reported.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../i18n'
import { AuthContext } from '../../auth/AuthContext'
import InvitationLetterPopup from '../InvitationLetterPopup'
import type { CurrentUser } from '../../api/auth'

/** Only the one field the popup reads; the rest of /auth/me is irrelevant. */
function viewer(factionSlug: string | null): CurrentUser {
  return { character: { faction_slug: factionSlug } } as unknown as CurrentUser
}

function render(slug: string): string {
  return renderToStaticMarkup(
    <AuthContext.Provider
      value={{
        user: viewer('na'),
        loading: false,
        refetch: async () => {},
        applyUser: () => {},
        signOut: async () => {},
      }}
    >
      <InvitationLetterPopup factionSlug={slug} onClose={() => {}} />
    </AuthContext.Provider>,
  )
}

/** Inline `style="..."` bodies, in document order. */
function styleAttrs(html: string): string[] {
  return [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1].replace(/&quot;/g, '"'))
}

describe.each(['coven', 'snide'])('invitation prospectus on a short viewport (%s)', (slug) => {
  it('gives the scrim a y-axis scroller so ENLIST is reachable', () => {
    const scrim = styleAttrs(render(slug)).find((s) => s.includes('position:fixed'))
    expect(scrim).toBeDefined()
    expect(scrim).toContain('overflow-y:auto')
    expect(scrim).not.toMatch(/(^|;)overflow:hidden/)
  })

  it('centres the card with auto margins, not align-items:center', () => {
    const styles = styleAttrs(render(slug))
    const scrim = styles.find((s) => s.includes('position:fixed'))
    expect(scrim).toContain('align-items:flex-start')
    expect(scrim).not.toContain('align-items:center')
    // Some element between the scrim and the card takes the auto margins.
    expect(styles.some((s) => /(^|;)margin:auto/.test(s))).toBe(true)
  })

  it('opens one scrim, so the confirm step scrolls in the same scroller', () => {
    const scrims = styleAttrs(render(slug)).filter((s) => s.includes('position:fixed'))
    expect(scrims).toHaveLength(1)
  })

  it('autofocuses the primary action so the browser scrolls it into view', () => {
    expect(render(slug)).toMatch(/<button[^>]*autofocus/i)
  })
})
