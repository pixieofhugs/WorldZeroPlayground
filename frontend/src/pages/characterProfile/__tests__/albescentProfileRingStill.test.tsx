/**
 * ONE MOVING SPECTRUM ON THE ALBESCENT PROFILE HEADER (#3024).
 *
 * ## The seam
 *
 * The rendered markup of `surfaceMap('profileBody')`'s albescent kit and of
 * `surfaceMap('createCharacter')`'s, at both widths — the two surfaces the ONE
 * shared `CredentialCard` ring reaches with opposite answers. Both are read
 * through the registry rather than by importing an archetype, for the reason
 * every dispatch walk in this repo is (#2815, #2955): a typed roster cannot
 * notice the kit that moves.
 *
 * ## What went red here
 *
 * #3019 classed the card's na ring `.spectrum-dial` so Albescent's CREATE ring
 * turns at both widths. The card is shared, and the profile header mounts it
 * inside the identity band — which already carries `.alb-profile-edge`, a 9s
 * travelling ramp. `.alb-moves .spectrum-dial::before` has no `:empty` guard to
 * exclude it, so the header showed a 9s edge and a 46s ring on one object: the
 * two-spectra-at-two-speeds doubling #2519 spent a PR undoing, and the exact
 * thing `AlbescentProfileBody`'s docblock excludes the band from the moving set
 * to avoid.
 *
 * ## Why the ring is read by its geometry
 *
 * The na profile draws two OTHER dials that must keep turning (the FDL laurel's
 * ring, the badge medallions), so "the page holds no `.spectrum-dial`" is the
 * wrong assertion and would go green on a page whose whole tell had died. The
 * card's portrait ring is the one 136px round mount it draws, so the tag around
 * that width is the mount under test.
 *
 * ## The paint half, which is not a detail
 *
 * `.spectrum-dial` carries the RESTING conic as well as the reach — dropping the
 * class with nothing in its place would take the rainbow hoop off every na and
 * Albescent profile header rather than standing it still. So each row asserts
 * the ramp is still on the ring it just took the class off.
 *
 * `renderToStaticMarkup` in node (SPEC-testing): no DOM and no compositor, so
 * nothing here proves a pixel. The pixels are visual QA, stated outstanding on
 * the PR.
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

/** The credential card's portrait ring: the one 136px round mount it draws. */
function portraitRing(html: string): string {
  const at = html.indexOf('width:136px')
  expect(at, 'the credential card drew no portrait ring').toBeGreaterThan(-1)
  return html.slice(html.lastIndexOf('<', at), html.indexOf('>', at) + 1)
}

describe('the profile header: the band travels, the ring inside it does not', () => {
  for (const width of WIDTHS) {
    it(`albescent stands its credential ring still on ${width}`, () => {
      const html = profile('albescent', width)
      // The band is the carrier, and it is still moving — a page that lost its
      // whole tell would otherwise pass the line below.
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
      // The mount is shared, so na takes the same still ring. Nothing dresses
      // na, so its ring never turned either way — what this row holds is the
      // PAINT: `.spectrum-dial` carries the resting conic as well as the reach,
      // so the ramp has to travel with the class off the mount, or the header's
      // rainbow hoop goes plain on nine profiles instead of standing still.
      const ring = portraitRing(profile('na', width))
      expect(ring, 'the same unclassed mount').not.toContain('spectrum-dial')
      expect(ring, 'na keeps its hoop').toContain(CONIC)
    })
  }

  for (const width of WIDTHS) {
    it(`character creation keeps the albescent ring turning on ${width}`, () => {
      // #3019's behaviour, kept: the create ring is an ORNAMENT — no travelling
      // object holds it, so the dresser reaches it at both widths.
      const html = creation('albescent', width)
      expect(html).toContain('alb-moves')
      expect(portraitRing(html), 'the create ring is classed').toContain('spectrum-dial')
    })
  }
})
