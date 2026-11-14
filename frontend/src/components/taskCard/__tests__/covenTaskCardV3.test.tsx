/**
 * Coven task card v3 (#2033). The score must mount the SHARED `CovenCauldron`
 * verbatim (owner ruling on #2019) — a hand-rolled twin would pass "a cauldron
 * is drawn", so the assertion is that the component's markup appears in the card.
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

/** Written out, not imported, so `SIZES` stays private; a change SHOULD land here. */
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
  /** `line-height:0.8` pins it to the numeral's span. */
  const numeral = (rung: string) =>
    `font-family:var(--font-faction-spectral);font-size:var(--${rung});line-height:0.8`

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
