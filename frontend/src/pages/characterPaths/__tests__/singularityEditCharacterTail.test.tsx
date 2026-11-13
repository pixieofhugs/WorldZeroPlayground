/**
 * The Singularity edit page's shared slots and the repoint their ground forces
 * (#2537) — the re-measurement `editCharacterSlots.tsx`'s `ponytail:` note asks.
 *
 * The alarm (`#fca5a5`, theme-invariant) needs a dark ground; the slot's global
 * `--color-text-*` tiers need a light one. No ground serves both in light, so the
 * archetype lands the slots on its raised panel and repoints the neutral tokens
 * on that pane's root (as `SingularityFeedFrame` does). A missing repoint line
 * strands a string at ~2:1 yet still renders, hence the markup pin below.
 * `-term-*` pairings are `singularityCreateCharacterGround.test.ts`'s.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import {
  AA_LARGE,
  AA_NORMAL,
  contrastRatio,
  formatRatio,
  parseColor,
  type Rgba,
} from '../../../utils/contrast'
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'
import { aFactionPicker } from '../../../test/fixtures'
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
/** The pane's plate edge (#3009) — see the archetype's header. */
const TAIL_EDGE = '--faction-singularity-accent-ink'
/** The `-term-*` family's own hairline — what the edge repointed away FROM. */
const TERM_BORDER = '--faction-singularity-term-border'

describe('the destructive slot, on the ground THIS archetype lands it on', () => {
  // Restated from the create plate: here it frames a destructive control.
  it.each(BOTH_THEMES)('%s — the alarm reads on the tail pane', (theme) => {
    const ratio = contrastRatio(resolve(ALARM, theme), resolve(PANEL, theme))
    expect(ratio, `${ALARM} on ${PANEL} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL)
  })

  // The wells inside the pane (faction link, cancel key) are the chassis.
  it.each(BOTH_THEMES)('%s — and on the recessed well inside it', (theme) => {
    const ratio = contrastRatio(resolve(ALARM, theme), resolve(CHASSIS, theme))
    expect(ratio, `${ALARM} on ${CHASSIS} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
      AA_NORMAL,
    )
  })
})

describe("the pane's plate edge is identifiable at 3:1 (WCAG 1.4.11, #3009)", () => {
  // 1.4.11: 3:1 against adjacent colour, on both PANEL and the CHASSIS wells.
  for (const theme of BOTH_THEMES) {
    it(`the edge against the panel — ${theme}`, () => {
      const ratio = contrastRatio(resolve(TAIL_EDGE, theme), resolve(PANEL, theme))
      expect(ratio, `${TAIL_EDGE} on ${PANEL} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
        AA_LARGE,
      )
    })

    it(`the edge against the well it encloses — ${theme}`, () => {
      const ratio = contrastRatio(resolve(TAIL_EDGE, theme), resolve(CHASSIS, theme))
      expect(ratio, `${TAIL_EDGE} on ${CHASSIS} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
        AA_LARGE,
      )
    })

    it(`the -term-* family's own hairline would still miss 3:1 here — ${theme}`, () => {
      // Why the edge isn't {@link TERM_BORDER}: too quiet to identify a control.
      const onPanel = contrastRatio(resolve(TERM_BORDER, theme), resolve(PANEL, theme))
      expect(onPanel, `${TERM_BORDER} on ${PANEL} reads ${formatRatio(onPanel)}`).toBeLessThan(
        AA_LARGE,
      )
      const onChassis = contrastRatio(resolve(TERM_BORDER, theme), resolve(CHASSIS, theme))
      expect(onChassis, `${TERM_BORDER} on ${CHASSIS} reads ${formatRatio(onChassis)}`).toBeLessThan(
        AA_LARGE,
      )
    })

    it(`the app's own neutral hairline would miss 3:1 too — ${theme}`, () => {
      // The shared slot's default edge, had the repoint never fired.
      const ratio = contrastRatio(resolve('--color-border-strong', theme), resolve(PANEL, theme))
      expect(ratio, `--color-border-strong on ${PANEL} reads ${formatRatio(ratio)}`).toBeLessThan(
        AA_LARGE,
      )
    })
  }
})

describe('why the na kit’s tail ground does not transfer', () => {
  /* Asserted failures record the refused cheaper option; red means reconsider. */

  it('the faction alarm is unreadable on the app page in light', () => {
    // The Default's placement (on `--color-bg-page`) would put this under 2:1.
    const ratio = contrastRatio(resolve(ALARM, 'light'), resolve('--color-bg-page', 'light'))
    expect(ratio, `${ALARM} on --color-bg-page is ${formatRatio(ratio)}`).toBeLessThan(3)
  })

  it('and the neutral tiers are unreadable on a Singularity ground in light', () => {
    // So on the dark pane the `--color-text-*` reads must be repointed.
    for (const token of ['--color-text-primary', '--color-text-secondary', '--color-text-tertiary']) {
      const ratio = contrastRatio(resolve(token, 'light'), resolve(PANEL, 'light'))
      expect(ratio, `${token} on ${PANEL} is ${formatRatio(ratio)}`).toBeLessThan(AA_NORMAL)
    }
  })
})

/* The rendered page. */

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
    // Nothing on offer: the faction row as the link this file measures (#3149).
    faction: aFactionPicker({ current: 'singularity', picked: 'singularity' }),
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
  /* Global token the shared slot reads → the `-term-*` token this pane sends it to. */
  const REPOINT: Array<[global: string, target: string]> = [
    ['--color-text-primary', '--faction-singularity-term-bright'],
    ['--color-text-secondary', '--faction-singularity-term-ink'],
    ['--color-text-tertiary', '--faction-singularity-term-dim'],
    ['--color-bg-surface-alt', CHASSIS],
    ['--color-bg-surface', CHASSIS],
    // #3009: accent ink, since TERM_BORDER misses 1.4.11 (see above).
    ['--color-border-strong', TAIL_EDGE],
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
    /* The filled confirm key is its own ground + ink (#1169); asserted as the
       absence of a repoint, since the confirm panel never renders statically. */
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
    expect(html.replace(/<[^>]*>/g, ''), 'and it opens as an invitation').not.toContain(
      "This can't be undone",
    )
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
    for (const led of ['led-red', 'led-amber', 'term-cta-bg']) {
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
    /* The create plate's rule: `-term-dim` is a PANEL ink only. */
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
    // Copying create's caps would truncate a saved bio on open.
    const caps = [...render(width).matchAll(/maxLength="(\d+)"/gi)].map((m) => Number(m[1]))
    expect(caps.sort((a, b) => a - b)).toEqual([3, 50, 140, 500])
  })

  it('submits through a real form, so Enter commits from a text field', () => {
    expect(render('desktop')).toContain('<form')
  })
})
