/**
 * Albescent's composer and its phone home are WRAPPERS (#2505, epic #2496).
 *
 * The epic's pattern is one claim, and it is the claim worth a test: every
 * Albescent surface is the na component plus ornament, never a skin. So the
 * seam here is DIFFERENCE — render the na archetype and the Albescent one from
 * the same state and require the markup to be identical apart from the one
 * decorative layer. A presence check ("the class is somewhere in the output")
 * would have passed against a fork of the whole page, which is exactly the
 * failure ADR-0048 exists to prevent.
 *
 * IT IS ALSO THE LEGIBILITY GUARD. The design canvas draws a bloom behind the
 * live textarea; on the composited na ground the composer's quiet tier already
 * reads 3.67:1 light / 3.02:1 dark (the #2485 family, on na's own composer), so
 * the bloom is dialled back to nothing and the tell lives at the sheet's edge
 * where it owes no ratio. "Byte-identical apart from one `aria-hidden` span"
 * is that decision, stated so that walking it back turns this red.
 *
 * THE CLAIM IS COUNTABLE, deliberately, and #2519 is why it had to become a
 * count of WEIGHTS as well as of elements. Both surfaces already carried a na
 * spectrum mark — the composer's masthead band, the desk's identity hairline —
 * and #2505 read "replace rather than double up" as re-cutting the mark it
 * found. The design canvas does the reverse: the mark comes OFF and the object
 * grows a 3px travelling border, one carrier per object. A render test cannot
 * see that difference, because both readings render an `aria-hidden` span; what
 * separates them is the declared width, the declared strength, and whether the
 * old bar is still drawn. Those three are asserted against the stylesheet.
 *
 * The stylesheet half also asserts that neither surface hand-rolled anything:
 * the ring and the travelling child are the rules seven other mounts share.
 *
 * Harness: `renderToStaticMarkup`, no DOM (SPEC-testing.md).
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
import type { EditPraxisState } from '../pages/editPraxis/useEditPraxis'
import type { FieldDeskHomeState } from '../pages/fieldDesk/useFieldDeskHome'
import type { PraxisOut } from '../api/praxis'
import type { TaskOut } from '../api/tasks'
import type { CharacterOut } from '../api/auth'
import { aPraxisCard } from '../test/fixtures'
import { REQUESTS_QUEUE_LINK } from '../pages/updates/requestsQueueAnchor'

const read = (path: string) =>
  stripComments(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8'))
const INDEX = read('../index.css')
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
  ({
    loading: false,
    phase: 'composing',
    praxis: PRAXIS,
    task: TASK,
    error: '',
    title: PRAXIS.title,
    setTitle: () => {},
    body: '## What I did\n\nWheeled them down.',
    setBody: () => {},
    media: [],
    fileError: '',
    handleFileChange: () => {},
    removeMedia: async () => {},
    switchingMode: null,
    changeMode: async () => {},
    inviteQuery: '',
    setInviteQuery: () => {},
    inviteResults: [],
    inviteOpen: false,
    setInviteOpen: () => {},
    inviting: false,
    sendInvite: async () => {},
    cancelInvite: async () => {},
    kickMember: async () => {},
    duel: null,
    sendChallenge: async () => {},
    cancelDuel: async () => {},
    dissolveDuel: async () => {},
    metatasks: [],
    appliedMetatasks: new Set(),
    applyingMetatask: null,
    toggleMetatask: async () => {},
    appliedMetataskList: [],
    addMetatask: async () => {},
    submitting: false,
    publish: async () => {},
    saveDraft: async () => {},
    pullBack: async () => {},
    leaveCollab: async () => {},
    cancel: async () => {},
    autosaveAt: null,
    setAutosaveAt: () => {},
    autoSubmitDays: 10,
    isPublished: false,
    controlsLocked: false,
    modeIsLocked: false,
    showInviteBox: true,
    showMetatasks: true,
    showSealStack: true,
    duelMode: false,
    duelChipVisible: true,
    currentCharacterId: 3,
  }) as unknown as EditPraxisState

const EDGE = '<span aria-hidden="true" class="alb-composer-edge"></span>'

describe('AlbescentEditPraxis is DefaultEditPraxis plus one span (#2505)', () => {
  it('adds the edge exactly once, and changes nothing else', () => {
    const state = composerState()
    const albescent = html(<AlbescentEditPraxis state={state} />)
    expect(occurrences(albescent, 'alb-composer-edge')).toBe(1)
    // Removing the one ornament and the cascade handle has to reproduce the na
    // composer byte for byte. Any wash, retune or copy of its own — the thing
    // ADR-0048 forbids and the thing the composer's contrast budget cannot
    // afford — fails here. The wrapper (#2519) paints nothing: it exists so
    // index.css can take na's masthead band off this sheet, which is a rule in
    // the stylesheet and not a fork of the markup.
    expect(albescent.replace(EDGE, '')).toBe(
      `<div class="alb-composer">${html(<DefaultEditPraxis state={state} />)}</div>`,
    )
  })

  it('mounts the edge inside the sheet, not over the page (#1028)', () => {
    // The clip is `ComposerSheet`'s `overflow: hidden`, so the ornament has to
    // arrive through the slot rather than from a wrapper around the archetype.
    // Its position in the markup is what proves that: inside the sheet, ahead of
    // the content column's first region.
    const albescent = html(<AlbescentEditPraxis state={composerState()} />)
    const edge = albescent.indexOf('alb-composer-edge')
    // After the breadcrumb, which `ComposerPage` draws outside the sheet…
    expect(albescent.indexOf('<nav')).toBeGreaterThan(-1)
    expect(edge).toBeGreaterThan(albescent.indexOf('<nav'))
    // …and before the first thing the content column says, so it is a sibling of
    // the ground rather than a layer over the page or over the copy.
    expect(edge).toBeLessThan(albescent.indexOf(PRAXIS.title as string))
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
    // The ring has to clip to the card's own rounded box, which is why it
    // arrives through `identityOrnament` rather than as a layer on the wrapper
    // (#2519). Its position in the markup is what proves it landed in the card:
    // after the page heading, and before the hairline the card draws first.
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
    // na's hairline is still DRAWN under Albescent — it is taken off in the
    // stylesheet, not unmounted, because it belongs to `DefaultFieldDesk` and
    // every unaffiliated player still sees it. What must never happen is a
    // SECOND `.spectrum-rule` appearing on this page. Counted, because a
    // presence check cannot tell one from two.
    for (const markup of [
      html(<DefaultFieldDesk state={deskState()} />),
      html(<AlbescentFieldDesk state={deskState()} />),
    ]) {
      expect(occurrences(markup, 'spectrum-rule')).toBe(1)
      // …and it takes its ramp from the class, not from an inline `background`
      // shorthand, which is the one thing a dresser can never reach behind
      // (#2497's seam). Read off the span's own style attribute: the identity
      // block draws a SECOND na ramp — the level track's clipped fill — and a
      // sheet-wide substring check would keep passing on that one.
      const band = markup.match(/<span class="spectrum-rule" style="([^"]*)"/)
      expect(band, 'the identity hairline is not the classed span').not.toBeNull()
      expect(band![1]).not.toContain('background')
    }
  })

  it('leaves the level track alone — that spectrum is #2500’s (#2505)', () => {
    // Ruling 3 turns readouts too, but the sweep that reaches every still
    // spectrum is its own child issue. This one replaces the identity band's
    // RULE and nothing else, so the track keeps its own inline ramp and the
    // `.alb-desk .spectrum-rule` cascade cannot reach it.
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

/* ── ONE CARRIER PER OBJECT (#2519) ───────────────────────────────────────
   The seam is the DECLARED CSS: how wide the carrier is, how strong, and how
   many spectrum marks the surface has. #2504 and #2505 built these three
   surfaces from issue prose rather than the design canvas and each joined the
   shared ring's selector list saying nothing, so each shipped at that rule's
   defaults — `padding: 1px; opacity: 0.6`, the faintest mark the kit can draw —
   BESIDE the bar or strip the drawing removes. Nothing rendered wrong; the page
   simply did not say what it was drawn to say. A count and two values are what
   tell those two states apart without a compositor. ── */
