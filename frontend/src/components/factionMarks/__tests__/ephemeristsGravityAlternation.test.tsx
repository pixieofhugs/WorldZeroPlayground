/**
 * THE EPHEMERISTS ORNAMENT ALTERNATES (#2398, phase 3 of epic #2195).
 *
 * The law, owner 2026-08-17: each faction has ONE ornament; a card on an
 * ornamented ground goes plain, a card on a plain ground wears it. The
 * Ephemerists' ornament is the GRAVITY FIELD — the brass rows bowed toward a
 * well off the sheet's right edge (#1830) — and until this issue it was worn by
 * the composer alone: neither card drew it.
 *
 * THE SEAM: `the ground a page declared` → `what the two cards draw`. The
 * predicate half (`useGroundIsBusy`) is pinned by
 * `backdrop/__tests__/groundIsBusy.test.tsx`; this file is the other half, and
 * the only thing that can catch the branch being inverted, dropped from one of
 * the two cards, or quietly extended to chrome.
 *
 * `renderToStaticMarkup`, no DOM — so `BackdropContext.Provider` is how a ground
 * is declared here (`useFactionBackdrop` sets it from an effect, and effects
 * never run in this harness; the context's own note says the same).
 *
 * THE THIRD TEXTURE IS PART OF THE SEAM. "Either burst, or plain" (owner, same
 * grill): where the ornament is not worn the ground is BARE, never a substitute
 * pattern. The task card's ground was the warped chart NET at 0.10 — the same
 * drawing the Ephemerists page ground paints at 0.17 — which is the second
 * texture the law rules out and the reason the alternation would otherwise be a
 * no-op on the one route it exists for. The net stays the PAGE's mark (backdrop,
 * task detail, faction select card); it is no longer a card ground.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import type { ReactElement } from 'react'
import '../../../i18n'

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))

// Imported after the mock is registered.
import { BackdropContext } from '../../backdrop/BackdropContext'
import EphemeristsTaskCard from '../../taskCard/EphemeristsTaskCard'
import EphemeristsPraxisCard from '../../praxisCard/desktop/EphemeristsPraxisCard'
import { aTask, aPraxisCard } from '../../../test/fixtures'

/**
 * The field's signature: every row is `M-6 <y> C …`, and the well is three
 * ochre rings on a canvas anchored to the right edge. No other Ephemerists mark
 * draws either.
 */
const FIELD_ROW = 'd="M-6 '
const FIELD_CANVAS = 'preserveAspectRatio="xMaxYMin slice"'
/** The chart net's canvas — the design's own 1000×600 sheet. */
const NET = 'viewBox="0 0 1000 600"'

const TASK = aTask({ primary_faction_slug: 'ephemerists', in_progress_count: 2 })
const CARD = aPraxisCard({
  task_faction_slug: 'ephemerists',
  created_by_faction_slug: 'ephemerists',
})

const adminProps = {
  praxis: CARD,
  showAdminControls: false,
  onHide: () => {},
  onDelete: () => {},
} as unknown as Parameters<typeof EphemeristsPraxisCard>[0]['adminProps']

/** Render `node` under a page ground, exactly as a route would declare one. */
function onGround(
  node: ReactElement,
  slug: string | null,
  cardsKeepOrnament = false,
): string {
  return renderToStaticMarkup(
    <BackdropContext.Provider value={{ slug, cardsKeepOrnament, setGround: () => {} }}>
      <MemoryRouter>{node}</MemoryRouter>
    </BackdropContext.Provider>,
  )
}

const taskCard = (slug: string | null, keep = false) =>
  onGround(
    <EphemeristsTaskCard
      task={TASK}
      basePoints={TASK.point_value}
      multiplier={1}
      inProgressCount={TASK.in_progress_count}
      onSignup={() => {}}
    />,
    slug,
    keep,
  )

