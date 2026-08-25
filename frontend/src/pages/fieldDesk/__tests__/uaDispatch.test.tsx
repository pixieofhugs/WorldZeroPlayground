/**
 * Mobile FieldDesk-home UA dispatch + rendered identity (#525, #852).
 *
 * The registry half asserts the parallel mobile map resolves a `ua` carried life
 * to the UA home skin and that everything else falls through to Default. The
 * rendered half asserts the MARKUP the practice's home emits now the salon is
 * dead (#788): the ensō beside the day's line, the mandala at `texture` behind
 * the masthead only, and no gold anywhere.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so copy keys resolve to English text.
import '../../../i18n'
import { resolveVariant } from '../../../utils/factionDispatch'
import { resolvedArchetype } from '../../../factions/lazyArchetype'
import { surfaceMap } from '../../../factions'
import DefaultFieldDesk from '../mobileArchetypes/DefaultFieldDesk'
import UaFieldDesk from '../mobileArchetypes/UaFieldDesk'
import type { FieldDeskHomeState } from '../useFieldDeskHome'
import { CAST_VOTES_LINK, FIND_TASK_LINK } from '../homeDestinations'
import type { CharacterOut } from '../../../api/auth'
import { aPraxisCard } from '../../../test/fixtures'

const CHARACTER: CharacterOut = {
  id: 42,
  username: 'ada',
  display_name: 'Ada Reed',
  bio: '',
  tagline: '',
  avatar_url: '',
  location: '',
  level: 2,
  score: 340,
  all_time_score: 900,
  faction_slug: 'ua',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  badges: [],
  invitations: [],
}

const ACTIVE_TASK = aPraxisCard({
  task_title: 'Ten thumbnails before breakfast',
  task_point_value: 15,
  task_level_required: 1,
  status: 'in_progress',
  title: null,
  created_by_id: 42,
  created_by_display_name: 'Ada Reed',
  submitted_at: null,
  score: 0,
  points_from_votes: 0,
  task_faction_slug: 'ua',
})

function baseState(overrides: Partial<FieldDeskHomeState> = {}): FieldDeskHomeState {
  return {
    character: CHARACTER,
    eraName: 'Era 1',
    levelTrack: {
      nextLevel: 5,
      pointsToNext: 160,
      currentThreshold: 300,
      nextThreshold: 500,
      pointsIntoLevel: 40,
      levelSpan: 200,
      fillPercent: 20,
    },
    activeTasks: [ACTIVE_TASK],
    pendingRow: { kind: 'clear', count: 0, to: null },
    loadingTasks: false,
    offersACharacterChoice: true,
    ...overrides,
  }
}

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

describe('mobile FieldDesk-home UA dispatch', () => {
  it('mobile + a UA life resolves to the bespoke UA home skin', () => {
    expect(resolvedArchetype(resolveVariant(surfaceMap('mobileFieldDesk'), 'ua'))).toBe(UaFieldDesk)
  })

  it('mobile + any other slug falls through to the Default home skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(resolvedArchetype(resolveVariant(surfaceMap('mobileFieldDesk'), slug))).toBe(DefaultFieldDesk)
    }
  })
})

describe('UA mobile home — what it draws', () => {
  it('heads the screen with the ensō', () => {
    const { html } = render(<UaFieldDesk state={baseState()} />)
    // The one ensō (#908): the vendored brush drawing, painted through a mask.
    expect(html).toContain('/factionMarks/enso.webp')
    expect(html).toContain('var(--faction-ua-glow)')
  })

  it('runs the mandala behind the masthead only', () => {
    const { html } = render(<UaFieldDesk state={baseState()} />)
    // The mandala's outer guide circle; the ensō draws no such hairline stroke.
    expect(html.match(/stroke-width="0\.6"/g)).toHaveLength(1)
    expect(html).toContain('opacity:0.14')
  })

  it('keeps its slots: name, points, the level track, active work and both actions', () => {
    const { html, text } = render(<UaFieldDesk state={baseState()} />)
    expect(text).toContain('Ada Reed')
    expect(text).toContain('340')
    expect(text.toLowerCase()).toContain('era 1')
    expect(text).toContain('Ten thumbnails before breakfast')
    // The stat trio became the level track (#1553): one points figure, a
    // progress rail, and the two figures that bound it.
    expect(text).toContain('Level 2')
    expect(text).toContain('160 to Level 5')
    expect(html).toContain('role="progressbar"')
    // Both verbs now land already narrowed (#1554); proposing lives on /tasks.
    expect(html).toContain(`href="${FIND_TASK_LINK}"`)
    expect(html).toContain(`href="${CAST_VOTES_LINK}"`)
    expect(html).not.toContain('/propose-task')
  })

  it('carries no gold: the legacy --ua-* palette and Cinzel are gone here', () => {
    const { html } = render(<UaFieldDesk state={baseState()} />)
    expect(html).not.toMatch(/--ua-(gold|gilt|paper|wall|line|ink|sub|muted|orange)/)
    expect(html).not.toMatch(/--font-faction-engraved/)
  })
})
