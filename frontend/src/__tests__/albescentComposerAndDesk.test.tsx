/**
 * Albescent's composer and phone home are WRAPPERS of na (#2505, ADR-0048):
 * markup must equal na's apart from one decorative layer; a presence check
 * would pass a full fork.
 *
 * Also the legibility guard: the composer's quiet tier is already ~3:1 on na's
 * ground (#2485), so no bloom behind the text; the tell lives at the edge.
 *
 * One carrier per object (#2519): a 3px full-strength border, with na's own
 * mark removed. Width, strength and the old bar are asserted on the stylesheet,
 * since a render can't tell them apart.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import '../i18n'
import { stripComments } from '../utils/__tests__/cssVars'
import DefaultEditPraxis from '../pages/editPraxis/archetypes/DefaultEditPraxis'
import AlbescentEditPraxis from '../pages/editPraxis/archetypes/AlbescentEditPraxis'
import DefaultFieldDesk from '../pages/fieldDesk/mobileArchetypes/DefaultFieldDesk'
import AlbescentFieldDesk from '../pages/fieldDesk/mobileArchetypes/AlbescentFieldDesk'
import { anEditPraxisState } from '../test/fixtures'
import type { FieldDeskHomeState } from '../pages/fieldDesk/useFieldDeskHome'
import type { PraxisOut } from '../api/praxis'
import type { TaskOut } from '../api/tasks'
import type { CharacterOut } from '../api/auth'
import { aPraxisCard } from '../test/fixtures'
import { REQUESTS_QUEUE_LINK } from '../pages/updates/requestsQueueAnchor'
import { readIndexCss } from '../test/indexCss'

const read = (path: string) =>
  stripComments(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8'))
const INDEX = stripComments(readIndexCss())
const MOTION = read('../motion.ornament.css')

const html = (node: React.ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

const occurrences = (haystack: string, needle: string) =>
  haystack.split(needle).length - 1

/* ── the composer ───────────────────────────────────────────────────────── */

const TASK = {
  id: 7,
  title: 'Ferry the recycling to the depot',
  description: 'Haul the crates down and come back lighter.',
  point_value: 20,
  level_required: 2,
  status: 'active',
  task_type: 'standard',
  allowed_modes: ['solo', 'collab', 'duel'],
} as unknown as TaskOut

const PRAXIS = {
  id: 55,
  task_id: 7,
  task_title: 'Ferry the recycling to the depot',
  type: 'solo',
  status: 'in_progress',
  title: 'Two crates and a wobbly trolley',
  body_text: '## What I did\n\nWheeled them down.',
  moderation_status: 'visible',
  duel_id: null,
  members: [],
  invites: [],
  media_items: [],
} as unknown as PraxisOut

/** Every optional region open, so the comparison covers the whole page. */
const composerState = () =>
  anEditPraxisState({
    praxis: PRAXIS,
    task: TASK,
    // Not PRAXIS.title: that is nullable, the draft title isn't.
    title: 'Two crates and a wobbly trolley',
    body: '## What I did\n\nWheeled them down.',
    autoSubmitDays: 10,
    showInviteBox: true,
    showSealStack: true,
    duelChipVisible: true,
  })

describe('AlbescentEditPraxis is DefaultEditPraxis under one class (#2553)', () => {
  it("mounts NO second frame — na's 3px sheet border is the carrier", () => {
    // #2553: a ring would be clipped to the padding box (`overflow: clip`),
    // drawing a second frame inside na's; na's frame is the survivor.
    const state = composerState()
    const albescent = html(<AlbescentEditPraxis state={state} />)
    expect(occurrences(albescent, 'alb-composer-edge')).toBe(0)
    // Byte-identical to na apart from the cascade handle (ADR-0083 §1).
    expect(albescent).toBe(
      `<div class="alb-composer">${html(<DefaultEditPraxis state={state} />)}</div>`,
    )
  })

  it("leaves na's sheet frame as the one 3px spectrum on the sheet (#2520)", () => {
    // Same idiom and width as the task card.
    const albescent = html(<AlbescentEditPraxis state={composerState()} />)
    expect(albescent).toContain('border:3px solid transparent')
    expect(albescent).toContain('background-origin:border-box')
  })

  it('na renders no ornament at all when the slot is left empty', () => {
    expect(html(<DefaultEditPraxis state={composerState()} />)).not.toContain('alb-')
  })
})

