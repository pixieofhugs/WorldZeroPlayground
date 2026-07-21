/**
 * UA mobile task card, rendered (#852). The salon is dead: this asserts the
 * MARKUP the card emits, not what the registry points at — the ensō carrying the
 * point value, the orange spine, the practice's tokens, and the absence of both
 * the legacy gold family and the mandala (a task list is the primitive's
 * `absent` case).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so copy keys resolve to English text.
import '../../../../../i18n'
import UaMobileTaskCard from '../UaMobileTaskCard'
import type { TaskOut } from '../../../../../api/tasks'

const TASK: TaskOut = {
  id: 7,
  title: 'Render the old library façade in charcoal',
  description: 'Draw only what the light is doing.',
  point_value: 30,
  level_required: 2,
  status: 'active',
  task_type: 'standard',
  created_by: 3,
  primary_faction_slug: 'ua',
  metatask_faction_slug: null,
  is_task_vision_eligible: false,
  created_at: '2026-01-01T00:00:00Z',
  can_submit_praxis: true,
  allowed_modes: ['solo'],
  eligible_for_current_user: true,
}

const html = renderToStaticMarkup(
  <MemoryRouter>
    <UaMobileTaskCard task={TASK} points={30} />
  </MemoryRouter>,
)
const text = html.replace(/<[^>]*>/g, '')

describe('UA mobile task card', () => {
  it('writes the point value inside the ensō', () => {
    // The heavy sweep of the two-arc sigil (#849) — not the 705 KB textured one.
    expect(html).toContain('M134 41.2 A68 68 0 1 1 66 158.8')
    expect(html).toContain('var(--faction-ua-glow)')
    expect(text).toContain('30')
  })

  it('still fills its slots: title, description, level and faction', () => {
    expect(text).toContain('Render the old library façade in charcoal')
    expect(text).toContain('Draw only what the light is doing.')
    expect(text.toLowerCase()).toContain('lvl 2')
    expect(text).toContain('UA')
  })

  it('draws the spine down the gutter', () => {
    expect(html).toContain('linear-gradient(180deg, transparent, var(--faction-ua), transparent)')
  })

  it('carries no gold: the legacy --ua-* palette is gone from this surface', () => {
    expect(html).not.toMatch(/--ua-(gold|gilt|paper|wall|line|ink|sub|muted|orange)/)
  })

  it('asks the mandala for nothing — a task list is the dense case', () => {
    // The mandala primitive's outer guide circle; the ensō has no such stroke.
    expect(html).not.toContain('stroke-width="0.6"')
  })

  it('paints only in tokens that have a dark value, so the card dims', () => {
    expect(html).toContain('var(--faction-ua-card-bg)')
    expect(html).toContain('var(--faction-ua-rule)')
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })
})
