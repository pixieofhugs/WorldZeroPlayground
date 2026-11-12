/** #888 — shared praxis-card chrome: one score, portrait byline, meta line, faction faces. SSR. */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import i18n from '../../../i18n'
import type { PraxisCardOut } from '../../../api/praxis'
import type { TaskOut } from '../../../api/tasks'
import { PraxisByline, PraxisStats, PraxisVoteFooter } from '../shared'
import { PraxisBody } from '../desktop/shared'
import { aPraxisCard } from '../../../test/fixtures'

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
    // One word: seal skins may wrap words in tags, collapsing spaces on strip.
    title: 'Sealmark',
    description: null,
    point_value: 5,
    level_required: 7,
    status: 'active',
    task_type: 'metatask',
    created_by: 3,
    primary_faction_slug: 'snide',
    metatask_faction_slug: 'snide',
    created_at: '2026-01-01T00:00:00Z',
    can_sign_up: false,
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
    // The tally line ("{points} pts · {count} votes") is gone entirely.
    expect(body).not.toMatch(/\d/)
  })

  // One case: the card is one responsive component (ADR-0067).

  /** #1444 — `ScoreStamp` owns the gate; this pins that the card body routes through it. */
  it('stamps a visible praxis and stamps nothing on a failed one', () => {
    const stamped = text(
      render(<PraxisBody praxis={praxis({ moderation_status: 'visible' })} tint="#000" muted="#555" />),
    )
    expect(stamped, 'the total, to one decimal').toContain('12.5')

    const failed = text(
      render(<PraxisBody praxis={praxis({ moderation_status: 'failed' })} tint="#000" muted="#555" />),
    )
    expect(failed, 'a figure nobody banked').not.toContain('12.5')
  })
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
    // The monogram follows the DISPLAY name, not the id.
    expect(html).not.toContain('<img')
    expect(text(html)).toContain('I')
  })

  it('survives a payload with no avatar field at all', () => {
    const stale = praxis({})
    delete (stale as Partial<PraxisCardOut>).created_by_avatar_url
    expect(() => render(<PraxisByline praxis={stale} />)).not.toThrow()
  })
})

/**
 * #1633 — the byline name was losing a letter against its portrait. Unobservable
 * here, so pin the declaration. Wrapping is `displayNameMinContent.test.tsx` (#2132).
 */
describe('the byline name is not shaved against its portrait (#1633, #2309)', () => {
  const nameLink = (html: string) => html.match(/<a [^>]*>/)?.[0] ?? ''
  const byline = (name: string) =>
    nameLink(render(<PraxisByline praxis={praxis({ created_by_display_name: name })} />))

  it('carries the portrait separation as padding on the name itself', () => {
    // Padding, not row `gap`: a display face's last glyph can overhang its
    // advance width. Portrait is on the left (#2309), so it's inline-start.
    expect(byline('Isolde')).toContain('padding-inline-start:var(--space-sm)')
    expect(byline('Bartholomew Featherstonehaugh-Wentworth')).toContain(
      'padding-inline-start:var(--space-sm)',
    )
    expect(byline('Isolde')).not.toContain('padding-inline-end')
  })
})

/** #2309 — owner ruling: portrait LEFT of the name. Source order decides paint order here. */
describe('the byline reads portrait, then name (#2309)', () => {
  const bylineAt = (path: string) =>
    renderToStaticMarkup(
      <MemoryRouter initialEntries={[path]}>
        <PraxisByline
          praxis={praxis({
            created_by_avatar_url: 'avatars/isolde.png',
            created_by_faction_slug: 'coven',
            task_faction_slug: 'ua',
          })}
        />
      </MemoryRouter>,
    )
  // `>Isolde<`: the portrait's `alt` has the same string.
  const nameAt = (html: string) => html.indexOf('>Isolde<')

  it('puts the portrait before the name when the name is a link', () => {
    const html = bylineAt('/praxis/1')
    expect(html, 'the link branch').toContain('<a ')
    expect(nameAt(html), 'the name renders').toBeGreaterThan(-1)
    expect(html.indexOf('<img')).toBeLessThan(nameAt(html))
  })

  it("puts the portrait before the name on the author's own page (#2125)", () => {
    // The plain-text branch is a different element (#2132 was reported on it).
    const html = bylineAt('/characters/7')
    expect(html, 'the plain-text branch').not.toContain('<a ')
    expect(html.indexOf('<img')).toBeLessThan(nameAt(html))
  })

  // #2366 deleted the faction tag; the fixture is off-faction, the only case it rendered.
  it('writes no faction name beside the author (#2366)', () => {
    expect(bylineAt('/praxis/1')).not.toContain('Cozy Coven')
  })
})

