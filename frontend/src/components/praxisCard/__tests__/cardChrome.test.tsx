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
 * fonts and no layout, so nothing here can see a glyph get shaved.
 *
 * This block was two cases and is now one. The other half pinned the ellipsis
 * pair (`overflow: hidden` + `text-overflow: ellipsis`) as how the name yields,
 * and #2132 established that the pair bounds only how the name PAINTS: a nowrap
 * string's min-content size is its whole rendered width, so a long name inflated
 * every `min-width: auto` ancestor up to the viewport rather than ellipsizing
 * inside one. The name wraps now, and `components/__tests__/
 * displayNameMinContent.test.tsx` owns that half for both surfaces it broke on.
 *
 * What stays here is the part that is still only about this portrait.
 */
describe('the byline name is not shaved against its portrait (#1633, #2309)', () => {
  const nameLink = (html: string) => html.match(/<a [^>]*>/)?.[0] ?? ''
  const byline = (name: string) =>
    nameLink(render(<PraxisByline praxis={praxis({ created_by_display_name: name })} />))

  it('carries the portrait separation as padding on the name itself', () => {
    // The row deliberately sets no `gap` for this: a display face's last glyph
    // can carry ink past its own advance width — the Ephemerists card sets this
    // line in Poiret One — and the 8px is what gives that overhang somewhere to
    // land instead of being shaved flush against the portrait beside it.
    //
    // #2309 moved the portrait to the name's LEFT, so the same 8px is now the
    // name's INLINE-START padding. It stayed on the name and stayed logical:
    // what it buys is a glyph's overhang, which is a property of the name.
    expect(byline('Isolde')).toContain('padding-inline-start:var(--space-sm)')
    // Still true of a name long enough to reach the portrait, which is the only
    // case where it is observable.
    expect(byline('Bartholomew Featherstonehaugh-Wentworth')).toContain(
      'padding-inline-start:var(--space-sm)',
    )
    // And it is not quietly the old side as well.
    expect(byline('Isolde')).not.toContain('padding-inline-end')
  })
})

/**
 * #2309 — owner ruling on a screenshot of the Ephemerists card: the portrait
 * goes to the LEFT of the name.
 *
 * The seam is `PraxisByline`'s own markup, and it has to be: no DOM and no
 * layout here, so what is observable is source ORDER — which is what decides
 * the painted order inside a plain flex row that sets no `order`.
 */
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
  // `>Isolde<` is the name's own text node: the portrait's `alt` carries the
  // same string, so a bare indexOf would match the img and prove nothing.
  const nameAt = (html: string) => html.indexOf('>Isolde<')

  it('puts the portrait before the name when the name is a link', () => {
    const html = bylineAt('/praxis/1')
    expect(html, 'the link branch').toContain('<a ')
    expect(nameAt(html), 'the name renders').toBeGreaterThan(-1)
    expect(html.indexOf('<img')).toBeLessThan(nameAt(html))
  })

  it("puts the portrait before the name on the author's own page (#2125)", () => {
    // The plain-text branch renders a different element, so the order has to be
    // asserted against it too — one of the two is where #2132 was reported.
    const html = bylineAt('/characters/7')
    expect(html, 'the plain-text branch').not.toContain('<a ')
    expect(html.indexOf('<img')).toBeLessThan(nameAt(html))
  })

  // "leaves the faction tag on the far edge" was here. #2366 deleted the tag —
  // the sigil this fixture's `created_by_faction_slug` already draws inside
  // `FactionAvatar` is the membership statement, and the name beside it was a
  // second copy. The fixture is deliberately left OFF-FACTION (coven author,
  // ua task), which is the only case in which the tag ever rendered, so the
  // two order cases above now also witness its absence.
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
describe("the meta line does not restate the stamp (#1833, widened by #2114)", () => {
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

  // "keeps both figures once votes move the total off the base" was here, and
  // #2114 retired it: a voted stamp prints the base as its own labelled BASE
  // row, so the meta figure was a restatement in that case too — just of a row
  // instead of the total. `headingRoom.test.tsx` holds the wider rule.

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
  // The byline used to carry BOTH faces — the display one on the author name,
  // the body one on the faction tag beside it. #2366 deleted the tag, so the
  // byline is a display-face slot now and the body face is asserted where it
  // still lands: the meta line. The PAIR is what #888 is about, so both halves
  // stay pinned, just at the two slots that consume them.
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
