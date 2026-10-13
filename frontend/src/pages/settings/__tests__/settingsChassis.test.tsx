/**
 * #2154 — the Settings chassis and the Appearance section.
 *
 * THE SEAM IS THE RENDERED PAGE, in the repo's DOM-less node env
 * (`renderToStaticMarkup`) — the same posture the file this replaces
 * (`defaultSettings.test.tsx`) used, and for the same reason: there is no jsdom
 * here, so what can be asserted is what the tree SAYS, plus the pure seams
 * behind it. `useMotion`'s own decisions are tested next door in
 * `hooks/__tests__/useMotion.test.tsx`; this file is about what a reader meets.
 *
 * `useFormFactor` is MOCKED rather than driven off `matchMedia` — the static
 * renderer resolves it to its 'desktop' default and the phone branch would
 * otherwise be unreachable. Light vs dark is a pure `[data-theme]` cascade with
 * no branch here, so it is not a case.
 *
 * WHAT THE DROP-IN CONTRACT ASSERTIONS ARE FOR
 * --------------------------------------------
 * Five sibling issues each add one entry to `SETTINGS_SECTIONS` and one file.
 * The failure that costs a batch is a rail item pointing at an anchor no
 * section renders — nothing throws, nothing looks wrong, the nav click just
 * does nothing. So the invariant asserted below is that the rail and the pane
 * are derived from ONE list, and that every key in it reaches an `id` in the
 * markup.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, afterEach, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  formFactor: 'desktop' as 'mobile' | 'desktop',
  user: null as unknown,
}))

vi.mock('../../../hooks/useFormFactor', () => ({
  MOBILE_QUERY: '(max-width: 767px)',
  formFactorFor: (matches: boolean) => (matches ? 'mobile' : 'desktop'),
  useFormFactor: () => harness.formFactor,
}))

// Partial, not wholesale: `CookiesSection` imports the real `SESSION_HINT_KEY`
// out of this module to disclose it (#2156), and a bare factory would blank
// every other export the tree reaches for.
vi.mock('../../../auth/AuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../auth/AuthContext')>()),
  useAuth: () => ({ user: harness.user }),
}))

import i18n from '../../../i18n'
import Settings, { SETTINGS_SECTIONS, currentSectionKey, sectionAnchor } from '../../Settings'
import { MotionProvider } from '../../../hooks/useMotion'
import { ThemeProvider } from '../../../hooks/useTheme'

/** Pretend the OS has (or has not) asked for reduced motion. */
function withSystemReduced<T>(matches: boolean, body: () => T): T {
  const holder = globalThis as { window?: unknown }
  const previous = holder.window
  holder.window = {
    matchMedia: () => ({ matches, addEventListener: () => {}, removeEventListener: () => {} }),
  }
  try {
    return body()
  } finally {
    if (previous === undefined) delete holder.window
    else holder.window = previous
  }
}

function render({ systemReduced = false } = {}): string {
  return withSystemReduced(systemReduced, () =>
    renderToStaticMarkup(
      <MemoryRouter>
        <ThemeProvider>
          <MotionProvider>
            <Settings />
          </MotionProvider>
        </ThemeProvider>
      </MemoryRouter>,
    ),
  )
}

const text = (html: string) => html.replace(/<[^>]*>/g, '')
const button = (html: string, testId: string) =>
  new RegExp(`<button[^>]*data-testid="${testId}"[^>]*>`).exec(html)?.[0] ?? ''

afterEach(() => {
  harness.formFactor = 'desktop'
  harness.user = null
})

describe('the chassis renders the page, not a redirect (#520 reversed)', () => {
  it('draws the Settings heading and its lead', () => {
    const body = text(render())
    expect(body).toContain('Settings')
    expect(body, 'the page says nothing saves later').toContain(
      'Changes save the moment you make them.',
    )
  })

  it('names the viewer in the eyebrow when a character is carried', () => {
    harness.user = { character: { faction_slug: 'na', username: 'wz_pilgrim', id: 7 } }
    expect(text(render())).toContain('wz_pilgrim')
  })

  it('omits the eyebrow entirely for an account playing nobody', () => {
    expect(render()).not.toContain('label-heading')
  })
})

