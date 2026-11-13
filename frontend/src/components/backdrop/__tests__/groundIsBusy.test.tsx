/**
 * The ornament-alternation predicate (#2195): `backdropIsOrnamented(slug)`
 * (pattern or wash) and `useGroundIsBusy()` (with the faction-page exemption).
 * Computed at read time, so static markup reaches every branch.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'

import { BackdropContext, useGroundIsBusy } from '../BackdropContext'
import {
  ORNAMENTED_BACKDROP_SLUGS,
  backdropIsOrnamented,
} from '../ornamentedGrounds'

/** A card's-eye view: what the predicate says under a given declared ground. */
function Probe() {
  return <>{String(useGroundIsBusy())}</>
}

function busyUnder(slug: string | null, cardsKeepOrnament = false): boolean {
  const markup = renderToStaticMarkup(
    <BackdropContext.Provider
      value={{ slug, cardsKeepOrnament, setGround: () => {} }}
    >
      <Probe />
    </BackdropContext.Provider>,
  )
  return markup === 'true'
}

describe('backdropIsOrnamented', () => {
  it('calls the five patterned grounds busy', () => {
    // Each repeats a texture across the whole field.
    for (const slug of ['everymen', 'snide', 'singularity', 'ephemerists', 'wow']) {
      expect(backdropIsOrnamented(slug), `${slug} is a pattern`).toBe(true)
    }
    expect([...ORNAMENTED_BACKDROP_SLUGS].sort()).toEqual(
      ['ephemerists', 'everymen', 'singularity', 'snide', 'wow'].sort(),
    )
  })

  it('calls a WASH plain — Coven candlelight and UA mesa (owner, #2195)', () => {
    // Flat token plus soft figures: not busy (owner ruling).
    expect(backdropIsOrnamented('coven')).toBe(false)
    expect(backdropIsOrnamented('ua')).toBe(false)
  })

  it('calls every ground that resolves to the watercolour plain', () => {
    // `null` is every unthemed route; it must stay false or cards lose
    // ornament site-wide. `albescent` and `na` both land on the watercolour.
    for (const slug of [null, 'na', 'albescent', 'default', 'no-such-faction']) {
      expect(backdropIsOrnamented(slug), `${slug} is plain`).toBe(false)
    }
  })
})

describe('useGroundIsBusy', () => {
  it('is false on every unthemed route — the site-wide default', () => {
    expect(busyUnder(null)).toBe(false)
  })

  it('is true on a patterned ground, whatever faction the card is', () => {
    // Owner ruled (a): ANY ornamented ground, not just the card's own faction.
    expect(busyUnder('everymen')).toBe(true)
    expect(busyUnder('singularity')).toBe(true)
  })

  it('is false on a wash, so a Coven profile keeps its cards ornamented', () => {
    expect(busyUnder('coven')).toBe(false)
  })

  it('is false when the page claimed the exemption, however busy the ground', () => {
    // Owner, 2026-08-18: faction pages are exempt (`useFactionDetail`).
    expect(busyUnder('everymen', true)).toBe(false)
    expect(busyUnder('snide', true)).toBe(false)
  })

  it('defaults to NOT exempt, so a new busy page gets the law for free', () => {
    // The law is the default; the carve-out must be typed out.
    expect(busyUnder('snide')).toBe(true)
  })
})
