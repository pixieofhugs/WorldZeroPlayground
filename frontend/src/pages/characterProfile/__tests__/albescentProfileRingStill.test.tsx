/**
 * One moving spectrum on the Albescent profile header (#3024). The shared
 * `CredentialCard` ring turns on create but must stand still on the profile,
 * whose band already travels (`.alb-profile-edge`) — two spectra at two speeds is
 * what #2519 undid. Kits come through the registry (#2815).
 *
 * The ring is found by geometry (the one 136px mount): the na profile has other
 * dials that must keep turning. Each row also asserts the resting conic survives
 * the class removal. Markup only; pixels are visual QA.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

import '../../../i18n'
import type { CharacterOut } from '../../../api/auth'
import { aTask, aPraxisCard } from '../../../test/fixtures'
import { resolveVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import type { ProfileBodyProps } from '../FactionProfileBody'
import type { CreateCharacterState } from '../../characterPaths/useCreateCharacter'

const factor = vi.hoisted(() => ({ value: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

type Width = 'desktop' | 'mobile'
const WIDTHS: readonly Width[] = ['desktop', 'mobile']

const CONIC = '--faction-default-rainbow-conic'

function character(slug: string): CharacterOut {
  return {
    id: 7,
    username: 'reza',
    display_name: 'Reza',
    bio: 'A short bio, so the About block really renders.',
    tagline: 'Small acts, kept up.',
    avatar_url: '',
    location: '',
    level: 7,
    score: 1880,
    all_time_score: 2400,
    faction_slug: slug,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [{ key: 'sock_puppet', name: 'Sock Puppet' }],
    invitations: [],
  }
}

function profile(slug: string, width: Width): string {
  factor.value = width
  const Archetype = resolveVariant(surfaceMap('profileBody'), slug)
  const props: ProfileBodyProps = {
    character: character(slug),
    submissions: [aPraxisCard({ id: 1, title: 'A quiet finding' })],
    proposedTasks: [aTask({ id: 1, title: 'Plant a tree' })],
    progression: {
      nextLevel: 8,
      currentThreshold: 1500,
      nextThreshold: 2000,
      pointsIntoLevel: 380,
      levelSpan: 500,
      progressPercent: 76,
    },
    identityActions: <div>Friend</div>,
  }
  try {
    return renderToStaticMarkup(
      <MemoryRouter>
        <Archetype {...props} />
      </MemoryRouter>,
    )
  } finally {
    factor.value = 'desktop'
  }
}

function creation(slug: string, width: Width): string {
  factor.value = width
  const Archetype = resolveVariant(surfaceMap('createCharacter'), slug)
  const state: CreateCharacterState = {
    displayName: 'Molly',
    setDisplayName: () => {},
    bio: '',
    setBio: () => {},
    tagline: '',
    setTagline: () => {},
    factionSlug: slug,
    setFactionSlug: () => {},
    invited: [],
    avatarFile: null,
    avatarPreview: null,
    avatarSource: null,
    setAvatarSource: () => {},
    avatarError: '',
    setAvatarError: () => {},
    handleAvatarChange: () => {},
    handleAvatarConfirm: () => {},
    error: null,
    submitting: false,
    canSubmit: true,
    handleSubmit: () => {},
    handle: 'molly',
    showPicker: true,
  }
  try {
    return renderToStaticMarkup(
      <MemoryRouter>
        <Archetype state={state} />
      </MemoryRouter>,
    )
  } finally {
    factor.value = 'desktop'
  }
}

function portraitRing(html: string): string {
  const at = html.indexOf('width:136px')
  expect(at, 'the credential card drew no portrait ring').toBeGreaterThan(-1)
  return html.slice(html.lastIndexOf('<', at), html.indexOf('>', at) + 1)
}

describe('the profile header: the band travels, the ring inside it does not', () => {
  for (const width of WIDTHS) {
    it(`albescent stands its credential ring still on ${width}`, () => {
      const html = profile('albescent', width)
      // Without this, a page that lost its whole tell would pass below.
      expect(html, "the identity band's travelling edge").toContain('alb-profile-edge')
      expect(html, 'the marker the dresser rides on').toContain('alb-moves')
      const ring = portraitRing(html)
      expect(
        ring,
        'the credential ring is a FRAME mount here — `.alb-profile-edge` already ' +
          'travels on the band around it, and `.alb-moves .spectrum-dial::before` ' +
          'would put a second spectrum at a second speed on one object (#2519).',
      ).not.toContain('spectrum-dial')
      expect(ring, 'still, not gone: the ring keeps its resting ramp').toContain(CONIC)
    })

    it(`the na profile keeps its spectrum hoop on ${width}`, () => {
      // na never turned; this holds the PAINT — the conic must survive the class.
      const ring = portraitRing(profile('na', width))
      expect(ring, 'the same unclassed mount').not.toContain('spectrum-dial')
      expect(ring, 'na keeps its hoop').toContain(CONIC)
    })
  }

  for (const width of WIDTHS) {
    it(`character creation keeps the albescent ring turning on ${width}`, () => {
      // #3019: the create ring is an ornament and still turns.
      const html = creation('albescent', width)
      expect(html).toContain('alb-moves')
      expect(portraitRing(html), 'the create ring is classed').toContain('spectrum-dial')
    })
  }
})
