/**
 * The praxis-detail duel card (#1090): three outcome readings, a forfeit from
 * either side, and four states that draw nothing. Rendered through the
 * archetype so the responsive mount is covered too.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { DuelDetailOut } from '../../../api/duel'
import { aDuel, aDuelSide, aPraxis } from '../../../test/fixtures'
import { MEMBER, RIVAL, aPraxisDetailState, indexOf, skinRenderer } from '../../../test/praxisDetail'


const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'desktop' | 'mobile' }))
vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

const { DuelCard } = await import('../DuelCard')


const PRAXIS = aPraxis({

  task_title: 'A Chore Nobody Logged',
  type: 'duel',
  created_by_id: 3,
  created_by_display_name: 'Ada',
  members: [MEMBER],
  score: 30,
  points_from_votes: 18,
  duel_id: 5,
})

/** This page's side, by `praxis_id`. */
const MINE = aDuelSide({ faction_slug: 'coven', points_from_votes: 18 })

const duel = (overrides: Partial<DuelDetailOut> = {}): DuelDetailOut =>
  aDuel({ challenger: MINE, opponent: RIVAL, ...overrides })


const state = (overrides: Partial<PraxisDetailState> = {}): PraxisDetailState =>
  aPraxisDetailState({ praxis: PRAXIS, duel: duel(), ...overrides })

const render = skinRenderer('na', mocks)


describe('duel card — the three readings', () => {
  it('settled: both totals, the margin, and never a decided verdict', () => {
    const { text, html } = render(state())
    expect(text, 'the card label').toContain('The duel')
    // `Ada18`, not `18`: the stamp's `+ 18 from votes` would also match (#1866).
    expect(text, "this side's total").toContain('Ada18')
    expect(text, "the rival's total").toContain('15.4')
    expect(text, 'the leader and the margin').toContain('Ada leads by 2.6')
    expect(text, 'live, not decided').toContain('live')
    expect(text, 'the winner floats until era close (ADR-0011/0052)').toContain(
      'floats with the votes',
    )
    expect(text, 'nothing is final yet').not.toContain('frozen at era close')
    expect(html).toContain('href="/praxis/2"')
    expect(text).toContain('Read their praxis')
  })

  it('settled and level: no leader is named', () => {
    const level = state({
      duel: duel({ opponent: { ...RIVAL, points_from_votes: 18 } }),
    })
    const { text } = render(level)
    expect(text).toContain('Tied')
    expect(text).not.toContain('leads by')
  })

  it('forfeited by the rival: their total is absent, not losing', () => {
    const { text, html } = render(
      state({ duel: duel({ forfeited_by_character_id: RIVAL.character_id }) }),
    )
    expect(text, 'the verdict').toContain('Won by default')
    expect(text, 'this side still stands').toContain('Ada18')
    expect(text, "the forfeiter's total is gone").not.toContain('15.4')
    // 404s (thrown side is `in_progress`); a plain link on purpose.
    expect(html).toContain('href="/praxis/2"')
  })

  it('forfeited by THIS side: the dimmed row is whoever threw it', () => {
    const { text } = render(
      state({ duel: duel({ forfeited_by_character_id: MINE.character_id }) }),
    )
    expect(text).toContain('Won by default')
    expect(text, 'the rival keeps their total').toContain('15.4')
    expect(text, 'this side has none').not.toContain('Ada18')
  })

  it('resolved: the frozen pair and the named winner', () => {
    const { text } = render(
      state({
        duel: duel({
          status: 'resolved',
          winner_character_id: RIVAL.character_id,
          challenger_final_points: 21,
          opponent_final_points: 24.5,
        }),
      }),
    )
    expect(text, 'the frozen figures, not the live ones').toContain('Ada21')
    expect(text).toContain('24.5')
    expect(text).toContain('Rax won')
    expect(text).toContain('frozen at era close')
    expect(text, 'the contest is over — nothing floats').not.toContain('floats with the votes')
  })

  it('resolved as a no-contest: no pair, and the line that says why', () => {
    const { text } = render(
      state({
        duel: duel({
          status: 'resolved',
          winner_character_id: null,
          challenger_final_points: null,
          opponent_final_points: null,
        }),
      }),
    )
    expect(text).toContain('No contest')
    expect(text).toContain('never became votable')
    expect(text, 'no frozen figures exist to print').not.toContain('Ada18')
  })
})