const praxisCard = (slug: string | null, keep = false) =>
  onGround(<EphemeristsPraxisCard praxis={CARD} adminProps={adminProps} />, slug, keep)

const BOTH: Array<[string, (slug: string | null, keep?: boolean) => string]> = [
  ['task card', taskCard],
  ['praxis card', praxisCard],
]

describe('the gravity field is worn on BOTH cards (#2398)', () => {
  for (const [name, render] of BOTH) {
    it(`draws the field on the ${name} where no page themed the ground`, () => {
      // /tasks, Home, the FieldDesk, both detail pages: nothing declared, so
      // the ground is the global watercolour and the card wears its ornament.
      const html = render(null)
      expect(html, 'the fieldrows').toContain(FIELD_ROW)
      expect(html, "the well's canvas").toContain(FIELD_CANVAS)
    })

    it(`drops the field on the ${name} when the ground is a pattern`, () => {
      // ANY ornamented ground, not just this faction's (owner ruled (a)): a
      // Coven card on the Everymen wall is still two textures fighting.
      for (const busy of ['everymen', 'snide', 'singularity', 'ephemerists', 'wow']) {
        const html = render(busy)
        expect(html, `${busy} ground`).not.toContain(FIELD_ROW)
        expect(html, `${busy} ground`).not.toContain(FIELD_CANVAS)
      }
    })

    it(`keeps the field on the ${name} over a WASH`, () => {
      // Coven's candlelight and UA's mesa are flat colour plus soft figures —
      // an unrelated card reads straight through them, so nothing alternates.
      for (const wash of ['coven', 'ua', 'albescent', 'na']) {
        expect(render(wash), `${wash} ground`).toContain(FIELD_ROW)
      }
    })

    it(`keeps the field on the ${name} on a faction page`, () => {
      // The exemption (owner, 2026-08-18): "we can have a busy faction
      // background page with busy task and praxis cards on it." The page claims
      // it with `useFactionBackdrop(slug, { cardsKeepOrnament: true })`.
      expect(render('ephemerists', true)).toContain(FIELD_ROW)
      expect(render('everymen', true)).toContain(FIELD_ROW)
    })
  }
})

describe('either burst, or plain — no substitute texture (#2195)', () => {
  it('takes the chart net off the task card, on every ground', () => {
    // The net at 0.10 was the card's ground before this issue. It is the PAGE's
    // drawing; two textures on one card is the clash the law exists to end.
    for (const slug of [null, 'ephemerists', 'everymen', 'coven']) {
      expect(taskCard(slug), `${slug} ground`).not.toContain(NET)
    }
  })

  it('leaves the plain card bare — the ornament is the only ground', () => {
    for (const [name, render] of BOTH) {
      const html = render('ephemerists')
      expect(html, `${name} keeps no net`).not.toContain(NET)
      expect(html, `${name} keeps no field`).not.toContain(FIELD_ROW)
    }
  })
})

describe('the alternation never reaches chrome (#2195)', () => {
  it('leaves the task card its band, its cornice, its rose and its runes', () => {
    const plain = taskCard(null)
    const busy = taskCard('everymen')
    // The compass rose is the POINTS MARK, not the ornament; the notation band,
    // the cavetto flutes and the CTA's double rule are the card's chrome.
    for (const mark of [
      'M50 8 L55.5 26 L44.5 26 Z',
      'data-eph-runes',
      'data-cta-rule="ephemerists"',
    ]) {
      expect(plain, `plain ground: ${mark}`).toContain(mark)
      expect(busy, `busy ground: ${mark}`).toContain(mark)
    }
  })

  it('leaves the praxis card its band, its cornice and its byline runes', () => {
    const plain = praxisCard(null)
    const busy = praxisCard('everymen')
    for (const mark of ['data-eph-runes', 'href="/factions/ephemerists"']) {
      expect(plain, `plain ground: ${mark}`).toContain(mark)
      expect(busy, `busy ground: ${mark}`).toContain(mark)
    }
  })
})
