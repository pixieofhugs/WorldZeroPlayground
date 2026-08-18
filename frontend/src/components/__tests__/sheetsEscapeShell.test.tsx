/**
 * Bottom sheets escape the shell's stacking context (#1591).
 *
 * WHAT THIS CAN AND CANNOT PROVE
 * ------------------------------
 * The defect is an INTERACTION: the mobile tab bar stayed tappable behind an
 * open sheet's scrim, because `ShellContent`'s `position: relative` +
 * `z-index: 5` opens a stacking context that caps every descendant below the
 * chrome at 10. Tapping a bar through a scrim needs a real browser with real
 * hit-testing, and this harness is `renderToStaticMarkup` in node — no DOM, no
 * pointer, no effects. **The interaction itself is not exercised here and
 * cannot be**; it is on the eyeball list in the PR.
 *
 * What IS mechanically checkable is the thing the fix turns on: whether each
 * sheet hands its overlay to `createPortal(…, document.body)`. Two facts make
 * that assertable without a DOM:
 *
 *   1. `drawAtRoot` is a plain function, so it can be called directly — with
 *      no `document` (the harness) and with an element-like stub (the browser).
 *   2. `react-dom/server` REFUSES to render a portal. So "this component
 *      portals when a document exists" reads as `renderToStaticMarkup` raising
 *      the server renderer's own portal error, and "this path does not portal"
 *      reads as the same render returning markup. The throw is the proof, not
 *      an accident.
 *
 * The mirror case matters as much: with no `document` the guard keeps the tree
 * inline, which is what stops this change from silently blanking every other
 * suite's markup assertions.
 */
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'

// factionName and the sheet copy read the raw i18n instance, not a provider.
import '../../i18n'

const formFactorMock = vi.fn(() => 'desktop')
vi.mock('../../hooks/useFormFactor', () => ({
  useFormFactor: () => formFactorMock(),
}))

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ applyUser: () => {} }),
}))

// Fetched in an effect the static renderer never runs; mocked so the module
// graph does not drag the API transport in behind it.
vi.mock('../../api/me', () => ({
  getMyCharacters: async () => [],
  setActiveCharacter: async () => ({}),
}))

import CharacterSwitcherSheet from '../CharacterSwitcherSheet'
import { OptionOverlay } from '../ui/FilterBar/OptionPicker'
import { drawAtRoot } from '../ui/drawAtRoot'
import type { FilterFacet } from '../ui/FilterBar/filterState'

const REACT_PORTAL = Symbol.for('react.portal')

/**
 * A portal's runtime fields. `@types/react`'s `ReactPortal` describes what you
 * may PASS to React, not the tagged object `createPortal` hands back, so the
 * two fields that identify a portal are not on it.
 */
interface PortalShape {
  $$typeof: symbol
  containerInfo: unknown
}

/**
 * The smallest thing React accepts as a portal container: `isValidContainer`
 * reads `nodeType`, nothing more. A real Element would need jsdom, which this
 * harness deliberately does not have.
 */
const FAKE_BODY = { nodeType: 1 } as unknown as HTMLElement

function withDocument<T>(run: () => T): T {
  vi.stubGlobal('document', { body: FAKE_BODY })
  try {
    return run()
  } finally {
    vi.unstubAllGlobals()
  }
}

const FACET: FilterFacet = {
  key: 'type',
  label: 'Type',
  options: [
    { value: 'nudge', label: 'Nudge' },
    { value: 'notice', label: 'Notice' },
  ],
  selected: ['nudge'],
  onChange: () => {},
}

function switcher(formFactor: 'mobile' | 'desktop'): string {
  formFactorMock.mockReturnValue(formFactor)
  return renderToStaticMarkup(
    <MemoryRouter>
      <CharacterSwitcherSheet open activeCharacterId={1} onClose={() => {}} />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  formFactorMock.mockReturnValue('desktop')
})

describe('drawAtRoot', () => {
  it('hands the overlay back untouched when there is no document', () => {
    const overlay = <div data-test="overlay" />
    expect(drawAtRoot(overlay)).toBe(overlay)
    expect(renderToStaticMarkup(drawAtRoot(overlay) as ReactElement)).toContain('data-test="overlay"')
  })

  it('portals the overlay to document.body when there is one', () => {
    const portal = withDocument(() => drawAtRoot(<div />)) as unknown as PortalShape
    expect(portal.$$typeof).toBe(REACT_PORTAL)
    expect(portal.containerInfo).toBe(FAKE_BODY)
  })
})

describe('CharacterSwitcherSheet', () => {
  it('portals — the shell can no longer cap it under the tab bar', () => {
    expect(() => withDocument(() => switcher('mobile'))).toThrow(/[Pp]ortal/)
  })

  it('still renders its markup inline in the DOM-less harness', () => {
    const html = switcher('mobile')
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    // The roster arrives in an effect the static renderer never runs, so the
    // rows are `CharacterSwitcherRows`' business (characterPaths.test.tsx);
    // what is here is the sheet's own chrome. Its one action is gated on
    // `can_create_additional_character`, which this file's auth stub does not
    // carry — the gate itself is `characterSwitcherActions.test.tsx`'s subject.
    expect(html).toContain('Your characters')
  })

  it('clears the tab bar on the phone and nothing on the desktop rail', () => {
    // Both sheets read the one token that says how tall the bar is, so they
    // agree about where the bottom of the screen is. The desktop rail opens
    // the same sheet with no bar under it (#1591).
    expect(switcher('mobile')).toContain('padding-bottom:calc(var(--space-xl) + var(--tab-bar-clearance))')
    const desktop = switcher('desktop')
    expect(desktop).toContain('padding-bottom:var(--space-xl)')
    expect(desktop).not.toContain('--tab-bar-clearance')
  })

  it('takes its scrim and shadow from a token, never a raw rgba', () => {
    const html = switcher('mobile')
    expect(html).toContain('var(--color-overlay-strong)')
    expect(html).not.toMatch(/rgba\(/)
  })
})

describe('OptionOverlay', () => {
  it('portals the phone sheet', () => {
    expect(() =>
      withDocument(() =>
        renderToStaticMarkup(<OptionOverlay facet={FACET} isSheet onDone={() => {}} />),
      ),
    ).toThrow(/[Pp]ortal/)
  })

  it('leaves the desktop popover exactly where its anchor is', () => {
    // Not merely "no portal needed": the popover is positioned against the
    // trigger, so moving it to document.body would tear it off its anchor.
    const html = withDocument(() =>
      renderToStaticMarkup(<OptionOverlay facet={FACET} isSheet={false} onDone={() => {}} />),
    )
    expect(html).toContain('filter-factions__popover')
    expect(html).not.toContain('filter-factions__scrim')
  })

  it('still renders the sheet and its scrim inline in the DOM-less harness', () => {
    const html = renderToStaticMarkup(<OptionOverlay facet={FACET} isSheet onDone={() => {}} />)
    expect(html).toContain('filter-factions__scrim')
    expect(html).toContain('filter-factions__sheet')
    expect(html).toContain('aria-checked="true"')
  })
})
