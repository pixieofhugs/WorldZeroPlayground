/**
 * Mobile FieldDesk-home slot invariant — the home twin of the taskDetail
 * mobileArchetypeSlots test. Walks surfaceMap('mobileFieldDesk') plus the Default
 * mobile home and asserts each skin emits the invariant content slots from the
 * (hand-built) FieldDeskHomeState: the identity block (name + level + era
 * points + the level track + all-time), the active-tasks list, the empty state,
 * and the primary actions. Presentation-only — the skins take state, so no
 * hooks or network are involved.
 *
 * THE PENDING ROW IS A THREE-STATE SLOT (#1554), and every skin has to hold all
 * three: an obligation, other news, and a caught-up row that keeps its shape and
 * stops being a link. The third is asserted per skin rather than once on
 * `PendingRowPill`, because the failure it guards against is a skin quietly
 * going back to its own `{pendingCount > 0 && <Link …>}`.
 *
 * THE FACTION WORD AND THE VOTE COUNT ARE NOT SLOTS ANY MORE (#1553). The
 * identity block dropped "Unaffiliated · Level 4" down to "Level 4" (the art
 * already says the faction) and dropped the votes tile outright — a vote count
 * is an input, not an achievement. A faction assertion here would also have
 * passed for the wrong reason: every skin still names the faction on its
 * active-task rows.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { surfaceMap } from '../../../factions'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so shared copy keys resolve to English text.
import '../../../i18n'
import DefaultFieldDesk from '../mobileArchetypes/DefaultFieldDesk'
import WowFieldDesk from '../mobileArchetypes/WowFieldDesk'
import FactionSigil from '../../../components/sigil/FactionSigil'
import type { FieldDeskHomeState } from '../useFieldDeskHome'
import { CAST_VOTES_LINK, FIND_TASK_LINK, UPDATES_LINK } from '../homeDestinations'
import { REQUESTS_QUEUE_LINK } from '../../updates/requestsQueueAnchor'
import type { CharacterOut } from '../../../api/auth'
import { aPraxisCard } from '../../../test/fixtures'

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

const CHARACTER: CharacterOut = {
  id: 42,
  username: 'molly',
  display_name: 'Mollusk',
  bio: '',
  tagline: '',
  avatar_url: '',
  location: '',
  level: 4,
  score: 340,
  all_time_score: 900,
  faction_slug: 'wow',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  badges: [],
  invitations: [],
}

const ACTIVE_TASK = aPraxisCard({
  task_title: 'Sunday Soup',
  task_point_value: 30,
  task_level_required: 1,
  status: 'in_progress',
  title: null,
  created_by_id: 42,
  created_by_display_name: 'Mollusk',
  submitted_at: null,
  score: 0,
  points_from_votes: 0,
  task_faction_slug: 'wow',
})

function baseState(overrides: Partial<FieldDeskHomeState> = {}): FieldDeskHomeState {
  return {
    character: CHARACTER,
    eraName: 'Era 3',
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
    pendingRow: { kind: 'requests', count: 2, to: REQUESTS_QUEUE_LINK },
    loadingTasks: false,
    offersACharacterChoice: true,
    ...overrides,
  }
}

const archetypes = { ...surfaceMap('mobileFieldDesk'), __default__: DefaultFieldDesk }

/**
 * The lead mark on an in-progress row is the TASK's faction sigil (#1711).
 *
 * Probed by DIFFERENCE rather than by presence: a skin draws its own faction's
 * mark all over its own page (Coven's sparkle rule, WOW's crest), so
 * "the coven sparkle is in the markup" would pass on CovenFieldDesk however the
 * row is drawn. Rendering the same skin twice with two different TASK factions
 * and requiring the count to move by exactly one is the assertion that only
 * holds if the row dispatches on `task_faction_slug`.
 *
 * The mark is identified by its path geometry, taken from `FactionSigil` itself
 * rather than transcribed — a re-drawn sigil moves both sides together, a row
 * that stops asking for one does not.
 */
function sigilPath(slug: string): string {
  const html = renderToStaticMarkup(<FactionSigil slug={slug} />)
  const match = html.match(/ d="([^"]+)"/)
  if (!match) throw new Error(`the ${slug} sigil draws no path to probe`)
  return match[1]
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

/**
 * The open tag of the element that directly holds `text` — the last `<…>` in
 * the markup before it. Every skin renders the task title as the sole child of
 * its title element, so this is that element and its inline style.
 */
function openTagOf(html: string, text: string): string {
  const at = html.indexOf(text)
  if (at < 0) throw new Error(`the skin never printed ${JSON.stringify(text)}`)
  const open = html.lastIndexOf('<', at)
  const close = html.indexOf('>', open)
  return html.slice(open, close + 1)
}