describe('the carrier is 3px at full strength, in ONE rule (#2519)', () => {
  const CARRIERS = [
    '.alb-task-edge',
    '.alb-praxis-card-edge',
    '.alb-plate-edge',
    '.alb-composer-edge',
    '.alb-desk-edge',
  ]

  it('all five carriers are declared by the same rule', () => {
    // One rule, so they cannot drift apart again — which is exactly how three
    // of them ended up at 1px/0.6 while the other two were at 3px/1.
    const carrying = [...INDEX.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(
      ([, , body]) => /padding:\s*3px/.test(body) && /opacity:\s*1\b/.test(body),
    )
    const shared = carrying.filter(([, prelude]) =>
      CARRIERS.every((one) => prelude.split(',').some((each) => each.trim() === one)),
    )
    expect(shared, 'the five carriers are not one rule').toHaveLength(1)
  })

  for (const selector of CARRIERS) {
    it(`${selector} states the carrier's width and strength`, () => {
      const body = bodiesNaming(INDEX, selector).join(' ')
      expect(body, `${selector} is not declared in index.css`).not.toBe('')
      expect(body, `${selector} is not 3px`).toMatch(/padding:\s*3px/)
      expect(body, `${selector} is dimmed`).toMatch(/opacity:\s*1\b/)
    })
  }

  it('the composer carries ONE spectrum mark, not two', () => {
    // The design draws the composer's spectrum in the sheet's edge alone and
    // takes na's masthead band off. #2505 added the edge beside the band, so the
    // sheet carried two and the added one was the fainter of them.
    const body = bodiesNaming(INDEX, '.alb-composer .ep-edge').join(' ')
    expect(body, 'na’s masthead band is still on the Albescent sheet').toMatch(
      /display:\s*none/,
    )
  })

  it('the field desk carries ONE spectrum mark, not two', () => {
    // Same shape: the identity card's hairline comes off and the card's own
    // ring is the carrier. #2505 travelled the BAR instead, so the card still
    // had no edge.
    const body = bodiesNaming(INDEX, '.alb-desk .spectrum-rule').join(' ')
    expect(body, 'the identity hairline still doubles the card’s edge').toMatch(
      /display:\s*none/,
    )
    expect(body, 'the bar is still being repainted for travel').not.toContain(
      'background',
    )
  })

  // The faction page's third mount of this rule — the plate ring, and the two
  // plates that must NOT wear it — is asserted where that body is rendered:
  // `pages/factionDetail/__tests__/defaultFactionHero.test.tsx`.
})

describe('neither surface hand-rolled an ornament (#2505)', () => {
  it('the composer edge joins the shared ring for its geometry', () => {
    const rules = preludesNaming(INDEX, '.alb-composer-edge')
    // Two: the shared masked ring (mask, ramp, tile, corner) and the carrier's
    // own width and strength (#2519). Nothing else may name it.
    expect(rules, 'the composer edge hand-rolled a rule').toHaveLength(2)
    expect(rules.some((one) => one.includes('.spectrum-frame::before'))).toBe(true)
    expect(rules.some((one) => one.includes('.alb-task-edge'))).toBe(true)
  })

  it('both travel on the shared child, inside the reduced-motion gate', () => {
    for (const selector of ['.alb-composer-edge::before', '.alb-desk-edge::before']) {
      const at = MOTION.indexOf(selector)
      expect(at, `${selector} has no travel rule`).toBeGreaterThan(0)
      const gateAt = MOTION.lastIndexOf('@media', at)
      expect(
        MOTION.slice(gateAt, at),
        `${selector} travels outside the reduced-motion gate`,
      ).toContain('prefers-reduced-motion: no-preference')
      // The same rule the four card edges run — no keyframe was minted, which
      // is what keeps `spectrumRingCollapse`'s hard count of eight true.
      const body = MOTION.slice(MOTION.indexOf('{', at), MOTION.indexOf('}', at))
      expect(body).toContain('alb-edge-travel')
    }
  })

  it('nothing about the composer’s reading ground moved', () => {
    // The measured decision: the aurora's compositing is na's, unqualified. A
    // `.alb-composer` scope on any of the three would be the dialled-back bloom
    // coming back, and the composer's quiet tier has no budget for it.
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
