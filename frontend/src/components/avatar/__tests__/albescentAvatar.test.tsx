/**
 * Albescent's avatar tell (#2502, epic #2496) — the SEVENTH surface to unfreeze.
 *
 * Two properties, and both of them are about CONTEXT rather than about paint.
 *
 * THE RING TURNS ONLY WHERE THE DISC IS LOOKED AT. Every other Albescent surface
 * reveals the society to someone already looking at that surface; an avatar is
 * the one that renders BESIDE other players' — comment leaves, praxis bylines,
 * the players roster, duel banners. One turning ring in a column of still ones
 * is a spotlight, not a shimmer. So the ornament mounts at 64px and up and is
 * absent, not merely stilled, below that.
 *
 * 64 is ABOVE EVERY MOUNT THAT EXISTS, on purpose (owner ruling 2026-08-23).
 * The largest `<FactionAvatar>` in the app is the players roster's LEAD card at
 * 54; everything else is 24-44. #2502 specified 48, which would have lit the
 * ring on the top row of the roster and nowhere else — the column-of-others case
 * the gate exists to prevent, with the largest disc in the column. The tell
 * therefore ships DORMANT and lights up by itself when a surface first shows one
 * player's disc large and alone. 54 sits in the still list below, so raising a
 * mount past the gate is a decision someone has to take deliberately — this
 * suite goes red rather than the ring quietly appearing on the roster.
 *
 * THE PHOTO AND THE MONOGRAM ARE THE SAME AMOUNT OF ALBESCENT. `.user-media`
 * rides the whole disc when there is a photograph (#2457), which lifts a photo
 * disc clear of the praxis/feed/detail wash while a monogram disc stays under
 * it — same player, same surface, two different tells. The ring is chrome
 * OUTSIDE the photo and mounts inside that hook, so it rides with the lift in
 * both branches. The parity assertions below are half the issue.
 *
 * THE CORNER MARK IS THE VIEWER'S, NOT THE PLAYER'S (ADR-0088, #2731). The disc
 * used to be na's byte for byte — same ring, same monogram, same `DefaultSigil`
 * — and this file asserted that on both branches. ADR-0088 reverses it: a
 * viewer who has already been let in sees Albescent's labyrinth on the badge,
 * and an unrevealed viewer sees na's ring exactly as before. So the invariant
 * is no longer "identical to na" but "identical to na UNTIL the gate opens, and
 * then different in the corner mark and nowhere else" — the assertion that
 * catches a leak, and sharper than the one it replaces.
 *
 * THE SEAM IS `isFactionRedacted()`, driven here by `setAlbescentRevealed` —
 * two viewers rendering the same character. Not a prop and not a context: the
 * module flag `/auth/me` sets, so the gate this file exercises is the one every
 * mount in the app actually reads.
 *
 * The harness is `renderToStaticMarkup`: no DOM, so the rotation itself cannot
 * be observed here. What can be — and is — is that the ornament's paint lives in
 * index.css, its animation lives in the deferred motion sheet behind the
 * reduced-motion gate, and that a stilled ring is still a fully drawn ring.
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

const read = (path: string): string =>
  stripComments(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8'))

const INDEX = read('../../../index.css')
const MOTION = read('../../../motion.ornament.css')

/** The one node the wrapper adds. Removing it must leave the na disc. */
const ORNAMENT = '<span aria-hidden="true" class="alb-avatar-ring"></span>'

/** The labyrinth's alpha stencil — the whole of what a revealed viewer gains. */
const LABYRINTH = '/factionMarks/labyrinth.svg'

/** `DefaultSigil`'s stencil: a ring punched with a hole, not a drawing. */
const NA_RING = 'radial-gradient(circle'

/**
 * Everything ABOVE the corner mark. The badge is the last child and the only
 * absolutely positioned node in the disc, so this is the portrait, the ring and
 * the ornament — the part the gate may not touch.
 */
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
  // 64 is the gate; 63 below is the proof it is a gate and not a coincidence of
  // the named steps. No mount in the app reaches it today — that is the ruling,
  // and the 54 case in the still list is what holds the gate above the roster.
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
    // A byline in a roster of twenty must cost what na costs, so the small
    // rendering is not "the ornament with its animation off" — it is Default.
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
    // `.alb-praxis .user-media` et al. raise a photo disc above the wash. A ring
    // mounted outside that root would be washed on a photo and not on a
    // monogram — the inconsistency this issue exists to end, re-created.
    const html = markup({ size: 64, photo: true })
    const hook = html.indexOf('class="user-media"')
    expect(hook).toBeGreaterThanOrEqual(0)
    expect(html.indexOf('alb-avatar-ring')).toBeGreaterThan(hook)
  })
})