/** The text of every `<h1>` the skin drew, in document order. */
function h1s(html: string): string[] {
  return [...html.matchAll(/<h1\b[^>]*>(.*?)<\/h1>/gs)].map((m) => m[1].replace(/<[^>]*>/g, '').trim())
}

function withTaskFaction(slug: string): FieldDeskHomeState {
  return baseState({ activeTasks: [{ ...ACTIVE_TASK, task_faction_slug: slug }] })
}

describe('mobile FieldDesk-home content-slot invariant', () => {
  for (const [slug, Skin] of Object.entries(archetypes)) {
    it(`${slug} renders the identity block`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(text, 'character name slot').toContain('Mollusk')
      expect(text, 'level slot').toContain('Level 4')
      expect(text, 'points/score slot').toContain('340')
      expect(text, 'era slot').toContain('Era 3')
      expect(text, 'all-time slot').toContain('900')
      expect(html, 'profile link slot').toContain('href="/characters/42"')
      expect(html, 'edit link slot').toContain('href="/characters/42/edit"')
    })

    /**
     * #1817 — every home opens its outline at level 1, one heading only.
     *
     * WOW had no `<h1>` at all: its name sits in the shared `WowPavilionHeader`,
     * which drew it in a plain `<div>`. Same defect #1794 fixed on desktop, from
     * a different cause, so it survived that fix. Asserted as a COUNT because
     * the seven other skins head the page with a masthead and WOW with the
     * carried life's name — the text is the skin's, the level is not.
     */
    /**
     * #2111 — the CHARACTERS pill is a door to a room that can be empty.
     *
     * It opens `CharacterSwitcherSheet`, which is the account's ROSTER. With one
     * life and the era's second-character gate shut, that roster holds nothing
     * but the life already being carried and the sheet has no create button
     * either, so the pill is two taps to a dead end — and, worse, a tell that
     * there is something here you cannot have yet (#1560). The desktop roster
     * section answers the same predicate, so the two cannot disagree.
     *
     * The EDIT pill beside it is NOT part of this: editing the carried life is
     * always available, and it is the action the sheet's own duplicate link was
     * deleted in favour of.
     */
    it(`${slug} hides the CHARACTERS trigger when the roster offers no choice`, () => {
      expect(render(<Skin state={baseState()} />).text, 'a choice to make').toContain('Characters')

      const { html, text } = render(<Skin state={baseState({ offersACharacterChoice: false })} />)
      expect(text, 'one life, shut gate').not.toContain('Characters')
      expect(html, 'the edit link is not the switcher').toContain('href="/characters/42/edit"')
    })

    it(`${slug} opens the outline with exactly one h1`, () => {
      const { html } = render(<Skin state={baseState()} />)
      expect(h1s(html)).toHaveLength(1)
    })

    it(`${slug} renders the level track`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(html, 'progress track slot').toContain('role="progressbar"')
      expect(html, 'fill width slot').toContain('width:20%')
      expect(text, 'to-next-level slot').toContain('160 to Level 5')
    })

    it(`${slug} holds the track back until the era curve lands`, () => {
      const { html, text } = render(<Skin state={baseState({ levelTrack: null })} />)
      expect(html, 'no progressbar without a target').not.toContain('role="progressbar"')
      expect(text, 'points figure still reads').toContain('340')
    })

    it(`${slug} renders the active-tasks list (continue link)`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(text, 'active task title slot').toContain('Sunday Soup')
      expect(html, 'continue-in-progress slot').toContain('href="/praxis/55/edit"')
    })

    /**
     * #1711. Five skins marked the row with their OWN fixed accent (a red
     * square, an acid square, an ochre square, a gilt sparkle) and three drew
     * no faction mark at all; only Default's dot tracked the task. The mark now
     * says the same true thing on all eight.
     */
    it(`${slug} marks the in-progress row with the TASK's faction`, () => {
      // Probed inside the test, not at module scope: the faction manifests
      // register as their modules evaluate, and a `sigilPath` call during this
      // file's own import would resolve every slug to the fallback.
      const COVEN_MARK = sigilPath('coven')
      const SNIDE_MARK = sigilPath('snide')
      const coven = render(<Skin state={withTaskFaction('coven')} />).html
      const snide = render(<Skin state={withTaskFaction('snide')} />).html
      expect(
        occurrences(coven, COVEN_MARK),
        'a coven task draws the coven mark',
      ).toBe(occurrences(snide, COVEN_MARK) + 1)
      expect(
        occurrences(snide, SNIDE_MARK),
        'a snide task draws the snide mark',
      ).toBe(occurrences(coven, SNIDE_MARK) + 1)
    })

    /**
     * #1834. The row is a PRAXIS, so its figure is the praxis's `score` — what
     * the player has actually earned — not `task_point_value`, the task's base
     * worth. The two agree until the first vote lands, which is why eight skins
     * read the wrong field for so long: equal fixtures hide it.
     *
     * A score is a weighted sum and carries float noise, so the assertion is on
     * the FORMATTED figure, and on its COUNT: WOW printed the same number twice
     * in one row (once in the meta line, once as the gilt ✦ figure), and
     * "the row contains the score" passes for that too.
     */
    it(`${slug} meters the in-progress row by the praxis's score, not the task's worth`, () => {
      const voted = { ...ACTIVE_TASK, task_point_value: 88, score: 47.300000000000004 }
      const { text } = render(<Skin state={baseState({ activeTasks: [voted] })} />)
      expect(occurrences(text, '47.3'), 'the earned score, printed once').toBe(1)
      expect(text, 'no raw float arithmetic noise').not.toContain('0000')
      expect(text, "the task's base worth is not this row's figure").not.toContain('88')
    })

    it(`${slug} renders the empty state when no active tasks`, () => {
      const { text } = render(<Skin state={baseState({ activeTasks: [] })} />)
      expect(text.toLowerCase(), 'empty-tasks slot').toContain('nothing in progress')
    })

    /**
     * #1554: both CTAs land on an ALREADY-NARROWED view. The hrefs are asserted
     * rather than the labels alone because "Find a Task" pointing at the whole
     * catalogue renders identically to one that works — see
     * `homeDestinations.test.ts`, which proves the two query strings actually
     * turn the axes on at the destination.
     */
    it(`${slug} lands its primary action on the tasks it can sign up for`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(text.toLowerCase(), 'find-task slot').toContain('find a task')
      expect(html, 'eligible-tasks link slot').toContain(`href="${FIND_TASK_LINK}"`)
    })

    it(`${slug} lands its secondary action on praxes awaiting this vote`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(text.toLowerCase(), 'cast-votes slot').toContain('cast your votes')
      expect(html, 'needs-my-vote link slot').toContain(`href="${CAST_VOTES_LINK}"`)
    })

    /**
     * Proposing has ONE home and it is `/tasks` (#1556 + this issue). The
     * assertion is on the route, not the label: a link left here would be a
     * second, ungated entry point to a page that 403s the viewer it lets in.
     */
    it(`${slug} offers no propose entry point — /tasks owns it`, () => {
      const { html } = render(<Skin state={baseState()} />)
      expect(html, 'propose lives on /tasks now').not.toContain('/propose-task')
    })

    // ── the pending row's three states (#1554) ──────────────────────────────
    it(`${slug} points the pending row at the requests queue`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(text, 'requests copy').toContain('2 pending requests')
      expect(html, 'queue anchor').toContain(`href="${REQUESTS_QUEUE_LINK}"`)
    })

    it(`${slug} points the pending row at unfiltered Updates when only news waits`, () => {
      const { html, text } = render(
        <Skin state={baseState({ pendingRow: { kind: 'notifications', count: 0, to: UPDATES_LINK } })} />,
      )
      expect(text, 'activity copy').toContain('New activity')
      expect(html, 'unfiltered updates').toContain(`href="${UPDATES_LINK}"`)
    })

    it(`${slug} dead-ends the pending row rather than linking nowhere`, () => {
      const { html, text } = render(
        <Skin state={baseState({ pendingRow: { kind: 'clear', count: 0, to: null } })} />,
      )
      // The pill STAYS — it is a sentence, not a control that got hidden.
      expect(text, 'caught-up copy').toContain('All caught up')
      // ...and it is not a link at all. A pill that still looks pressable and
      // goes nowhere is worse than no pill, so neither Updates href survives.
      expect(html, 'no route out of a caught-up row').not.toContain('/updates')
    })

    it(`${slug} draws no pending row until the panels land`, () => {
      const { text } = render(<Skin state={baseState({ pendingRow: null })} />)
      // Zero-because-unknown must not render as "All caught up" over a queue
      // with four invites in it, then swap under the reader.
      expect(text, 'nothing claimed while loading').not.toContain('All caught up')
    })

    /**
     * #2113 — the row's figure is a QUANTITY, not a signed delta. Points cannot
     * be negative (`backend/services/scoring.py:50` — every term in
     * `compute_praxis_score` is non-negative), so a leading `+` distinguished
     * nothing. Asserted on the row rather than on the catalog string so a skin
     * that goes back to writing its own `+{formatPoints(...)}` fails too.
     */
    it(`${slug} prints the row's points as a figure, not a signed delta`, () => {
      const voted = { ...ACTIVE_TASK, score: 47.3 }
      const { text } = render(<Skin state={baseState({ activeTasks: [voted] })} />)
      expect(text, 'the figure still reads').toContain('47.3')
      expect(text, 'and carries no sign').not.toContain('+47.3')
      expect(text, 'nor a spaced one').not.toContain('+ 47.3')
    })

    /**
     * #2112 — the `y` and `p` of an in-progress title were cut off at the
     * bottom. The cause is the pair, not either half: the title is a
     * single-line `.truncate` (`overflow: hidden`, which ellipsis requires) AND
     * it pinned a line-height under its own font's content box, so the tails
     * sat outside the box the overflow then clipped. Measured from the shipped
     * woff2 metrics — Lora's content box is 1.280em against a line-height of
     * 1.2, and its `y` inks to 0.271em below the baseline against a box floor
     * of 0.234em.
     *
     * The invariant is therefore: a title that CLIPS may not pin a number.
     * `line-height: normal` is the font's own content box, which is per-face
     * correct without a magic number per skin and stays correct while the
     * webfont is still loading and a fallback with different metrics is drawn.
     * WOW is exempt by the same rule read forwards — its title wraps
     * (`overflow-wrap: anywhere`) instead of clipping, so nothing cuts it.
     */
    it(`${slug} leaves room for the descenders of a clipped title`, () => {
      const { html } = render(<Skin state={baseState()} />)
      const tag = openTagOf(html, ACTIVE_TASK.task_title)
      if (!/\btruncate\b|overflow:\s*hidden/.test(tag)) return
      expect(
        tag,
        'a clipped title takes the font\'s own line box, not a tighter number',
      ).not.toMatch(/line-height:\s*[\d.]/)
    })
  }
})

