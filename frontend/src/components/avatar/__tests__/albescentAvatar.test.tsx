/**
 * Albescent's avatar tell (#2502, epic #2496).
 *
 * - The ring turns only at 64px+, above every mount that exists (owner ruling;
 *   the roster LEAD is 54). One turning ring in a column of still ones is a
 *   spotlight, so below the gate it is absent, not stilled. Ships dormant.
 * - Photo and monogram discs get the same tell: the ring mounts inside the
 *   `.user-media` hook (#2457), so it rides the lift in both.
 * - The corner mark is the VIEWER's (ADR-0088): identical to na until the gate
 *   (`isFactionRedacted`, driven by `setAlbescentRevealed`) opens, then
 *   different in the corner mark only.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'

import type { CharacterOut } from '../../../api/auth'
import AlbescentAvatar from '../AlbescentAvatar'
import DefaultAvatar from '../DefaultAvatar'
import { surfaceMap } from '../../../factions'
import { setAlbescentRevealed } from '../../../utils/factions'
import { ruleBodies, stripComments } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'

const read = (path: string): string =>
  stripComments(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8'))

const INDEX = stripComments(readIndexCss())
const MOTION = read('../../../motion.ornament.css')

/** The one node the wrapper adds. Removing it must leave the na disc. */
const ORNAMENT = '<span aria-hidden="true" class="alb-avatar-ring"></span>'

/** The labyrinth's alpha stencil — the whole of what a revealed viewer gains. */
const LABYRINTH = '/factionMarks/labyrinth.svg'

/** `DefaultSigil`'s stencil: a ring punched with a hole, not a drawing. */
const NA_RING = 'radial-gradient(circle'

/** Everything above the badge (the disc's only absolutely positioned, last child). */
const aboveTheBadge = (html: string): string => html.slice(0, html.indexOf('position:absolute'))

