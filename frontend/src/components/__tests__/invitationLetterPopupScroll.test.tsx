/**
 * The invitation prospectus is reachable on a short viewport (#2130). Checked
 * on inline styles (no layout here). The pair that works: the fixed scrim
 * scrolls on y, and the card centres with `margin: auto`, not
 * `align-items: center` (which overflows both ends unreachably). The confirm
 * step swaps inside the one scrim and relies on autoFocus to scroll into view.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
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

/**
 * The confirm step lives in `JoinConfirm` (#2656): the popup must pass it
 * `autoFocus` (read from source; no click here), and `joinControlOrder.test.tsx`
 * checks it lands on the affirmative.
 */
describe('the confirm step keeps the autofocus that scrolls it into view', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../InvitationLetterPopup.tsx', import.meta.url)),
    'utf8',
  )

  it('hands the shared confirm step an autoFocus', () => {
    const at = source.indexOf('<JoinConfirm')
    expect(at, 'the popup mounts JoinConfirm').toBeGreaterThan(-1)
    const mount = source.slice(at, source.indexOf('/>', at))
    expect(mount, 'and asks it to take focus').toContain('autoFocus')
  })
})