describe("the title's rule is as wide as the title (#3097)", () => {
  // SEAM: the rendered markup — no layout here, so this pins the declarations
  // that make the edges align: the rule is the <h1>'s next sibling inside a box
  // that shrinks to the <h1>, and it names no width of its own. The phone draws
  // the same rule, so it follows.
  it.each(['desktop', 'mobile'] as const)('shares a shrink-to-fit box with the heading on %s', (formFactor) => {
    harness.formFactor = formFactor
    const [, box, rule] =
      /<div style="([^"]*)"><h1\b[^>]*>Settings<\/h1><div\b([^>]*)><\/div><\/div>/.exec(render()) ?? []
    expect(box, "the rule is not the heading's next sibling in a box").toBeDefined()
    expect(box).toContain('width:fit-content')
    // Same cap as the Field Desk's box, where an unbroken name needs it.
    expect(box).toContain('max-width:100%')
    expect(rule).toContain('var(--faction-default-rainbow)')
    expect(rule).toContain('height:3px')
    expect(rule, 'a fixed width cannot follow the text').not.toMatch(/[";]width:/)
  })
})

describe('the drop-in contract five siblings depend on', () => {
  it('has a section list to derive from (an empty sweep must not pass)', () => {
    expect(SETTINGS_SECTIONS.length).toBeGreaterThan(0)
  })

  it('renders one anchor per registered section, spelled the shell way', () => {
    const html = render()
    for (const { key } of SETTINGS_SECTIONS) {
      expect(html, `anchor for ${key}`).toContain(`id="${sectionAnchor(key)}"`)
    }
  })

  it('derives the rail from that same list, so no item points at nothing', () => {
    const html = render()
    const railed = [...html.matchAll(/aria-current="true"/g)]
    expect(railed.length, 'exactly one item is current at rest').toBe(1)
    expect(
      SETTINGS_SECTIONS.every(({ key }) => html.includes(`id="${sectionAnchor(key)}"`)),
    ).toBe(true)
  })

  it('clears the sticky NavBar when a rail item scrolls to a section', () => {
    expect(render(), 'no scroll-margin means a heading under the bar').toContain(
      'scroll-margin-top',
    )
  })
})

describe('the rail is desktop chrome — hidden on a phone, not disabled', () => {
  it('renders the rail on desktop', () => {
    harness.formFactor = 'desktop'
    expect(render()).toContain('aria-current')
  })

  it('renders no rail at all on a phone', () => {
    harness.formFactor = 'mobile'
    const html = render()
    expect(html, 'no jump list on one scrolling column').not.toContain('aria-current')
    expect(html, 'the sections themselves are still there').toContain(
      `id="${sectionAnchor(SETTINGS_SECTIONS[0].key)}"`,
    )
  })
})

describe('Appearance — two device-local switches', () => {
  it('renders both rows with their help copy', () => {
    const body = text(render())
    expect(body).toContain(i18n.t('settings.appearance.darkMode'))
    expect(body).toContain(i18n.t('settings.appearance.darkModeHelp'))
    expect(body).toContain(i18n.t('settings.appearance.animations'))
    expect(body).toContain(i18n.t('settings.appearance.animationsHelp'))
  })

  it('exposes each control as a switch reflecting its live value', () => {
    const html = render()
    expect(button(html, 'settings-theme-toggle')).toContain('role="switch"')
    expect(button(html, 'settings-animations-toggle')).toContain('role="switch"')
  })

  it('shows animations ON and movable when the OS has no preference', () => {
    const animations = button(render({ systemReduced: false }), 'settings-animations-toggle')
    expect(animations).toContain('aria-checked="true"')
    expect(animations, 'movable').not.toContain('aria-disabled')
  })
})

/**
 * The false-affordance guard (#1263 class). A switch reading "on" while the
 * page is already still is a control that does nothing — and the disabled state
 * this asserts is DELIBERATE, not a bug to be "fixed" by re-enabling it.
 */
describe('Appearance — the OS reduced-motion veto', () => {
  const animations = () => button(render({ systemReduced: true }), 'settings-animations-toggle')

  it('renders the switch off', () => {
    expect(animations()).toContain('aria-checked="false"')
  })

  it('renders it unmovable, but still reachable by keyboard', () => {
    const control = animations()
    expect(control).toContain('aria-disabled="true"')
    expect(control, 'a `disabled` button leaves the tab order').not.toMatch(/\sdisabled(=|\s|>)/)
  })

  it('says why in the accessible name, not only on screen', () => {
    expect(animations()).toContain('your device is set to reduce motion')
  })

  it('says why on screen too, and points the control at it', () => {
    const html = render({ systemReduced: true })
    expect(text(html)).toContain('Your device is set to reduce motion.')
    expect(animations()).toContain('aria-describedby="settings-animations-system"')
    expect(html).toContain('id="settings-animations-system"')
  })

  it('leaves dark mode alone — the veto is about motion only', () => {
    const dark = button(render({ systemReduced: true }), 'settings-theme-toggle')
    expect(dark).not.toContain('aria-disabled')
  })
})

