/**
 * THE SEAM: the ground the edit page's two shared slots land on, and the seam
 * repoint that ground forces (#2537, Singularity lane).
 *
 * `editCharacterSlots.tsx` designs `FactionRow` and `DeleteCharacter` once for
 * all eight archetypes, and its own `ponytail:` note says what it could not
 * settle: *"the alarm ink is measured on the na page's washed ground only… a
 * faction archetype that lands this slot on its own SHEET must re-measure its
 * `-card-alarm` against that sheet in its own PR."*
 *
 * Singularity is the faction where that note bites hardest, because the slot
 * mixes two kinds of colour that this faction pulls in opposite directions:
 *
 *   • the destructive control's ink is `factionCssVar(slug, 'card-alarm')`, and
 *     `--faction-singularity-card-alarm` is `#fca5a5` in BOTH themes — a pale
 *     red cut for a card that is near-black in both (§6). It needs a DARK
 *     ground;
 *   • the faction row's label and help, and the confirm's prompt and cancel
 *     key, are the global `--color-text-*` tiers, whose light halves are dark
 *     ink. They need a LIGHT ground.
 *
 * In light there is no ground on which both read — the rows below are the
 * proof, not the assertion of a preference. So the archetype does the only
 * thing left that touches neither the shared slot nor a stylesheet: it lands
 * the pair on its own raised panel and REPOINTS the neutral seam on that pane's
 * root, the same move `SingularityFeedFrame` already makes for the shared feed
 * body. The repoint is therefore load-bearing paint, and it is pinned here as
 * markup rather than left to a reader to notice — deleting one line of it
 * strands one string at ~2:1 and the page still renders perfectly.
 *
 * WHAT IS NOT RE-MEASURED. Every ink this pane draws is a `-term-*` pairing
 * `singularityCreateCharacterGround.test.ts` already resolves — that file is
 * the page family's colour rule and a second copy of its rows would be a second
 * name for one measurement. What is stated below is only what is NEW to this
 * surface: the alarm on the pane it now lands on, and the two impossibility
 * rows that are the reason the pane exists at all.
 *
 * `renderToStaticMarkup` only — the frontend harness has no DOM, effects never
 * run, and nothing asserted here needs either.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import {
  AA_NORMAL,
  contrastRatio,
  formatRatio,
  parseColor,
  type Rgba,
} from '../../../utils/contrast'
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'
import type { EditCharacterState } from '../useEditCharacter'
import type { CharacterOut } from '../../../api/auth'

const THEMES = readThemes(readIndexCss())
const BOTH_THEMES: Theme[] = ['light', 'dark']

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

const ALARM = '--faction-singularity-card-alarm'
const PANEL = '--faction-singularity-term-panel'
const CHASSIS = '--faction-singularity-term-bg'

describe('the destructive slot, on the ground THIS archetype lands it on', () => {
  // The measurement the fan-out is told it owes. The create plate already reads
  // this token on this panel as "a counter at its cap"; it is restated here
  // because the consumer is different — an outline button and a bordered
  // confirm panel, i.e. a control's whole frame rather than four characters of
  // readout — and because a future repaint of the pane must fail on the row
  // that names the destructive act.
  it.each(BOTH_THEMES)('%s — the alarm reads on the tail pane', (theme) => {
    const ratio = contrastRatio(resolve(ALARM, theme), resolve(PANEL, theme))
    expect(ratio, `${ALARM} on ${PANEL} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL)
  })

  // Both wells the repoint opens inside that pane — the faction link's, and the
  // confirm's cancel key — are the chassis, one rung down from the panel.
  it.each(BOTH_THEMES)('%s — and on the recessed well inside it', (theme) => {
    const ratio = contrastRatio(resolve(ALARM, theme), resolve(CHASSIS, theme))
    expect(ratio, `${ALARM} on ${CHASSIS} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
      AA_NORMAL,
    )
  })
})

describe('why the na kit’s tail ground does not transfer', () => {
  /* The two rows the design turns on. Each asserts a FAILURE, for the reason
     the create plate's dim-ink row gives: a ratio test that only records the
     passing case cannot tell the next reader that the obvious cheaper option
     was tried and refused. If either is ever repainted far enough to clear,
     this goes red and the decision can be reconsidered. */

  it('the faction alarm is unreadable on the app page in light', () => {
    // `DefaultEditCharacter` puts this slot straight on `--color-bg-page`, where
    // `--faction-default-card-alarm` reads 5.89:1. Singularity's is cut for a
    // near-black card and is theme-invariant, so the same placement here would
    // ship a destructive control at under 2:1.
    const ratio = contrastRatio(resolve(ALARM, 'light'), resolve('--color-bg-page', 'light'))
    expect(ratio, `${ALARM} on --color-bg-page is ${formatRatio(ratio)}`).toBeLessThan(3)
  })

  it('and the neutral tiers are unreadable on a Singularity ground in light', () => {
    // Which is the other half: having been forced onto a dark pane, the slot's
    // own `--color-text-*` reads must be repointed or they strand. This is the
    // 2.27:1 `.eslint-legacy-faction-ink.txt` names this sheet for.
    for (const token of ['--color-text-primary', '--color-text-secondary', '--color-text-tertiary']) {
      const ratio = contrastRatio(resolve(token, 'light'), resolve(PANEL, 'light'))
      expect(ratio, `${token} on ${PANEL} is ${formatRatio(ratio)}`).toBeLessThan(AA_NORMAL)
    }
  })
})

