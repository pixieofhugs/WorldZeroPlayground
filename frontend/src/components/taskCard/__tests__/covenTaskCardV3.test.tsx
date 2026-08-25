/**
 * Task cards v3, Phase 2 — Cozy Coven's ornament (#2033, epic #2027).
 *
 * Three changes, and the first is the one worth a test file of its own: the
 * score moves OUT of the card's private arcane sigil and INTO the shared
 * cauldron #2019 built (`factionMarks/CovenCauldron`). The owner ruling on that
 * issue is that the two surfaces mount ONE vessel — so the assertion that
 * matters is not "a cauldron is drawn here" (a hand-rolled twin would pass
 * that) but "the markup the shared component emits appears verbatim in the
 * card". A fork drifts by one path attribute and this goes red.
 *
 * The seam is the one `factionTaskCardsV2.test.tsx` and `taskCardsV3.test.tsx`
 * already work at: rendered markup via `renderToStaticMarkup`. No jsdom, so
 * geometry is out of reach; what is checkable is which elements exist and which
 * inline declarations they carry, which is all three changes.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

// Imported after the mock is registered.
import CovenTaskCard from '../CovenTaskCard'
import CovenCauldron from '../../factionMarks/CovenCauldron'
import { aTask } from '../../../test/fixtures'

/**
 * The two sizes the card mounts the vessel at, written out rather than imported
 * so the component keeps its `SIZES` private. They are the numbers a reviewer
 * eyeballs, so a change to them SHOULD land here.
 */
const CAULDRON = { desktop: 116, mobile: 100 }

const TASK = aTask({
  description: 'Leave something small and honest where a stranger will find it.',
  in_progress_count: 4,
})

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <CovenTaskCard
        task={TASK}
        basePoints={TASK.point_value}
        multiplier={1}
        inProgressCount={TASK.in_progress_count}
        onSignup={() => {}}
      />
    </MemoryRouter>,
  )
}

describe('the score sits in the SHARED cauldron (#2033, ruling on #2019)', () => {
  it('mounts CovenCauldron verbatim rather than drawing a second vessel', () => {
    mocks.formFactor = 'desktop'
    const mark = renderToStaticMarkup(
      <CovenCauldron
        total={String(TASK.point_value)}
        caption={i18n.t('feed:taskCard.pointsUnit', { count: TASK.point_value })}
        size={CAULDRON.desktop}
      />,
    )
    expect(render()).toContain(mark)
  })

  it('mounts it at the mobile size too, from the same component', () => {
    mocks.formFactor = 'mobile'
    const mark = renderToStaticMarkup(
      <CovenCauldron
        total={String(TASK.point_value)}
        caption={i18n.t('feed:taskCard.pointsUnit', { count: TASK.point_value })}
        size={CAULDRON.mobile}
      />,
    )
    expect(render()).toContain(mark)
    mocks.formFactor = 'desktop'
  })

  it('retires the arcane sigil the cauldron replaces — halo, core and ring', () => {
    mocks.formFactor = 'desktop'
    const html = render()
    // The two discs the design hides when the cauldron arrives. Both tokens
    // survive in index.css: the Coven task-detail and praxis-detail still paint
    // with them, so this is a mount change and not a token deletion.
    expect(html).not.toContain('--faction-coven-slip-sigil-halo')
    expect(html).not.toContain('--faction-coven-slip-sigil-core')
    // The band used to be the third `-sigil-` token's one reader on this card
    // — it grounded on `--faction-coven-slip-sigil-ground`, the WHITE DISC
    // BEHIND THE MARK, which is borrowed paint and is what #2635 took off it.
    // So the card names none of the three now; the band has its own ground.
    expect(html).not.toContain('--faction-coven-slip-sigil-ground')
    expect(html).toContain('--faction-coven-mast')
  })
})

describe("Coven's CTA reads as a rounded box (#2033)", () => {
  it('drops the pill radius while keeping the shared 44px tap floor', () => {
    mocks.formFactor = 'desktop'
    const html = render()
    const button = html.slice(html.indexOf('<button'))
    expect(button).toContain('border-radius:12px')
    expect(button).not.toContain('border-radius:20px')
    expect(button).toContain('min-height:44px')
  })

  it('leaves no rule above it — the braid is the slip’s own tie-off', () => {
    expect(render()).not.toContain('data-cta-rule')
  })
})

describe("Coven's level numeral matches the kit's weight (#2033)", () => {
  /** The numeral's own declaration run — `line-height:0.8` pins it to that span. */
  const numeral = (rung: string) =>
    `font-family:var(--font-faction-serif);font-weight:600;font-size:var(--${rung});line-height:0.8`

  it('is set on the display rung at desktop, as Everymen and Snide are', () => {
    mocks.formFactor = 'desktop'
    expect(render()).toContain(numeral('text-display'))
  })

  it('steps down one rung on mobile rather than staying two behind', () => {
    mocks.formFactor = 'mobile'
    expect(render()).toContain(numeral('text-heading'))
    mocks.formFactor = 'desktop'
  })
})
