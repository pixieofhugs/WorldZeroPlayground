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
    // No FIGURE of any kind: the tally line was "{points} pts · {count} votes",
    // and both numbers are gone with it. (The footer's own "log in to vote"
    // prompt survives — this is about the tally, not the control.)
    expect(body).not.toMatch(/\d/)
  })

  // `MobileVoteFooter` had the identical assertion against an identical
  // `VoteUI` call. It is gone with the `mobilePraxisCard` surface (ADR-0067);
  // the desktop case above is what a phone renders now.

  /**
   * #1444 — and no score at all on a praxis that banked none.
   *
   * `ScoreStamp` owns the gate (it is the single mount for every surface that
   * shows a total); this case pins that the CARD BODY actually routes through
   * it, which is the surface the issue reported. ADR-0067 collapsed the mobile
   * card into this same component, so one case covers both form factors.
   */
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

/**
 * #1633 — the byline name was losing a letter against its own portrait.
 *
 * The seam is the NAME LINK's own declaration, and it has to be, because the
 * clip is unobservable in this harness: renderToStaticMarkup gives no DOM, no
 * fonts and no layout, so nothing here can see a glyph get shaved. What these
 * pin is the pair of properties that decides it — how far the clip box runs
 * past the text, and whether the name still yields when it genuinely does not
 * fit. Both halves matter: the second is what the Ephemerists kit's own fix
 * (`overflow: visible`) would have given away.
 */
describe('the byline name is not shaved against its portrait (#1633)', () => {
  const nameLink = (html: string) => html.match(/<a [^>]*>/)?.[0] ?? ''
  const byline = (name: string) =>
    nameLink(render(<PraxisByline praxis={praxis({ created_by_display_name: name })} />))

  it('carries the portrait separation as padding, so the clip box outruns the text', () => {
    // `overflow: hidden` clips at the PADDING box while `text-overflow`
    // measures the CONTENT box. With the 8px living on the row as `gap` the
    // two edges coincided, so a display face's last glyph — the Ephemerists
    // card sets this line in Poiret One — was cut off at the portrait.
    expect(byline('Isolde')).toContain('padding-inline-end:var(--space-sm)')
  })

  it('still yields a long name to an ellipsis rather than over the portrait', () => {
    const link = byline('Bartholomew Featherstonehaugh-Wentworth')
    expect(link).toContain('overflow:hidden')
    expect(link).toContain('text-overflow:ellipsis')
    // The kit patched this to `visible`, which restores min-width:auto to
    // min-content — the name then stops shrinking and paints over the portrait
    // and the faction tag, which is the reported symptom, deliberately caused.
    expect(link).not.toContain('overflow:visible')
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

/**
 * #1833 — the meta line was printing the task's base points beside a stamp
 * printing the same figure as its total: `10 pts` … `10.0 POINTS`, on most
 * cards on the site, because Era 1's multiplier is 1.0 and an unvoted praxis
 * scores exactly its base.
 *
 * The seam is the whole CARD BODY, not the meta slot alone: the defect is a
 * relationship between two slots, so a case that renders only one of them
 * cannot see it. `stampRestatesTaskPoints` is the rule both ends share, and it
 * is #1131's `baseRestatesTotal` reused rather than a second comparison.
 */
describe('the meta line does not restate the stamp (#1833)', () => {
  const body = (over: Partial<PraxisCardOut>) =>
    text(render(<PraxisBody praxis={aPraxisCard(over)} tint="#000" muted="#555" />))

  it('drops the base figure when the stamp already prints it as the total', () => {
    // base 12, nothing else in play → the stamp's total IS 12.
    const html = body({ score: 12, points_from_votes: 0 })
    // `12points` — the stamp's figure with its own unit welded on once the tags
    // are stripped, which is what tells it apart from the band's `12 pts` now
    // that a whole score prints without a decimal (#1866).
    expect(html, 'the stamp still carries the figure').toContain('12points')
    expect(html, 'and the meta line does not repeat it').not.toContain('12 pts')
    // The line keeps its other three segments and their separators.
    expect(html).toContain('L2')
    expect(html).toContain('solo')
  })

  it('keeps both figures once votes move the total off the base', () => {
    // base 12 + 4 from votes = 16: two figures answering two questions.
    const html = body({ score: 16, points_from_votes: 4 })
    expect(html, 'what the task is worth').toContain('12 pts')
    expect(html, 'what this praxis scored').toContain('16points')
  })

  it('keeps the base figure on a praxis with no stamp at all', () => {
    // #1444 gates the stamp off a `failed` praxis, so the meta line is the only
    // points readout left and suppressing it would leave the card silent.
    const html = body({ score: 12, points_from_votes: 0, moderation_status: 'failed' })
    expect(html, 'no total was banked').not.toContain('12points')
    expect(html, 'so what the task is worth stays').toContain('12 pts')
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
  // body that composed the same `MetataskSeal` from the same field; `PraxisBody`
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