/**
 * #1817 — the crest's heading is fixed ONCE, in `WowPavilionHeader`, and two
 * pages depend on that one change. The count invariant above catches the home;
 * this pins WHAT the home's heading says, and its twin in the faction-page
 * suite pins the other consumer, so a later change that re-splits the fix into
 * two per-page headings cannot pass both.
 */
describe("the WOW crest carries the mobile home's heading (#1817)", () => {
  it('names the carried life, once', () => {
    const { html } = render(<WowFieldDesk state={baseState()} />)
    const heads = h1s(html)
    expect(heads, 'exactly one page heading').toHaveLength(1)
    // The skin greets rather than labels ("Good morrow, Sir Mollusk."), so the
    // assertion is on the name inside the salutation, not the whole string.
    expect(heads[0], 'and it names the carried life').toContain('Mollusk')
  })
})

/**
 * THE PAGE HEADS ITSELF WITH THE CARRIED LIFE (#2580).
 *
 * Every mobile skin opened with an app-bar row nobody needed: a `HOME` kicker
 * naming the page you were already standing on — the bottom nav already marks
 * that tab — over a `FieldDesk` title naming it again. The owner asked for both
 * to go.
 *
 * Deleting the title element is not the whole job, and this is the guard that
 * says so. Each skin had exactly ONE `<h1>` and it was that title, so a plain
 * deletion would leave seven pages with no level-1 heading at all — which is
 * precisely the defect #1794 was filed and fixed for on the desktop FieldDesk.
 * The resolution follows the ruling already in `pages/FieldDesk.tsx`: with the
 * roster hidden the page is not asking whose shoes, its subject is the life
 * being carried, so the heading names it. No new string — the name is data
 * already on the page.
 *
 * `WowFieldDesk` is the precedent rather than an exception. Its crest has drawn
 * the carried life as an unconditional `<h1>` since #1817 and has never had the
 * eyebrow, so it must pass this unchanged.
 *
 * A visually-hidden `<h1>` carrying "FieldDesk" was considered and rejected: it
 * keeps a dead word alive in the accessibility tree only, which is worse than
 * naming the subject the page is actually about.
 */
describe('mobile FieldDesk home — the carried life is the h1 (#2580)', () => {
  const HOME_KICKER = 'Home'
  const PAGE_TITLE = 'FieldDesk'

  for (const [slug, Skin] of Object.entries(archetypes)) {
    it(`${slug} heads the page with the character, exactly once`, () => {
      const { html } = render(<Skin state={baseState()} />)

      const h1s = html.match(/<h1[\s>]/g) ?? []
      expect(h1s.length, `${slug} draws exactly one <h1>`).toBe(1)

      const open = html.indexOf('<h1')
      const inner = html.slice(open, html.indexOf('</h1>', open))
      expect(inner, `${slug}'s h1 names the carried life`).toContain(
        CHARACTER.display_name,
      )
      expect(inner, `${slug}'s h1 is not the page's own name`).not.toContain(PAGE_TITLE)
    })

    it(`${slug} draws neither the kicker nor the page title`, () => {
      const { text } = render(<Skin state={baseState()} />)
      expect(text, `${slug} dropped the HOME kicker`).not.toContain(HOME_KICKER)
      expect(text, `${slug} dropped the FieldDesk title`).not.toContain(PAGE_TITLE)
    })
  }
})
