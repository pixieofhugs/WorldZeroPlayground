/**
 * Mobile FieldDesk-home slot invariant: every skin in
 * surfaceMap('mobileFieldDesk') plus Default emits the shared content slots
 * from a hand-built FieldDeskHomeState.
 *
 * The pending row's three states (#1554) are asserted per skin, so a skin
 * can't drift back to its own `{pendingCount > 0 && <Link …>}`. No faction
 * word or vote-count slot (#1553).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { surfaceMap } from '../../../factions'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
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
    canVote: true,
    ...overrides,
  }
}

const archetypes = { ...surfaceMap('mobileFieldDesk'), __default__: DefaultFieldDesk }

/**
 * The row's lead mark is the TASK's sigil (#1711). Probed by difference (a
 * skin draws its own mark elsewhere): the count must move by exactly one.
 * Path geometry is read from `FactionSigil`, not transcribed.
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

/** The open tag of the element that directly holds `text`. */
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
     * #2111 — with one life and the gate shut the switcher is a dead end and a
     * tell (#1560). Same predicate as the desktop roster. Edit stays.
     */
    it(`${slug} hides the CHARACTERS trigger when the roster offers no choice`, () => {
      expect(render(<Skin state={baseState()} />).text, 'a choice to make').toContain('Characters')

      const { html, text } = render(<Skin state={baseState({ offersACharacterChoice: false })} />)
      expect(text, 'one life, shut gate').not.toContain('Characters')
      expect(html, 'the edit link is not the switcher').toContain('href="/characters/42/edit"')
    })

    // #1817
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

    it(`${slug} marks the in-progress row with the TASK's faction`, () => {
      // Inside the test, not module scope: manifests register on import, so an
      // early `sigilPath` would resolve every slug to the fallback.
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
     * #1834: the figure is the praxis `score`, not `task_point_value` (equal
     * until the first vote). Asserted formatted (float noise) and counted once.
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

    /** #1554: hrefs, not just labels; see `homeDestinations.test.ts`. */
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

    /** #3133: absent, not disabled; label and href both checked. */
    it(`${slug} offers no vote action to a viewer below the vote level`, () => {
      const { html, text } = render(<Skin state={baseState({ canVote: false })} />)
      expect(html, 'needs-my-vote link slot').not.toContain(CAST_VOTES_LINK)
      expect(text.toLowerCase(), 'cast-votes slot').not.toContain('cast your votes')
      expect(html, 'eligible-tasks link slot').toContain(`href="${FIND_TASK_LINK}"`)
      expect(text.toLowerCase(), 'find-task slot').toContain('find a task')
    })

    /** #1556: a link here would be an ungated door to a page that 403s. */
    it(`${slug} offers no propose entry point — /tasks owns it`, () => {
      const { html } = render(<Skin state={baseState()} />)
      expect(html, 'propose lives on /tasks now').not.toContain('/propose-task')
    })

    // The pending row's three states (#1554).
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
      // The pill stays as a sentence, but is not a link.
      expect(text, 'caught-up copy').toContain('All caught up')
      expect(html, 'no route out of a caught-up row').not.toContain('/updates')
    })

    it(`${slug} draws no pending row until the panels land`, () => {
      const { text } = render(<Skin state={baseState({ pendingRow: null })} />)
      // Unknown must not render as "All caught up".
      expect(text, 'nothing claimed while loading').not.toContain('All caught up')
    })

    /** #2113: points are never negative, so a `+` says nothing. */
    it(`${slug} prints the row's points as a figure, not a signed delta`, () => {
      const voted = { ...ACTIVE_TASK, score: 47.3 }
      const { text } = render(<Skin state={baseState({ activeTasks: [voted] })} />)
      expect(text, 'the figure still reads').toContain('47.3')
      expect(text, 'and carries no sign').not.toContain('+47.3')
      expect(text, 'nor a spaced one').not.toContain('+ 47.3')
    })

    /**
     * #2112: a title that clips (`overflow: hidden`) may not pin a numeric
     * line-height, or descenders get cut (Lora's box is 1.280em). Wrapping
     * titles are exempt.
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

/** #1817: the heading lives once in `WowPavilionHeader`; twin in the faction suite. */
describe("the WOW crest carries the mobile home's heading (#1817)", () => {
  it('names the carried life, once', () => {
    const { html } = render(<WowFieldDesk state={baseState()} />)
    const heads = h1s(html)
    expect(heads, 'exactly one page heading').toHaveLength(1)
    // The skin greets ("Good morrow, Sir Mollusk."), so match the name only.
    expect(heads[0], 'and it names the carried life').toContain('Mollusk')
  })
})

/**
 * #2580: the HOME kicker and FieldDesk title are gone (owner), and the carried
 * life's name is the one `<h1>` (cf. #1794). Not a visually-hidden
 * "FieldDesk" h1: name what the page is about.
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
