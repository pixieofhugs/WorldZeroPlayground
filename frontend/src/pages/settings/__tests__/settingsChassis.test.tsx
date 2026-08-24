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

import '../../../i18n'
import Settings, { SETTINGS_SECTIONS, sectionAnchor } from '../../Settings'
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
    expect(body).toContain('Dark mode')
    expect(body).toContain('Use the dark palette across every page.')
    expect(body).toContain('Animations')
    expect(body).toContain('Turn this off to keep the interface still.')
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