describe('the meta line (#888)', () => {
  it('shows the level on a level-0 task, so the segment count never varies', () => {
    const zero = text(render(<PraxisStats praxis={praxis({ task_level_required: 0 })} />))
    const five = text(render(<PraxisStats praxis={praxis({ task_level_required: 5 })} />))
    expect(zero).toContain('L0')
    expect(five).toContain('L5')
    // A ragged meta line across a wall of cards was the bug.
    const separators = (html: string) => (html.match(/·/g) ?? []).length
    expect(separators(zero)).toBe(separators(five))
  })

  it('sits at the top of the label tier, not its 8px floor', () => {
    const html = render(<PraxisStats praxis={praxis({})} />)
    expect(html).toContain('var(--text-xl)')
    expect(html).not.toContain('var(--text-xs)')
  })
})

/**
 * #1833 — meta line printed base points beside a stamp printing the same total.
 * The defect spans two slots, so render the whole body. Shares #1131's rule.
 */
describe("the meta line does not restate the stamp (#1833, widened by #2114)", () => {
  const body = (over: Partial<PraxisCardOut>) =>
    text(render(<PraxisBody praxis={aPraxisCard(over)} tint="#000" muted="#555" />))

  it('drops the base figure when the stamp already prints it as the total', () => {
    const html = body({ score: 12, points_from_votes: 0 })
    // `12points`: the stamp's figure with its unit, unlike the band's `12 pts`.
    expect(html, 'the stamp still carries the figure').toContain('12points')
    expect(html, 'and the meta line does not repeat it').not.toContain(i18n.t('praxis:card.points', { points: 12, count: 12 }))
    expect(html).toContain('L2')
    expect(html).toContain('solo')
  })

  // #2114: a voted stamp prints a BASE row, so no meta figure then either
  // (`headingRoom.test.tsx`).

  it('keeps the base figure on a praxis with no stamp at all', () => {
    // #1444: no stamp on `failed`, so the meta line is the only points readout.
    const html = body({ score: 12, points_from_votes: 0, moderation_status: 'failed' })
    expect(html, 'no total was banked').not.toContain('12points')
    expect(html, 'so what the task is worth stays').toContain(i18n.t('praxis:card.points', { points: 12, count: 12 }))
  })
})

describe('the applied-metatask seal stack (#932)', () => {
  // The seal follows the metatask's ISSUING faction, not the host card's.
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

})

describe('the faction font pair (#888)', () => {
  // #2366 removed the byline's body-face tag; the body face is pinned on the meta line.
  it('threads the display face to the author name', () => {
    const html = render(
      <PraxisByline
        praxis={praxis({ created_by_faction_slug: 'snide' })}
        fonts={{ display: 'var(--faction-snide-card-font)', body: 'var(--faction-snide-font-type)' }}
      />,
    )
    expect(html).toContain('var(--faction-snide-card-font)')
    expect(html, 'and no longer prints anything in the body face').not.toContain(
      'var(--faction-snide-font-type)',
    )
  })

  it('threads the body face to the meta line', () => {
    const html = render(
      <PraxisStats
        praxis={praxis({})}
        fonts={{ display: 'var(--faction-snide-card-font)', body: 'var(--faction-snide-font-type)' }}
      />,
    )
    expect(html).toContain('var(--faction-snide-font-type)')
  })

  it('leaves a slot on its font-* class when an archetype has no opinion', () => {
    const html = render(<PraxisStats praxis={praxis({})} />)
    expect(html).toContain('font-body')
    expect(html).not.toContain('font-family')
  })
})