describe('the corner mark is gated on the viewer, not on the player (ADR-0088)', () => {
  // The module flag defaults to hidden, so every OTHER describe in this file
  // runs unrevealed and reads na's dress. Put it back after each case here.
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
      // The leak the gate exists to prevent: a stranger reading a thread must
      // not be handed a mark that sorts Albescent members out of the crowd.
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
      // Not na's ring as well — the mark is replaced, never stacked.
      expect(html).not.toContain(NA_RING)
    })

    it('changes the corner mark and nothing else', () => {
      // The disc, the spectrum ring and the ornament are the same bytes for
      // both viewers; the delta is confined to the badge. Albescent still has
      // no hue of its own — the labyrinth is filled from the same conic na's
      // ring is (ADR-0088 keeps `CSS_KEY.albescent` on `default`).
      setAlbescentRevealed(false)
      const hidden = disc(PHOTO, 64)
      setAlbescentRevealed(true)
      const shown = disc(PHOTO, 64)
      expect(shown).not.toBe(hidden)
      expect(aboveTheBadge(shown)).toBe(aboveTheBadge(hidden))
      expect(shown).not.toContain('--faction-albescent-')
    })

    it('draws the same amount of Albescent on a photo as on a monogram', () => {
      // The parity property #2502 established, restated for the badge: same
      // player, same surface, one tell.
      setAlbescentRevealed(true)
      expect(disc(PHOTO)).toContain(LABYRINTH)
      expect(disc(MONOGRAM)).toContain(LABYRINTH)
    })

    it('draws no mark at all where the surface turned the badge off', () => {
      // The desktop roster gives the faction its own column (#2245) and passes
      // `badge={false}`. The gate must not smuggle a second mark back onto it.
      setAlbescentRevealed(true)
      const html = renderToStaticMarkup(
        <AlbescentAvatar character={MONOGRAM} size={42} badge={false} />,
      )
      expect(html).not.toContain(LABYRINTH)
      expect(html).not.toContain(NA_RING)
    })

    it('leaves an unaffiliated player wearing na, whoever is looking', () => {
      // The gate keys off the CHARACTER's slug through `isFactionRedacted`, so
      // a revealed viewer must not repaint everyone else's disc.
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
    // The same ramp `DefaultAvatar`'s ring paints, so the overlay at rest is the
    // ring it covers. A linear cut would smear the spectrum across the disc.
    expect(body).toContain('var(--faction-default-rainbow-conic)')
    // Never a gradient PARAMETER (epic #2496's technique ruling): no @property
    // angle to re-rasterise, and no animation on the blocking sheet.
    expect(body).not.toContain('animation')
  })

  it('turns from the deferred sheet, behind the reduced-motion gate', () => {
    const gates = ruleBodies(MOTION, '@media (prefers-reduced-motion: no-preference)')
    const turning = gates.filter((gate) => gate.includes('.alb-avatar-ring'))
    expect(turning).toHaveLength(1)
    expect(turning[0]).toMatch(/\.alb-avatar-ring\s*\{[^}]*animation:/)
    // A rotation of a STATIC conic, which rasterises once — never a keyframe
    // that walks the gradient itself.
    expect(MOTION).not.toContain('@property')
  })

  it('leaves a fully drawn ring when the motion never arrives', () => {
    // The reduced-motion rendering is the un-animated overlay: same conic, same
    // 2px band, parked at rotation 0 on top of the ring it matches. A ring that
    // simply stops is fine; a ring that vanishes is not, so nothing in the
    // ornament's resting paint may be `opacity: 0` or `display: none`.
    const body = ruleBodies(INDEX, '.alb-avatar-ring')[0]
    expect(body).not.toMatch(/opacity:\s*0\s*[;}]/)
    expect(body).not.toContain('display: none')
  })
})