/* ── the mobile field desk ──────────────────────────────────────────────── */

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
  faction_slug: 'albescent',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  badges: [],
  invitations: [],
}

const deskState = (): FieldDeskHomeState => ({
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
  activeTasks: [
    aPraxisCard({
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
      task_faction_slug: 'na',
    }),
  ],
  pendingRow: { kind: 'requests', count: 2, to: REQUESTS_QUEUE_LINK },
  loadingTasks: false,
  offersACharacterChoice: true,
  canVote: true,
})

const DESK_EDGE = '<span aria-hidden="true" class="alb-desk-edge"></span>'

describe('AlbescentFieldDesk is DefaultFieldDesk plus one span (#2505, #2519)', () => {
  it('wraps the na home whole and adds only the ring', () => {
    const state = deskState()
    expect(html(<AlbescentFieldDesk state={state} />).replace(DESK_EDGE, '')).toBe(
      `<div class="alb-desk">${html(<DefaultFieldDesk state={state} />)}</div>`,
    )
  })

  it('mounts the ring INSIDE the identity card, ahead of the hairline', () => {
    // It must clip to the card's rounded box, hence `identityOrnament` (#2519).
    const markup = html(<AlbescentFieldDesk state={deskState()} />)
    expect(occurrences(markup, 'alb-desk-edge')).toBe(1)
    const ring = markup.indexOf('alb-desk-edge')
    expect(ring).toBeGreaterThan(markup.indexOf('<header>'))
    expect(ring).toBeLessThan(markup.indexOf('spectrum-rule'))
  })

  it('na renders no ornament at all when the slot is left empty', () => {
    expect(html(<DefaultFieldDesk state={deskState()} />)).not.toContain('alb-')
  })

  it('the identity card carries ONE spectrum rule in the markup, either way', () => {
    // na's hairline stays mounted (hidden by CSS under Albescent).
    for (const markup of [
      html(<DefaultFieldDesk state={deskState()} />),
      html(<AlbescentFieldDesk state={deskState()} />),
    ]) {
      expect(occurrences(markup, 'spectrum-rule')).toBe(1)
      // Ramp from the class, not inline `background`, which CSS can't override
      // (#2497). Read off the span itself: the level track has its own ramp.
      const band = markup.match(/<span class="spectrum-rule" style="([^"]*)"/)
      expect(band, 'the identity hairline is not the classed span').not.toBeNull()
      expect(band![1]).not.toContain('background')
    }
  })

  it('leaves the level track alone — that spectrum is #2500’s (#2505)', () => {
    const markup = html(<AlbescentFieldDesk state={deskState()} />)
    expect(occurrences(markup, 'background:var(--faction-default-rainbow)')).toBe(1)
  })
})

/* ── the two stylesheets ────────────────────────────────────────────────── */

/** Every top-level selector list in a sheet that names `selector`. */
const preludesNaming = (css: string, selector: string) =>
  [...css.matchAll(/([^{}]+)\{[^{}]*\}/g)]
    .map(([, prelude]) => prelude)
    .filter((prelude) => prelude.split(',').some((one) => one.trim() === selector))

/** Every rule whose selector list names this class as a whole token. */
const bodiesNaming = (css: string, selector: string) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, prelude]) => prelude.split(',').some((one) => one.trim() === selector))
    .map(([, , body]) => body)

/* One carrier per object (#2519): joining the shared ring silently inherits
   its faint defaults (1px, 0.6), so width and strength must be declared. */
