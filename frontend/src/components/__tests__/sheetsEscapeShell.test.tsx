/**
 * Bottom sheets escape `ShellContent`'s stacking context (#1591). The tap-through
 * itself needs a browser; this checks each sheet portals to `document.body`.
 * `react-dom/server` refuses portals, so the throw is the proof. With no
 * `document` the tree stays inline, keeping other suites' markup intact.
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

// Keeps the API transport out of the module graph.
vi.mock('../../api/me', () => ({
  getMyCharacters: async () => [],
  setActiveCharacter: async () => ({}),
}))

import CharacterSwitcherSheet from '../CharacterSwitcherSheet'
import { OptionOverlay } from '../ui/FilterBar/OptionPicker'
import { drawAtRoot } from '../ui/drawAtRoot'
import type { FilterFacet } from '../ui/FilterBar/filterState'

const REACT_PORTAL = Symbol.for('react.portal')

/** A portal's runtime fields, which `@types/react`'s `ReactPortal` lacks. */
interface PortalShape {
  $$typeof: symbol
  containerInfo: unknown
}

/** `isValidContainer` reads only `nodeType`. */
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
    // Rows load in an effect (see characterPaths.test.tsx); this is the chrome.
    expect(html).toContain('Your characters')
  })

  it('clears the tab bar on the phone and nothing on the desktop rail', () => {
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
    // Positioned against its trigger, so a portal would tear it off.
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