/* -------------------------------------------------------------------------- */
/* The rendered page.                                                          */
/* -------------------------------------------------------------------------- */

const factor = vi.hoisted(() => ({ value: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

const SingularityEditCharacter = (await import('../archetypes/SingularityEditCharacter')).default

const WIDTHS = ['desktop', 'mobile'] as const

function character(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 1,
    username: 'molly',
    display_name: 'Molly',
    bio: 'Doing very human things.',
    tagline: 'Slow spells, strong tea.',
    avatar_url: '',
    location: 'SFO',
    level: 4,
    score: 340,
    all_time_score: 340,
    faction_slug: 'singularity',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

function state(overrides: Partial<EditCharacterState> = {}): EditCharacterState {
  return {
    id: '1',
    character: character(),
    loading: false,
    isOwner: true,
    displayName: 'Molly',
    setDisplayName: () => {},
    bio: 'Doing very human things.',
    setBio: () => {},
    tagline: 'Slow spells, strong tea.',
    setTagline: () => {},
    location: 'SFO',
    setLocation: () => {},
    avatarFile: null,
    avatarSource: null,
    setAvatarSource: () => {},
    avatarPreview: null,
    avatarError: 'that portrait is too large',
    setAvatarError: () => {},
    handleAvatarChange: () => {},
    handleAvatarConfirm: () => {},
    saving: false,
    canSubmit: true,
    error: 'that did not go in',
    handleSubmit: () => {},
    deleting: false,
    handleDelete: () => {},
    ...overrides,
  }
}

function render(width: (typeof WIDTHS)[number], overrides: Partial<EditCharacterState> = {}) {
  factor.value = width
  try {
    return renderToStaticMarkup(
      <MemoryRouter>
        <SingularityEditCharacter state={state(overrides)} />
      </MemoryRouter>,
    )
  } finally {
    factor.value = 'desktop'
  }
}

/** Every inline `style` attribute in the markup, one string each. */
const styleAttributes = (html: string): string[] =>
  [...html.matchAll(/style="([^"]*)"/g)].map((match) => match[1])

describe('the tail pane carries the whole repoint, on its own root', () => {
  /* The load-bearing half of this file. Each pair below is one global token the
     shared slot reads and the `-term-*` token this pane sends it to; a missing
     line is one string stranded at ~2:1 on a page that still renders. */
  const REPOINT: Array<[global: string, target: string]> = [
    ['--color-text-primary', '--faction-singularity-term-bright'],
    ['--color-text-secondary', '--faction-singularity-term-ink'],
    ['--color-text-tertiary', '--faction-singularity-term-dim'],
    ['--color-bg-surface-alt', CHASSIS],
    ['--color-bg-surface', CHASSIS],
    ['--color-border-strong', '--faction-singularity-term-border'],
  ]

  it.each(WIDTHS)('%s — one element declares the panel and every repoint', (width) => {
    const panes = styleAttributes(render(width)).filter((style) =>
      REPOINT.every(([global]) => style.includes(`${global}:`)),
    )
    expect(
      panes.length,
      `No single element carries all six repoints. They must sit on ONE root — the
tail pane — because the shared slot reads them from wherever it is mounted, and
a partial repoint strands whichever string it missed on a near-black ground.`,
    ).toBe(1)

    for (const [global, target] of REPOINT) {
      expect(panes[0], `${global} is not sent to ${target}`).toContain(`${global}:var(${target})`)
    }
    expect(panes[0], 'the pane paints its own opaque ground').toContain(`background:var(${PANEL})`)
  })

  it.each(WIDTHS)('%s — the danger family is left neutral (ADR-0061)', (width) => {
    /* The slot's own ruling, and #1169's: the confirm's filled key is a GROUND
       and its ink rather than type on a wash, so the chassis never reaches it,
       and the banner's veil and edge are the platform's rungs on every skin.
       Asserted as the absence of a repoint, because the confirm panel itself is
       behind local state and never reaches a static render — that state is
       named in the PR's eyeball list. */
    const html = render(width)
    for (const style of styleAttributes(html)) {
      expect(style, 'a repoint of the danger family').not.toMatch(/--color-danger:|--color-on-danger:/)
    }
    expect(html, 'the error banner keeps the neutral veil').toContain('var(--color-danger-veil)')
    expect(html, 'and the neutral edge').toContain('var(--color-danger-edge)')
  })
})

describe('the two slots are MOUNTED, not redrawn', () => {
  it.each(WIDTHS)('%s — the faction row links to this faction, and delete is offered', (width) => {
    const html = render(width)
    expect(html, 'the faction row is the shared one').toContain('href="/factions/singularity"')
    expect(html.replace(/<[^>]*>/g, ''), 'the destructive act').toContain('Delete this character')
    // Behind a tap. A page that arrived already asking would be reading its own
    // weight wrong.
    expect(html.replace(/<[^>]*>/g, ''), 'and it opens as an invitation').not.toContain(
      "This can't be undone",
    )
    // The slot inks itself from the faction's card family; the pane is the
    // ground that makes that legible.
    expect(html, 'the alarm is the faction’s').toContain(`var(${ALARM})`)
  })
})

describe('the page wears the create plate’s terminal, one register only', () => {
  it.each(WIDTHS)('%s — the chassis, the readout boxes, the lamps and one face', (width) => {
    const html = render(width)
    for (const token of [
      CHASSIS,
      '--faction-singularity-term-chrome',
      PANEL,
      '--faction-singularity-term-border',
      '--faction-singularity-term-bright',
      '--faction-singularity-term-ink',
      '--faction-singularity-card-font',
    ]) {
      expect(html, `${token} is unpainted`).toContain(token)
    }
    for (const led of ['led-red', 'led-amber', 'led-green']) {
      expect(html, `the ${led} lamp is missing from the bar`).toContain(
        `--faction-singularity-${led}`,
      )
    }
    expect(html, 'the standing raster').toContain('--faction-singularity-term-scan')
    expect(html, 'the travelling band').toContain('--faction-singularity-term-sweep')
    expect(html, 'the scan sweep').toContain('class="sg-scan"')
    expect(html, 'the block cursor').toContain('class="sg-cursor"')
    expect(html, 'no borrowed composer motion').not.toContain('ep-blink')
    expect(html, 'this skin, not the na kit’s').toContain('data-skin="singularity"')
  })

  it.each(WIDTHS)('%s — the caption tier never lands on the composited chassis', (width) => {
    /* The create plate's rule, which this page inherits along with its dress:
       `-term-dim` clears AA flat and FAILS under the standing raster and the
       travelling band (4.12:1 light / 4.20:1 dark). It is a PANEL ink here.
       The tail pane's repoint of `--color-text-tertiary` is one of the elements
       this sweep has to see paint its own ground, which it does. */
    const DIM = '--faction-singularity-term-dim'
    const GROUNDS = [PANEL, '--faction-singularity-term-chrome']
    const inked = styleAttributes(render(width)).filter((style) => style.includes(DIM))
    expect(inked.length, 'the caption tier is drawn at all').toBeGreaterThan(0)
    const stranded = inked.filter((style) => !GROUNDS.some((ground) => style.includes(ground)))
    expect(
      stranded,
      `Each line is an element inked \`${DIM}\` that does not paint its own opaque
background, so its real ground is the chassis under the raster and the scan band
— 4.12:1 light, 4.20:1 dark. Put it in a readout box and give it
\`background: PANEL\`, or ink it \`--faction-singularity-term-ink\`.`,
    ).toEqual([])
  })
})

describe('the page keeps the contract the archetype is only a dress on', () => {
  it.each(WIDTHS)('%s — the guards are the na kit’s three lines', (width) => {
    expect(render(width, { loading: true })).not.toContain('data-skin')
    expect(render(width, { character: null })).toContain('Character not found')
    expect(render(width, { isOwner: false })).toContain('only edit your own character')
  })

  it.each(WIDTHS)('%s — the edit form’s own caps, not create’s', (width) => {
    // Create is 22 / 160; the edit form is 50 / 500 / 140 / 100, which is what
    // the `editCharacter.*Count` keys print and what `useEditCharacter` sends.
    // An archetype that copied the create plate's constants would truncate a
    // saved bio the first time it was opened.
    const caps = [...render(width).matchAll(/maxLength="(\d+)"/gi)].map((m) => Number(m[1]))
    expect(caps.sort((a, b) => a - b)).toEqual([50, 100, 140, 500])
  })

  it('submits through a real form, so Enter commits from a text field', () => {
    expect(render('desktop')).toContain('<form')
  })
})
