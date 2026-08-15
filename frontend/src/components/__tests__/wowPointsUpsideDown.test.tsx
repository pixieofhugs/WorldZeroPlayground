/**
 * Warriors of Whimsy hang their points upside down (#1716) — an owner ruling,
 * deliberate whimsy rather than a defect.
 *
 * Two BROWSING marks turn: the task card's crowned gilt plaque and the praxis
 * card's total. The CHECKING surfaces — task detail, praxis detail, the
 * composer's waiting slip — stay upright, and that split is the whole reason
 * this file exists, because the stamp is ONE component (ADR-0049) mounted on
 * all three. So the flip is set by the MOUNT through an inherited custom
 * property (`--wow-total-flip`, the `--praxis-card-basis` shape from #1137),
 * never by a variant prop; unset resolves to `0deg` and renders exactly what it
 * rendered before.
 *
 * The a11y contract is the other half. A rotation is a TRANSFORM on the
 * presentation: the characters keep their reading order in the DOM, so the
 * numeral is still announced correctly and still selectable. Every case below
 * pins the literal digits inside the turned element for exactly that reason —
 * a skin that "flips" by reversing or substituting characters passes an
 * eyeball check and fails here.
 *
 * Harness: `renderToStaticMarkup`, no DOM, no effects (SPEC-testing.md).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'
import type { TaskOut } from '../../api/tasks'
import type { PraxisCardOut } from '../../api/praxis'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))
vi.mock('../../hooks/useFormFactor', () => ({ useFormFactor: () => mocks.formFactor }))

// Imported after the mock so the card picks it up.
const { default: WowTaskCard } = await import('../taskCard/WowTaskCard')
const { default: WowScoreStamp } = await import('../praxisCard/scoreStamp/WowScoreStamp')
const { WowPraxisCard } = await import('../praxisCard/desktop/WowPraxisCard')

const TASK: TaskOut = {
  id: 7,
  title: 'Photosynthesis',
  description: '',
  point_value: 18,
  level_required: 2,
  status: 'active',
  task_type: 'standard',
  created_by: 3,
  primary_faction_slug: 'wow',
  metatask_faction_slug: null,
  created_at: '2026-01-01T00:00:00Z',
  created_by_display_name: '',
  created_by_avatar_url: '',
  created_by_faction_slug: null,
  created_by_level: 0,
  signup_reason: null,
  in_progress_count: 0,
  can_sign_up: true,
  allowed_modes: ['solo'],
  eligible_for_current_user: true,
}

const PRAXIS: PraxisCardOut = {
  id: 1,
  created_by_id: 7,
  created_by_display_name: 'Isolde',
  created_by_faction_slug: 'wow',
  created_by_avatar_url: '',
  task_faction_slug: 'wow',
  task_title: 'Photosynthesis',
  task_level_required: 2,
  task_point_value: 12,
  display_multiplier: 1,
  metatask_points: 0,
  points_from_votes: 4,
  habit_bonus_points: 0,
  member_count: 1,
  score: 13.6,
  voter_count: 3,
  moderation_status: 'visible',
  is_top_for_task: false,
  applied_metatasks: [],
} as unknown as PraxisCardOut

const render = (node: ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

/**
 * The turned element, with its digits still inside it and still in order.
 * Written as one regex rather than two `toContain`s on purpose: "the markup
 * contains a 180deg rotation somewhere" and "the numeral reads 18" are both
 * true of a card that turned the wrong box.
 */
const turnedNumeral = (figure: string) =>
  new RegExp(`<span style="[^"]*transform:rotate\\(180deg\\)[^"]*">${figure}</span>`)

/** The same shape for the stamp, whose angle is deferred to its mount. */
const flippableNumeral = (figure: string) =>
  new RegExp(
    `<span style="[^"]*transform:rotate\\(var\\(--wow-total-flip, 0deg\\)\\)[^"]*">${figure}</span>`,
  )

describe('the WOW task card hangs its points plaque numeral upside down (#1716)', () => {
  for (const formFactor of ['desktop', 'mobile'] as const) {
    it(`turns the numeral and keeps the plaque's two-degree tilt — ${formFactor}`, () => {
      mocks.formFactor = formFactor
      const html = render(
        <WowTaskCard task={TASK} basePoints={18} multiplier={1} inProgressCount={0} />,
      )

      // The whimsy: the figure itself, turned in place.
      expect(html).toMatch(turnedNumeral('18'))
      // The plaque's own strike survives — this composes with it, on a
      // separate element, rather than replacing it.
      expect(html).toContain('transform:rotate(-2deg)')
      // ...and the plaque is still the thing wearing the tilt, not the numeral.
      expect(html).not.toContain('rotate(-2deg) rotate(180deg)')
      mocks.formFactor = 'desktop'
    })
  }

  it('turns nothing else on the card', () => {
    const html = render(
      <WowTaskCard task={TASK} basePoints={18} multiplier={1} inProgressCount={4} />,
    )
    expect(html.match(/rotate\(180deg\)/g)).toHaveLength(1)
  })
})

describe('the WOW praxis CARD turns its total; the shared stamp defaults upright (#1716)', () => {
  it('the stamp reads the flip off its mount and resolves to 0deg unset', () => {
    const bare = renderToStaticMarkup(<WowScoreStamp praxis={PRAXIS} />)
    // The figure is inside the turned element, digits in reading order.
    expect(bare).toMatch(flippableNumeral('13\\.6'))
    // The fallback is today's render: a stamp nobody flips is upright, which is
    // what the praxis detail and the composer's waiting slip mount.
    expect(bare).not.toContain('180deg')
    // The stamp's own two-degree strike is untouched.
    expect(bare).toContain('transform:rotate(-2deg)')
  })

  it('the card mount sets the flip', () => {
    const html = render(
      <WowPraxisCard
        praxis={PRAXIS}
        adminProps={{
          praxis: PRAXIS,
          showAdminControls: false,
          onHide: () => {},
          onFail: () => {},
          moderateError: null,
        }}
        showCrown
      />,
    )
    expect(html).toContain('--wow-total-flip:180deg')
    // And the figure is still the figure: 13.6, in that order, in the DOM.
    expect(html.replace(/<[^>]*>/g, '')).toContain('13.6')
  })
})
