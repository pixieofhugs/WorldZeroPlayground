/**
 * Albescent's avatar tell (#2502, epic #2496) — the SEVENTH surface to unfreeze.
 *
 * Two properties, and both of them are about CONTEXT rather than about paint.
 *
 * THE RING TURNS ONLY WHERE THE DISC IS LOOKED AT. Every other Albescent surface
 * reveals the society to someone already looking at that surface; an avatar is
 * the one that renders BESIDE other players' — comment leaves, praxis bylines,
 * the players roster, duel banners. One turning ring in a column of still ones
 * is a spotlight, not a shimmer. So the ornament mounts at 48px and up and is
 * absent, not merely stilled, at the 24/32px steps.
 *
 * THE PHOTO AND THE MONOGRAM ARE THE SAME AMOUNT OF ALBESCENT. `.user-media`
 * rides the whole disc when there is a photograph (#2457), which lifts a photo
 * disc clear of the praxis/feed/detail wash while a monogram disc stays under
 * it — same player, same surface, two different tells. The ring is chrome
 * OUTSIDE the photo and mounts inside that hook, so it rides with the lift in
 * both branches. The parity assertions below are half the issue.
 *
 * The harness is `renderToStaticMarkup`: no DOM, so the rotation itself cannot
 * be observed here. What can be — and is — is that the ornament's paint lives in
 * index.css, its animation lives in the deferred motion sheet behind the
 * reduced-motion gate, and that a stilled ring is still a fully drawn ring.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { CharacterOut } from '../../../api/auth'
import AlbescentAvatar from '../AlbescentAvatar'
import { DefaultAvatar } from '../FactionAvatar'
import { surfaceMap } from '../../../factions'
import { ruleBodies, stripComments } from '../../../utils/__tests__/cssVars'

const read = (path: string): string =>
  stripComments(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8'))

const INDEX = read('../../../index.css')
const MOTION = read('../../../motion.ornament.css')

/** The one node the wrapper adds. Removing it must leave `DefaultAvatar`. */
const ORNAMENT = '<span aria-hidden="true" class="alb-avatar-ring"></span>'

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
  // 48 is the gate; 47 is the proof it is a gate and not a coincidence of the
  // two named steps. 96 is the profile disc, the largest mount in the app.
  it.each([48, 56, 64, 96])('mounts the turning ring at %spx', (size) => {
    expect(markup({ size })).toContain('alb-avatar-ring')
  })

  it.each([
    ['sm', 'sm' as const],
    ['md', 'md' as const],
    ['24', 24],
    ['32', 32],
    ['47', 47],
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
  it.each([48, 96])('rings both at %spx', (size) => {
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
    const html = markup({ size: 48, photo: true })
    const hook = html.indexOf('class="user-media"')
    expect(hook).toBeGreaterThanOrEqual(0)
    expect(html.indexOf('alb-avatar-ring')).toBeGreaterThan(hook)
  })
})

describe('it is Default plus one span, on both branches', () => {
  it.each([
    ['monogram', MONOGRAM],
    ['photo', PHOTO],
  ])('strips back to DefaultAvatar byte for byte — %s', (_label, who) => {
    const alb = renderToStaticMarkup(<AlbescentAvatar character={who} size={48} />)
    expect(alb).toContain(ORNAMENT)
    expect(alb.replace(ORNAMENT, '')).toBe(
      renderToStaticMarkup(<DefaultAvatar character={who} size={48} />),
    )
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
