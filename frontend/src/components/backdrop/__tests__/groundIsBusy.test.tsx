/**
 * The ornament-alternation predicate (#2195 phase 1).
 *
 * THE SEAM: `the ground a page declared` → `what useGroundIsBusy() tells a card`.
 * Two halves, both pure and both here:
 *
 *   1. `backdropIsOrnamented(slug)` — is that page ground a PATTERN or a wash?
 *      A table, so a new backdrop that forgets to file itself is visible.
 *   2. `useGroundIsBusy()` — the context read a card family will consume,
 *      including the faction-page exemption (owner, 2026-08-18).
 *
 * NO CARD READS THIS YET, deliberately: phase 1 merges alone so nine kits are
 * not each shipping a branch on a boolean that does not exist. This file is
 * therefore the ONLY consumer in the tree, and the only thing standing between
 * the predicate and a silent inversion later.
 *
 * Effects never run here (`renderToStaticMarkup`, no DOM — see
 * `BackdropContext`'s own note), which is exactly why the predicate is computed
 * at READ time from context values rather than pushed into state by
 * `useFactionBackdrop`'s effect: everything below is reachable in this harness.
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
    // Everymen's conic rays + dot grid + double hatch, SNIDE's flyposted wall,
    // Singularity's circuit grid + scanlines, the Ephemerists' chart net, WOW's
    // 135° gilt hatch. Each repeats across the whole field.
    for (const slug of ['everymen', 'snide', 'singularity', 'ephemerists', 'wow']) {
      expect(backdropIsOrnamented(slug), `${slug} is a pattern`).toBe(true)
    }
    expect([...ORNAMENTED_BACKDROP_SLUGS].sort()).toEqual(
      ['ephemerists', 'everymen', 'singularity', 'snide', 'wow'].sort(),
    )
  })

  it('calls a WASH plain — Coven candlelight and UA mesa (owner, #2195)', () => {
    // Both draw a flat token plus soft figures at 6–9%. The owner ruled these
    // are not busy: there is no second texture for a card to fight.
    expect(backdropIsOrnamented('coven')).toBe(false)
    expect(backdropIsOrnamented('ua')).toBe(false)
  })

  it('calls every ground that resolves to the watercolour plain', () => {
    // `null` is every route that themes nothing (/tasks, Home, FieldDesk, both
    // detail pages) — the case that must stay false, or the alternation would
    // strip the ornament off cards site-wide. `albescent` ships a manifest with
    // no `backdrop` and `na` ships no manifest at all, so both land on
    // `WatercolorBackground` via `FactionBackdrop`'s fallback.
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
    // A Coven card on the Everymen wall is still two textures fighting.
    expect(busyUnder('everymen')).toBe(true)
    expect(busyUnder('singularity')).toBe(true)
  })

  it('is false on a wash, so a Coven profile keeps its cards ornamented', () => {
    expect(busyUnder('coven')).toBe(false)
  })

  it('is false when the page claimed the exemption, however busy the ground', () => {
    // Owner, 2026-08-18: "for the complex background rule, faction pages are
    // exempt. We can have a busy faction background page with busy task and
    // praxis cards on it." `useFactionDetail` is the one caller that claims it.
    expect(busyUnder('everymen', true)).toBe(false)
    expect(busyUnder('snide', true)).toBe(false)
  })

  it('defaults to NOT exempt, so a new busy page gets the law for free', () => {
    // The safe default is the law; the carve-out is what has to be typed out.
    // A page that mounts a patterned backdrop and says nothing about ornament
    // gets plain cards rather than silently keeping the clash.
    expect(busyUnder('snide')).toBe(true)
  })
})