describe('the carrier is 3px at full strength, in ONE rule (#2519)', () => {
  const CARRIERS = [
    '.alb-task-edge',
    '.alb-praxis-card-edge',
    '.alb-plate-edge',
    '.alb-desk-edge',
  ]

  it('all four carriers are declared by the same rule', () => {
    // One rule, so they cannot drift apart.
    const carrying = [...INDEX.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(
      ([, , body]) => /padding:\s*3px/.test(body) && /opacity:\s*1\b/.test(body),
    )
    const shared = carrying.filter(([, prelude]) =>
      CARRIERS.every((one) => prelude.split(',').some((each) => each.trim() === one)),
    )
    expect(shared, 'the carriers are not one rule').toHaveLength(1)
  })

  for (const selector of CARRIERS) {
    it(`${selector} states the carrier's width and strength`, () => {
      const body = bodiesNaming(INDEX, selector).join(' ')
      expect(body, `${selector} is not declared in index.css`).not.toBe('')
      expect(body, `${selector} is not 3px`).toMatch(/padding:\s*3px/)
      expect(body, `${selector} is dimmed`).toMatch(/opacity:\s*1\b/)
    })
  }

  it('the composer carries ONE spectrum mark, not two (#2553)', () => {
    // The sheet edge alone; no rule may name a composer ring.
    expect(
      bodiesNaming(INDEX, '.alb-composer-edge'),
      'the composer still declares a ring of its own',
    ).toHaveLength(0)
    expect(INDEX, 'a dead rule still hides a band na no longer draws').not.toContain(
      '.alb-composer .ep-edge',
    )
    expect(MOTION, 'the composer ring still has a travel rule').not.toContain(
      'alb-composer-edge',
    )
  })

  it('the field desk carries ONE spectrum mark, not two', () => {
    // The hairline comes off; the card's ring is the carrier.
    const body = bodiesNaming(INDEX, '.alb-desk .spectrum-rule').join(' ')
    expect(body, 'the identity hairline still doubles the card’s edge').toMatch(
      /display:\s*none/,
    )
    expect(body, 'the bar is still being repainted for travel').not.toContain(
      'background',
    )
  })

  // The plate ring is asserted in `defaultFactionHero.test.tsx`.
})

describe('the desk did not hand-roll an ornament (#2505)', () => {
  it('the desk edge joins the shared ring for its geometry', () => {
    const rules = preludesNaming(INDEX, '.alb-desk-edge')
    // Two: the shared masked ring and the carrier rule (#2519).
    expect(rules, 'the desk edge hand-rolled a rule').toHaveLength(2)
    expect(rules.some((one) => one.includes('.spectrum-frame::before'))).toBe(true)
    expect(rules.some((one) => one.includes('.alb-task-edge'))).toBe(true)
  })

  it('it travels on the shared child, inside the reduced-motion gate', () => {
    for (const selector of ['.alb-desk-edge::before']) {
      const at = MOTION.indexOf(selector)
      expect(at, `${selector} has no travel rule`).toBeGreaterThan(0)
      const gateAt = MOTION.lastIndexOf('@media', at)
      expect(
        MOTION.slice(gateAt, at),
        `${selector} travels outside the reduced-motion gate`,
      ).toContain('prefers-reduced-motion: no-preference')
      // Shared keyframe; `spectrumRingCollapse` counts them.
      const body = MOTION.slice(MOTION.indexOf('{', at), MOTION.indexOf('}', at))
      expect(body).toContain('alb-edge-travel')
    }
  })

  it('nothing about the composer’s reading ground moved', () => {
    // An Albescent scope here would bring back the bloom (no contrast budget).
    for (const token of [
      '--faction-default-aurora-opacity',
      '--faction-default-aurora-filter',
      '--faction-default-aurora-blend',
    ]) {
      for (const [, prelude] of INDEX.matchAll(
        new RegExp(`([^{}]+)\\{[^{}]*${token}\\s*:[^{}]*\\}`, 'g'),
      )) {
        expect(prelude, `${token} is being re-scoped for Albescent`).not.toContain('alb-')
      }
    }
  })
})