function character(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 1,
    username: 'Isolde',
    display_name: 'Isolde',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 3,
    score: 0,
    all_time_score: 0,
    faction_slug: 'albescent',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

const MONOGRAM = character()
const PHOTO = character({ avatar_url: '/media/isolde.png' })

const markup = (props: { size?: 'sm' | 'md' | number; photo?: boolean }): string =>
  renderToStaticMarkup(
    <AlbescentAvatar character={props.photo ? PHOTO : MONOGRAM} size={props.size} />,
  )

describe('the ring turns only where the disc is looked at (#2502)', () => {
  it.each([64, 96, 128])('mounts the turning ring at %spx', (size) => {
    expect(markup({ size })).toContain('alb-avatar-ring')
  })

  it.each([
    ['sm', 'sm' as const],
    ['md', 'md' as const],
    ['24', 24],
    ['32', 32],
    ['42 — a roster row', 42],
    ['54 — the roster LEAD, the largest mount in the app', 54],
    ['63', 63],
  ])('leaves the disc still at %s', (_label, size) => {
    expect(markup({ size })).not.toContain('alb-avatar-ring')
  })

  it('drops the node entirely rather than stilling it', () => {
    expect(markup({ size: 'sm' })).toBe(
      renderToStaticMarkup(<DefaultAvatar character={MONOGRAM} size="sm" />),
    )
  })
})

describe('a photo disc and a monogram disc are the same amount of Albescent', () => {
  it.each([64, 96])('rings both at %spx', (size) => {
    expect(markup({ size, photo: true })).toContain('alb-avatar-ring')
    expect(markup({ size, photo: false })).toContain('alb-avatar-ring')
  })

  it.each(['sm' as const, 'md' as const])('rings neither at %s', (size) => {
    expect(markup({ size, photo: true })).not.toContain('alb-avatar-ring')
    expect(markup({ size, photo: false })).not.toContain('alb-avatar-ring')
  })

  it('mounts the ring INSIDE the .user-media hook, so it rides the lift', () => {
    const html = markup({ size: 64, photo: true })
    const hook = html.indexOf('class="user-media"')
    expect(hook).toBeGreaterThanOrEqual(0)
    expect(html.indexOf('alb-avatar-ring')).toBeGreaterThan(hook)
  })
})

describe('the corner mark is gated on the viewer, not on the player (ADR-0088)', () => {
  afterEach(() => setAlbescentRevealed(false))

  const disc = (who: CharacterOut, size: 'sm' | 'md' | number = 'sm'): string =>
    renderToStaticMarkup(<AlbescentAvatar character={who} size={size} />)

  describe('an UNREVEALED viewer — na, exactly as before', () => {
    it.each([
      ['monogram', MONOGRAM],
      ['photo', PHOTO],
    ])('is DefaultAvatar byte for byte — %s', (_label, who) => {
      setAlbescentRevealed(false)
      expect(disc(who)).toBe(renderToStaticMarkup(<DefaultAvatar character={who} size="sm" />))
    })

    it('never names the labyrinth, in the markup or in an asset URL', () => {
      setAlbescentRevealed(false)
      expect(disc(MONOGRAM)).not.toContain(LABYRINTH)
      expect(disc(PHOTO)).not.toContain(LABYRINTH)
      expect(disc(MONOGRAM)).toContain(NA_RING)
    })

    it('is still Default plus one span at the gate size', () => {
      setAlbescentRevealed(false)
      const alb = disc(MONOGRAM, 64)
      expect(alb).toContain(ORNAMENT)
      expect(alb.replace(ORNAMENT, '')).toBe(
        renderToStaticMarkup(<DefaultAvatar character={MONOGRAM} size={64} />),
      )
    })
  })

  describe('a REVEALED viewer — the labyrinth, at every mount', () => {
    it.each([
      ['a comment leaf', 'sm' as const],
      ['a praxis byline', 28],
      ['a mobile row', 42],
      ['the roster LEAD', 54],
      ['past the ring gate', 64],
    ])('badges %s with the labyrinth', (_label, size) => {
      setAlbescentRevealed(true)
      const html = disc(MONOGRAM, size)
      expect(html).toContain(LABYRINTH)
      expect(html).not.toContain(NA_RING)
    })

    it('changes the corner mark and nothing else', () => {
      // Albescent still has no hue of its own (ADR-0088).
      setAlbescentRevealed(false)
      const hidden = disc(PHOTO, 64)
      setAlbescentRevealed(true)
      const shown = disc(PHOTO, 64)
      expect(shown).not.toBe(hidden)
      expect(aboveTheBadge(shown)).toBe(aboveTheBadge(hidden))
      expect(shown).not.toContain('--faction-albescent-')
    })

    it('draws the same amount of Albescent on a photo as on a monogram', () => {
      setAlbescentRevealed(true)
      expect(disc(PHOTO)).toContain(LABYRINTH)
      expect(disc(MONOGRAM)).toContain(LABYRINTH)
    })

    it('draws no mark at all where the surface turned the badge off', () => {
      // The desktop roster passes `badge={false}` (#2245).
      setAlbescentRevealed(true)
      const html = renderToStaticMarkup(
        <AlbescentAvatar character={MONOGRAM} size={42} badge={false} />,
      )
      expect(html).not.toContain(LABYRINTH)
      expect(html).not.toContain(NA_RING)
    })

    it('leaves an unaffiliated player wearing na, whoever is looking', () => {
      setAlbescentRevealed(true)
      const na = renderToStaticMarkup(
        <DefaultAvatar character={character({ faction_slug: 'na' })} size="sm" />,
      )
      expect(na).toContain(NA_RING)
      expect(na).not.toContain(LABYRINTH)
    })
  })

  it('registers the wrapper on the avatar surface', () => {
    expect(surfaceMap('avatar').albescent).toBeDefined()
  })
})

describe('where the ornament is declared', () => {
  it('paints from index.css, in the conic cut the static ring already wears', () => {
    const body = ruleBodies(INDEX, '.alb-avatar-ring')[0]
    expect(body).toBeDefined()
    // The ramp `DefaultAvatar`'s ring paints, so at rest it matches what it covers.
    expect(body).toContain('var(--faction-default-rainbow-conic)')
    // Epic #2496: no animation on the blocking sheet.
    expect(body).not.toContain('animation')
  })

  it('turns from the deferred sheet, behind the reduced-motion gate', () => {
    const gates = ruleBodies(MOTION, '@media (prefers-reduced-motion: no-preference)')
    const turning = gates.filter((gate) => gate.includes('.alb-avatar-ring'))
    expect(turning).toHaveLength(1)
    expect(turning[0]).toMatch(/\.alb-avatar-ring\s*\{[^}]*animation:/)
    // Rotate a static conic (rasterises once); never animate the gradient itself.
    expect(MOTION).not.toContain('@property')
  })

  it('leaves a fully drawn ring when the motion never arrives', () => {
    // Reduced motion leaves the overlay parked, so it must not rest hidden.
    const body = ruleBodies(INDEX, '.alb-avatar-ring')[0]
    expect(body).not.toMatch(/opacity:\s*0\s*[;}]/)
    expect(body).not.toContain('display: none')
  })
})