/**
 * #3096 — the rail follows the scroll.
 *
 * SEAM: `currentSectionKey`, the pure decision. There is no DOM and no layout
 * here, so the scroll listener that feeds it measurements is NOT under test;
 * what is under test is every answer it can be given. The fixture's sections
 * are 400px tall under a 200px header, read against a line 64px down.
 */
describe('the rail marks the section at the top of the pane (#3096)', () => {
  const keys = SETTINGS_SECTIONS.map((s) => s.key)
  const LINE = 64
  const PAGE_TOP = 200
  const TALL = 400
  const VIEWPORT = 1000
  const pageHeight = PAGE_TOP + TALL * keys.length
  const bottom = pageHeight - VIEWPORT
  /** Where the line starts to travel: its own journey short of the bottom. */
  const endZone = bottom - (VIEWPORT - LINE)
  const at = (scrollY: number, viewportHeight = VIEWPORT, heldKey: string | null = null) =>
    currentSectionKey({
      sections: keys.map((key, i) => ({ key, top: PAGE_TOP + TALL * i - scrollY })),
      line: LINE,
      scrollY,
      viewportHeight,
      pageHeight,
      heldKey,
    })
  /** Every answer from the top of the page to the bottom, a pixel at a time,
   *  with consecutive repeats folded. */
  const journey = (viewportHeight: number) => {
    const seen: string[] = []
    for (let y = 0; y <= pageHeight - viewportHeight; y += 1) {
      const key = at(y, viewportHeight)
      if (seen.at(-1) !== key) seen.push(key)
    }
    return seen
  }

  it('starts on the first section, before any card has reached the line', () => {
    expect(at(0)).toBe(keys[0])
  })

  it('moves to each section as its top reaches the line', () => {
    let moved = 0
    keys.forEach((key, i) => {
      const landed = PAGE_TOP + TALL * i - LINE
      if (landed > endZone) return // the travelling line owns the rest
      expect(at(landed), `${key} at the line`).toBe(key)
      if (i > 0) expect(at(landed - 2), `${key} not there yet`).toBe(keys[i - 1])
      moved += 1
    })
    expect(moved, 'the fixture must scroll through more than one section before the end zone').toBeGreaterThan(1)
  })

  it('forgives a sub-pixel landing, so a jump never reads as the section before', () => {
    expect(at(PAGE_TOP + TALL - LINE - 0.5)).toBe(keys[1])
  })

  // The defect this replaced: a section that runs out of page before it reaches
  // the line was never marked by scrolling, and the mark leapt to the last one.
  it.each([
    ['a typical window, where the last sections cannot reach the line', VIEWPORT],
    ['a window only a little shorter than the page', pageHeight - 50],
  ])('gives every section its turn, in order, on %s', (_name, viewportHeight) => {
    expect(
      PAGE_TOP + TALL * (keys.length - 2) - (pageHeight - viewportHeight),
      'the fixture must strand at least two sections below the line',
    ).toBeGreaterThan(LINE)
    expect(journey(viewportHeight)).toEqual(keys)
  })

  it('marks the last section at the bottom, though it never reaches the line', () => {
    expect(at(bottom)).toBe(keys.at(-1))
  })

  it('does not flip back several sections on a nudge up from the bottom', () => {
    expect(keys.slice(-2)).toContain(at(bottom - 5))
  })

  it('stays on the first section of a page that cannot scroll', () => {
    expect(at(0, pageHeight)).toBe(keys[0])
    expect(at(0, pageHeight + 100)).toBe(keys[0])
  })

  it('answers with the held key, whatever is at the line', () => {
    const held = keys.at(-2) ?? ''
    expect(at(bottom, VIEWPORT, held)).toBe(held)
    expect(at(bottom, VIEWPORT, null)).not.toBe(held)
  })
})
