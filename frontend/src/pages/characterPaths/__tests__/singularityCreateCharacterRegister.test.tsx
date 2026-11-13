/**
 * The Singularity create archetype wears the terminal register (one token family,
 * `.sg-scan` / `.sg-cursor`, one face) and keeps `-term-dim` off the chassis
 * (#2353). Ratios live in `singularityCreateCharacterGround.test.ts`; this
 * enforces the rule in markup: an element inked `-term-dim` must declare
 * `-term-panel` or `-term-chrome` as its OWN background.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CreateCharacterState } from '../useCreateCharacter'

const factor = vi.hoisted(() => ({ value: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

const SingularityCreateCharacter = (await import('../archetypes/SingularityCreateCharacter'))
  .default

const WIDTHS = ['desktop', 'mobile'] as const

function state(overrides: Partial<CreateCharacterState> = {}): CreateCharacterState {
  return {
    displayName: 'Molly',
    setDisplayName: () => {},
    bio: '',
    setBio: () => {},
    tagline: '',
    setTagline: () => {},
    factionSlug: 'singularity',
    setFactionSlug: () => {},
    invited: ['singularity', 'coven'],
    avatarFile: null,
    avatarPreview: null,
    avatarSource: null,
    setAvatarSource: () => {},
    avatarError: 'that portrait is too large',
    setAvatarError: () => {},
    handleAvatarChange: () => {},
    handleAvatarConfirm: () => {},
    error: 'that did not go in',
    submitting: false,
    canSubmit: true,
    handleSubmit: () => {},
    handle: 'molly',
    showPicker: true,
    ...overrides,
  }
}

function render(width: (typeof WIDTHS)[number], overrides: Partial<CreateCharacterState> = {}) {
  factor.value = width
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <SingularityCreateCharacter state={state(overrides)} />
    </MemoryRouter>,
  )
  factor.value = 'desktop'
  return html
}

/** Every inline `style` attribute in the markup, one string each. */
const styleAttributes = (html: string): string[] =>
  [...html.matchAll(/style="([^"]*)"/g)].map((match) => match[1])

const DIM = '--faction-singularity-term-dim'
/** The two opaque grounds `-term-dim` was measured against on this surface. */
const DIM_GROUNDS = ['--faction-singularity-term-panel', '--faction-singularity-term-chrome']

describe('the caption tier never lands on the composited chassis', () => {
  it.each(WIDTHS)('%s — every dim ink declares its own opaque ground', (width) => {
    const attributes = styleAttributes(render(width))
    const inked = attributes.filter((style) => style.includes(DIM))

    // Zero would pass vacuously.
    expect(inked.length, 'the caption tier is drawn at all').toBeGreaterThan(0)

    const stranded = inked.filter((style) => !DIM_GROUNDS.some((ground) => style.includes(ground)))
    expect(
      stranded,
      `Each line is an element inked \`${DIM}\` that does not paint its own
opaque background. Its real ground is therefore the chassis under the standing
raster and the travelling scan band, where that ink measures 4.12:1 in light and
4.20:1 in dark — below AA, on a token that passes 5.03 / 5.80 flat.
Put the element inside a readout box and give it \`background: PANEL\`, or ink it
\`--faction-singularity-term-ink\` (6.82 / 8.11 on that same composite).`,
    ).toEqual([])
  })
})

describe('the page wears the terminal, and one register only', () => {
  it.each(WIDTHS)('%s — the chassis, the readout boxes and one face', (width) => {
    const html = render(width)
    for (const token of [
      '--faction-singularity-term-bg',
      '--faction-singularity-term-chrome',
      '--faction-singularity-term-panel',
      '--faction-singularity-term-border',
      '--faction-singularity-term-bright',
      '--faction-singularity-term-ink',
      '--faction-singularity-card-font',
    ]) {
      expect(html, `${token} is unpainted`).toContain(token)
    }
  })

  it.each(WIDTHS)('%s — the lamps, the raster and the two motions', (width) => {
    const html = render(width)
    // The LED trio proves the kit's window bar is mounted (#1979).
    for (const led of ['led-red', 'led-amber', 'term-cta-bg']) {
      expect(html, `the ${led} lamp is missing from the bar`).toContain(
        `--faction-singularity-${led}`,
      )
    }
    expect(html, 'the standing raster').toContain('--faction-singularity-term-scan')
    expect(html, 'the travelling band').toContain('--faction-singularity-term-sweep')
    // One ornament primitive per faction (WORLD_ZERO_STYLE §6).
    expect(html, 'the scan sweep').toContain('class="sg-scan"')
    expect(html, 'the block cursor').toContain('class="sg-cursor"')
    expect(html, 'no borrowed composer motion').not.toContain('ep-blink')
  })

  it.each(WIDTHS)('%s — the alarm is the faction\'s, never the neutral red', (width) => {
    const html = render(width)
    // #1302; the veil and edge stay neutral (ADR-0061).
    expect(html).toContain('--faction-singularity-card-alarm')
    expect(html, 'the error copy must not paint the neutral').not.toContain(
      'color:var(--color-danger)',
    )
    expect(html, 'but the veil is still the platform speaking').toContain('--color-danger-veil')
  })
})

describe('the page keeps the contract the archetype is only a dress on', () => {
  it.each(WIDTHS)('%s — the picker survives, and clearing is reachable', (width) => {
    const html = render(width)
    // `aria-pressed` makes a second tap read as "unset", not a dead control.
    expect(html, 'the calling just picked').toContain('Singularity')
    expect(html, 'and the one not picked').toContain('Cozy Coven')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('aria-pressed="false"')
  })

  it.each(WIDTHS)('%s — every field is named by the words inside it', (width) => {
    const html = render(width)
    // Placeholder-only (#2793); registry sweep is `createCharacterFields.test.tsx`.
    const names = [...html.matchAll(/aria-label="([^"]+)"/g)].map((m) => m[1])
    expect(names, 'the three character fields, named').toEqual(
      expect.arrayContaining(['Character name', 'Character bio', 'Character Catchphrase']),
    )
    expect(html, 'and no label survives to name them twice').not.toContain('<label')
  })

  it('submits through a real form, so Enter commits from a text field', () => {
    expect(render('desktop')).toContain('<form')
  })
})
