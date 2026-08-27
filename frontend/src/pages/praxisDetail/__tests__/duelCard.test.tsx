/**
 * The praxis-detail duel card — one test per reading (#1090, epic #1085).
 *
 * Successor to `DuelCrossLink.test.tsx`, which walked a branch per `DuelStatus`.
 * The card narrates OUTCOMES only, so the interesting surface is now much
 * smaller and the deletions are as much of the contract as the renders:
 *
 *  - three readings — live (`settled`), won by default (forfeited), final
 *    (`resolved`, with its no-contest variant);
 *  - a forfeit from EITHER side, since the thrown side can re-cast and land back
 *    on this page as the dimmed row;
 *  - and four states that draw nothing: `declined`, `pending`, `active`, and a
 *    praxis with no duel at all. The declined one is the deliberate change — the
 *    shipped rail drew a declined state and this deletes it.
 *
 * Rendered through the whole archetype rather than the card alone, so the
 * responsive MOUNT (aside on desktop, above the proof on mobile) is guarded by
 * the same file as the copy. Harness note: `renderToStaticMarkup`, no DOM, no
 * effects (SPEC-testing.md), so `useFormFactor` is mocked rather than driven off
 * a viewport.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { DuelDetailOut } from '../../../api/duel'
import { aDuel, aDuelSide, aPraxis } from '../../../test/fixtures'
import { MEMBER, aPraxisDetailState, indexOf, skinRenderer } from '../../../test/praxisDetail'


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

/** This page's side. Its `praxis_id` is what makes it "mine" rather than the rival. */
const MINE = aDuelSide({ faction_slug: 'coven', points_from_votes: 18 })
const RIVAL = aDuelSide({
  praxis_id: 2,
  character_id: 4,
  display_name: 'Rax',
  faction_slug: 'snide',
  points_from_votes: 15.4,
})

const duel = (overrides: Partial<DuelDetailOut> = {}): DuelDetailOut =>
  aDuel({ challenger: MINE, opponent: RIVAL, ...overrides })


const state = (overrides: Partial<PraxisDetailState> = {}): PraxisDetailState =>
  aPraxisDetailState({ praxis: PRAXIS, duel: duel(), ...overrides })

const render = skinRenderer('na', mocks)


describe('duel card — the three readings', () => {
  it('settled: both totals, the margin, and never a decided verdict', () => {
    const { text, html } = render(state())
    expect(text, 'the card label').toContain('The duel')
    // `Ada18`, not `18`: a whole total prints without a decimal now (#1866), so
    // a bare `18` is also satisfied by the score stamp's `+ 18 from votes`
    // higher up the same page. The figure is anchored to the row it belongs to.
    expect(text, "this side's total").toContain('Ada18')
    expect(text, "the rival's total").toContain('15.4')
    expect(text, 'the leader and the margin').toContain('Ada leads by 2.6')
    expect(text, 'live, not decided').toContain('live')
    expect(text, 'the winner floats until era close (ADR-0011/0052)').toContain(
      'floats with the votes',
    )
    expect(text, 'nothing is final yet').not.toContain('frozen at era close')
    // The rival's row is the cross-link, and it points AWAY from this page.
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
    // Absent, not losing: the tally stopped deciding this duel the moment they
    // threw it, so their real figure is gone rather than shown as a loss.
    expect(text, "the forfeiter's total is gone").not.toContain('15.4')
    // The thrown side is back to `in_progress`, so this 404s. It stays a plain
    // link on purpose — it degrades, it does not break the page.
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
  // THE DELIBERATE CHANGE. The shipped rail drew a declined state ("X declined
  // the challenge — this scores as an ordinary praxis"). A declined challenge is
  // no duel at all (ADR-0011): the praxis is an ordinary `type=solo` and takes no
  // duel multiplier, so the page says nothing about one.
  it('declined: no card at all', () => {
    const { text } = render(state({ duel: duel({ status: 'declined' }) }))
    expect(text).not.toContain('The duel')
    expect(text).not.toContain('Rax')
    expect(text, 'and no leftover declined narration').not.toContain('declined')
  })

  // The run-up belongs to the composer's waiting surface (#1071/ADR-0059). It is
  // still reachable here by the AUTHOR — a cast duel side is `submitted`, so
  // ADR-0062's redirect does not catch it — and detail deliberately stays quiet
  // rather than telling the same story a second, thinner way.
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
 * The third dress seam (#1153). `style` and `heading` let a skin set the frame
 * and the label; `ink` is what lets it reach the rows the card draws itself —
 * the duellist names, their totals, the cross-link and the verdict — which
 * stayed `--faction-default-*` inside a fully dressed faction page until now.
 *
 * The card is mounted DIRECTLY here rather than through an archetype, because
 * the thing under test is the prop contract and every archetype passes its own
 * values. `plate` is exercised through a side with no avatar, which is the only
 * state that draws it.
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
    // Not a slot, and deliberately so: the ring on the side this page IS is the
    // spectrum "you are here" mark (ADR-0039), not a faction hue.
    expect(html, 'the spectrum ring is not dressable').toContain('--faction-default-rainbow')
  })

  it('falls back to the na kit when a skin hands in nothing', () => {
    // The regression this seam must not cause: an unregistered faction, and any
    // skin that passes no `ink`, renders exactly what shipped before #1153.
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
    // `{...DEFAULT_INK, ...ink}` would let an explicit `undefined` erase a
    // default; the card resolves field by field instead.
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
    // The seam is theming ONLY (ADR-0064): live / won by default / final, and no
    // card at all on `declined`, are the card's own and are not reachable here.
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
