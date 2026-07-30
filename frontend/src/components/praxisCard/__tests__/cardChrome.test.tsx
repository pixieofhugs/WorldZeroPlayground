/**
 * #888 — the shared praxis-card chrome: one score, a portrait byline, a legible
 * meta line, and the faction's own typefaces.
 *
 * SSR-rendered in isolation with the real i18n catalog. No effects run here, so
 * these pin markup and copy, not interaction.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import '../../../i18n'
import type { PraxisCardOut } from '../../../api/praxis'
import type { TaskOut } from '../../../api/tasks'
import { PraxisByline, PraxisStats, PraxisVoteFooter } from '../shared'
import { PraxisBody } from '../desktop/shared'

function praxis(overrides: Partial<PraxisCardOut>): PraxisCardOut {
  return {
    id: 1,
    created_by_id: 7,
    created_by_display_name: 'Isolde',
    created_by_faction_slug: 'ua',
    created_by_avatar_url: '',
    task_faction_slug: 'ua',
    task_level_required: 0,
    task_point_value: 5,
    member_count: 1,
    score: 12.5,
    voter_count: 3,
    applied_metatasks: [],
    ...overrides,
  } as PraxisCardOut
}

function metatask(overrides: Partial<TaskOut>): TaskOut {
  return {
    id: 99,
    // A unique single-word title: seal skins may wrap multi-word titles in
    // per-word tags, so stripping markup would collapse the inter-word spaces.
    title: 'Sealmark',
    description: null,
    point_value: 5,
    level_required: 7,
    status: 'active',
    task_type: 'metatask',
    created_by: 3,
    primary_faction_slug: 'snide',
    metatask_faction_slug: 'snide',
    is_task_vision_eligible: false,
    created_at: '2026-01-01T00:00:00Z',
    can_submit_praxis: false,
    allowed_modes: [],
    eligible_for_current_user: false,
    ...overrides,
  } as TaskOut
}

const render = (node: ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

const text = (html: string) => html.replace(/<[^>]*>/g, '')

describe('one score per card (#888, closes #663)', () => {
  it('the byline no longer states the total', () => {
    const body = text(render(<PraxisByline praxis={praxis({ score: 12.5 })} />))
    expect(body).toContain('Isolde')
    expect(body).not.toContain('12.5')
  })

  it('the desktop vote footer states no points and no vote count', () => {
    const body = text(render(<PraxisVoteFooter praxis={praxis({})} />))
    expect(body).not.toMatch(/\bpts\b/)
    // No FIGURE of any kind: the tally line was "{points} pts · {count} votes",
    // and both numbers are gone with it. (The footer's own "log in to vote"
    // prompt survives — this is about the tally, not the control.)
    expect(body).not.toMatch(/\d/)
  })

  // `MobileVoteFooter` had the identical assertion against an identical
  // `VoteUI` call. It is gone with the `mobilePraxisCard` surface (ADR-0067);
  // the desktop case above is what a phone renders now.
})

describe('the byline portrait (#888)', () => {
  it('renders the author portrait when they have one', () => {
    const html = render(
      <PraxisByline praxis={praxis({ created_by_avatar_url: 'avatars/isolde.png' })} />,
    )
    expect(html).toContain('avatars/isolde.png')
  })

  it('degrades to the shared monogram avatar when they have none', () => {
    const html = render(<PraxisByline praxis={praxis({ created_by_avatar_url: '' })} />)
    // No <img>, and the monogram follows the DISPLAY name, not the id.
    expect(html).not.toContain('<img')
    expect(text(html)).toContain('I')
  })

  it('survives a payload with no avatar field at all', () => {
    const stale = praxis({})
    delete (stale as Partial<PraxisCardOut>).created_by_avatar_url
    expect(() => render(<PraxisByline praxis={stale} />)).not.toThrow()
  })
})

describe('the meta line (#888)', () => {
  it('shows the level on a level-0 task, so the segment count never varies', () => {
    const zero = text(render(<PraxisStats praxis={praxis({ task_level_required: 0 })} />))
    const five = text(render(<PraxisStats praxis={praxis({ task_level_required: 5 })} />))
    expect(zero).toContain('L0')
    expect(five).toContain('L5')
    // The separator count is the shape being pinned: a ragged meta line across a
    // wall of cards was the bug, not the missing level per se.
    const separators = (html: string) => (html.match(/·/g) ?? []).length
    expect(separators(zero)).toBe(separators(five))
  })

  it('sits at the top of the label tier, not its 8px floor', () => {
    const html = render(<PraxisStats praxis={praxis({})} />)
    expect(html).toContain('var(--text-xl)')
    expect(html).not.toContain('var(--text-xs)')
  })
})

describe('the applied-metatask seal stack (#932)', () => {
  // A WOW card carrying a Snide-issued metatask: the seal follows the metatask's
  // ISSUING faction, not the host card's. Every seal skin prints the title.
  const snideSeal = metatask({ metatask_faction_slug: 'snide' })

  it('the desktop body renders a seal below the score when a metatask is applied', () => {
    const html = render(
      <PraxisBody
        praxis={praxis({ created_by_faction_slug: 'wow', applied_metatasks: [snideSeal] })}
        tint="#000"
        muted="#555"
      />,
    )
    expect(text(html)).toContain('Sealmark')
  })

  it('the desktop body renders no seal when nothing is applied', () => {
    const html = render(
      <PraxisBody praxis={praxis({ applied_metatasks: [] })} tint="#000" muted="#555" />,
    )
    expect(text(html)).not.toContain('Sealmark')
  })

  // The two `MobilePraxisBody` cases are gone with the `mobilePraxisCard`
  // surface (ADR-0067). They asserted the same seal placement against a second
  // body that composed the same `MetaTaskSeal` from the same field; `PraxisBody`
  // above is now the only anatomy, on both form factors.
})

describe('the faction font pair (#888)', () => {
  it('threads the display face to the author name and the body face beside it', () => {
    const html = render(
      <PraxisByline
        praxis={praxis({ created_by_faction_slug: 'snide' })}
        fonts={{ display: 'var(--faction-snide-card-font)', body: 'var(--faction-snide-font-type)' }}
      />,
    )
    expect(html).toContain('var(--faction-snide-card-font)')
    expect(html).toContain('var(--faction-snide-font-type)')
  })

  it('leaves a slot on its font-* class when an archetype has no opinion', () => {
    const html = render(<PraxisStats praxis={praxis({})} />)
    expect(html).toContain('font-body')
    expect(html).not.toContain('font-family')
  })
})