describe('duel card — the states that draw nothing', () => {
  // A declined challenge is no duel at all (ADR-0011).
  it('declined: no card at all', () => {
    const { text } = render(state({ duel: duel({ status: 'declined' }) }))
    expect(text).not.toContain('The duel')
    expect(text).not.toContain('Rax')
    expect(text, 'and no leftover declined narration').not.toContain('declined')
  })

  // Reachable by the author, but the composer owns the run-up (ADR-0059).
  it.each(['pending', 'active'] as const)('%s: no card — the composer owns the run-up', (status) => {
    const { text } = render(state({ duel: duel({ status }) }))
    expect(text).not.toContain('The duel')
    expect(text).not.toContain('Rax')
  })

  it('no duel: no card', () => {
    const { text } = render(state({ duel: null, praxis: { ...PRAXIS, duel_id: null } }))
    expect(text).not.toContain('The duel')
  })
})

/**
 * The `ink` prop contract (#1153), mounted directly. `plate` needs a side with
 * no avatar to draw.
 */
describe('duel card — the ink seam', () => {
  const dressed = () =>
    renderToStaticMarkup(
      <MemoryRouter>
        <DuelCard
          state={state()}
          ink={{
            name: 'var(--test-name)',
            total: 'var(--test-total)',
            muted: 'var(--test-muted)',
            line: 'var(--test-line)',
            plate: 'var(--test-plate)',
          }}
        />
      </MemoryRouter>,
    )

  it('paints every slot a skin hands in', () => {
    const html = dressed()
    expect(html, 'the duellist names').toContain('color:var(--test-name)')
    expect(html, 'the totals').toContain('color:var(--test-total)')
    expect(html, 'the cross-link, the chevron and the verdict').toContain(
      'color:var(--test-muted)',
    )
    expect(html, 'the two hairlines and the rival disc outline').toContain(
      '1px solid var(--test-line)',
    )
    expect(html, 'the fill behind an avatarless duellist').toContain(
      'background:var(--test-plate)',
    )
    // The spectrum ring is the na mark (ADR-0039), not a slot.
    expect(html, 'the spectrum ring is not dressable').toContain('--faction-default-rainbow')
  })

  it('falls back to the na kit when a skin hands in nothing', () => {
    const bare = renderToStaticMarkup(
      <MemoryRouter>
        <DuelCard state={state()} />
      </MemoryRouter>,
    )
    expect(bare, 'names and totals').toContain('color:var(--faction-default-card-text)')
    expect(bare, 'cross-link and verdict').toContain('color:var(--faction-default-card-muted)')
    expect(bare, 'hairlines').toContain('1px solid var(--faction-default-card-line)')
    expect(bare, 'the avatarless disc').toContain('background:var(--faction-default-stamp-bg)')
  })

  it('a partially-filled ink object keeps the defaults it omits', () => {
    // A spread would let an explicit `undefined` erase a default.
    const partial = renderToStaticMarkup(
      <MemoryRouter>
        <DuelCard state={state()} ink={{ name: 'var(--test-name)', total: undefined }} />
      </MemoryRouter>,
    )
    expect(partial).toContain('color:var(--test-name)')
    expect(partial, 'the omitted slots are still the na kit').toContain(
      'color:var(--faction-default-card-text)',
    )
    expect(partial).toContain('color:var(--faction-default-card-muted)')
  })

  it('dressing the card changes nothing about the readings', () => {
    // Theming only (ADR-0064).
    const html = dressed()
    const text = html.replace(/<[^>]*>/g, '')
    expect(text, 'the live reading, whole').toContain('Ada leads by 2.6')
    expect(text).toContain('Ada18')
    expect(text).toContain('15.4')
    const declined = renderToStaticMarkup(
      <MemoryRouter>
        <DuelCard
          state={state({ duel: duel({ status: 'declined' }) })}
          ink={{ name: 'var(--test-name)' }}
        />
      </MemoryRouter>,
    )
    expect(declined, 'a declined challenge draws no card, dressed or not').toBe('')
  })
})

describe('duel card — one card, moved', () => {
  it('rides in the aside on desktop and above the proof on mobile', () => {
    const wide = render(state())
    expect(wide.text.match(/The duel/g)?.length, 'one card on desktop').toBe(1)
    expect(indexOf(wide.html, 'Proof'), 'the aside follows the main column').toBeLessThan(
      indexOf(wide.html, 'The duel'),
    )

    const phone = render(state(), 'mobile')
    expect(phone.text.match(/The duel/g)?.length, 'one card on mobile — not a hidden twin').toBe(1)
    expect(indexOf(phone.html, 'The duel'), 'stacked above the proof').toBeLessThan(
      indexOf(phone.html, 'Proof'),
    )
  })
})
