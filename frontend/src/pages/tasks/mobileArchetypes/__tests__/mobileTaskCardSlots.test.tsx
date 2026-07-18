/**
 * Mobile task-card content-slot invariant (#589).
 *
 * The sibling `mobileTaskCardDispatch` test only proves each slug resolves to
 * the right component — it never renders one, so it could not catch a broken
 * shared slot. This renders every bespoke mobile task card plus the Default
 * fallback and asserts each still emits its content (title, description,
 * points, level) and that the description carries the two-line clamp mechanics
 * now owned by `cards/shared.tsx`.
 *
 * That clamp assertion is the regression guard: if the shared
 * MobileTaskDescription slot stops applying `-webkit-line-clamp`, or a faction
 * card stops passing its own typography through `style`, these fail.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentType } from 'react'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so the points/level keys resolve to English text.
import '../../../../i18n'
import type { TaskOut } from '../../../../api/tasks'
import { MOBILE_TASK_CARD_BY_SLUG } from '../mobileTaskCard'
import DefaultMobileTaskCard from '../cards/DefaultMobileTaskCard'

type MobileTaskCardProps = { task: TaskOut; points: number }

function task(overrides: Partial<TaskOut> = {}): TaskOut {
  return {
    id: 11,
    title: 'Plant a tree',
    description: 'Dig a hole, put a sapling in it, and water the thing.',
    point_value: 20,
    level_required: 3,
    status: 'open',
    task_type: 'standard',
    created_by: 7,
    primary_faction_slug: 'everymen',
    metatask_faction_slug: null,
    is_task_vision_eligible: true,
    created_at: '2026-01-01T00:00:00Z',
    can_submit_praxis: true,
    allowed_modes: ['solo'],
    eligible_for_current_user: true,
    ...overrides,
  }
}

function render(Card: ComponentType<MobileTaskCardProps>, item: TaskOut) {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <Card task={item} points={item.point_value} />
    </MemoryRouter>,
  )
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

const cards: Record<string, ComponentType<MobileTaskCardProps>> = {
  ...MOBILE_TASK_CARD_BY_SLUG,
  __default__: DefaultMobileTaskCard,
}

describe('mobile task-card content-slot invariant', () => {
  for (const [slug, Card] of Object.entries(cards)) {
    it(`${slug} renders title, description, points and level`, () => {
      const { text } = render(Card, task())
      expect(text, 'title').toContain('Plant a tree')
      expect(text, 'description').toContain('Dig a hole')
      expect(text, 'points').toContain('20')
      expect(text, 'level').toContain('3')
    })

    it(`${slug} clamps its description to two lines`, () => {
      const { html } = render(Card, task())
      expect(html).toContain('-webkit-line-clamp:2')
      expect(html).toContain('-webkit-box')
    })

    it(`${slug} omits the description block entirely when there is none`, () => {
      const { html, text } = render(Card, task({ description: null }))
      expect(text, 'title still renders').toContain('Plant a tree')
      expect(html, 'no empty clamped paragraph').not.toContain('-webkit-line-clamp')
    })
  }
})
