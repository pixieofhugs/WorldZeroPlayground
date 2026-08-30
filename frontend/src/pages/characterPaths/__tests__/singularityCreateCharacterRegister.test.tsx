/**
 * The Singularity create-character archetype wears the terminal, and keeps the
 * caption tier off the chassis (#2353).
 *
 * TWO SEAMS, and the second is the one nothing else in CI can see.
 *
 *  1. THE REGISTER. The skin names the `--faction-singularity-term-*` family its
 *     own task card and composer name, draws the faction's ONE ornament pair
 *     (`.sg-scan`, `.sg-cursor`) rather than the composer kit's `.ep-*`, and
 *     speaks in one face. A forked family is invisible to every lint and to
 *     every contrast sweep, because both halves are real declared tokens —
 *     `singularityWearsTheTerminalRegister.test.ts` is the same guard one
 *     surface over.
 *
 *  2. THE DIM-INK RULE, MECHANICALLY. `-term-dim` clears AA on the flat chassis
 *     and FAILS on the composite that is actually behind this page's type — the
 *     chassis plus the standing raster plus the travelling scan band (4.12:1
 *     light / 4.20:1 dark; the ratios are in
 *     `singularityCreateCharacterGround.test.ts`). A ratio test can state that
 *     and cannot enforce it: nothing stops the next edit from inking a label
 *     `-term-dim` on the chassis, and it would look perfectly deliberate. So the
 *     rule is written as a property of the rendered markup — an element inked
 *     `-term-dim` must declare `-term-panel` (the readout box's opaque fill) or
 *     `-term-chrome` (the window bar's) as its OWN background, because `color`
 *     inherits and a background does not.
 *
 * `renderToStaticMarkup` only — the frontend harness has no DOM, effects never
 * run, and nothing asserted here needs either.
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

    // Zero would pass this vacuously — the quiet tier IS drawn, in the readout
    // boxes' feet and on the window bar.
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
    // The window bar's cluster comes from the kit, so the LED trio is the proof
    // it is MOUNTED rather than re-declared (#1979).
    for (const led of ['led-red', 'led-amber', 'led-green']) {
      expect(html, `the ${led} lamp is missing from the bar`).toContain(
        `--faction-singularity-${led}`,
      )
    }
    expect(html, 'the standing raster').toContain('--faction-singularity-term-scan')
    expect(html, 'the travelling band').toContain('--faction-singularity-term-sweep')
    // The FACTION's own ornament classes, not the composer kit's `.ep-*` — one
    // primitive per faction (WORLD_ZERO_STYLE §6).
    expect(html, 'the scan sweep').toContain('class="sg-scan"')
    expect(html, 'the block cursor').toContain('class="sg-cursor"')
    expect(html, 'no borrowed composer motion').not.toContain('ep-blink')
  })

  it.each(WIDTHS)('%s — the alarm is the faction\'s, never the neutral red', (width) => {
    const html = render(width)
    // #1302: a shared functional ink inside a faction frame takes that faction's
    // card family. The VEIL and the EDGE stay neutral — ADR-0061.
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
    // A player must be able to change their mind, or clear the pick and be born
    // unaffiliated. The picked row is `aria-pressed`, which is what makes the
    // second tap read as "unset" rather than as a dead control.
    expect(html, 'the calling just picked').toContain('Singularity')
    expect(html, 'and the one not picked').toContain('Cozy Coven')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('aria-pressed="false"')
  })

  it.each(WIDTHS)('%s — every field is named by the words inside it', (width) => {
    const html = render(width)
    // This row used to count three `<label for>`s. #2793's ruling deletes every
    // visible label on both character forms, so the accessible name is now the
    // placeholder, said once and set on both attributes. The registry-wide
    // sweep is `createCharacterFields.test.tsx`; what is pinned here is that
    // THIS plate's three fields are the three that got it — a terminal chassis
    // dropping one would still render.
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
