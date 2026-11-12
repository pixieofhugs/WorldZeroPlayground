/**
 * Every character-creation kit offers the same fields, order and exits at both
 * widths (#2992). Rendered markup, because both defects (a phone branch missing
 * fields, inverted exits) are per-tree-per-width and invisible to a grep.
 * Reachability lives in `createCharacterFields.test.tsx`. Roster is derived from
 * the registry (#2955), so a new kit is covered on registration. Paint and
 * geometry are the archetype's (ADR-0090) and not asserted.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import i18n from '../../../i18n'
import { resolveVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import type { CreateCharacterState } from '../useCreateCharacter'

const factor = vi.hoisted(() => ({ value: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

/** Every registered skin, plus the empty slug that lands on the na kit. */
const ARCHETYPES = [...Object.keys(surfaceMap('createCharacter')), '']
const WIDTHS = ['desktop', 'mobile'] as const
const CASES = WIDTHS.flatMap((width) => ARCHETYPES.map((slug) => [slug || 'na', slug, width] as const))

/** Field order per `useCreateCharacter`; read from the catalogue (names are in-field, #2793). */
const FIELD_ORDER = [
  'character.namePlaceholder',
  'character.bioPlaceholder',
  'character.taglinePlaceholder',
] as const

const forms = i18n.getFixedT(null, 'forms')
const common = i18n.getFixedT(null, 'common')

function state(overrides: Partial<CreateCharacterState> = {}): CreateCharacterState {
  return {
    displayName: 'Molly',
    setDisplayName: () => {},
    bio: '',
    setBio: () => {},
    tagline: '',
    setTagline: () => {},
    factionSlug: '',
    setFactionSlug: () => {},
    invited: [],
    avatarFile: null,
    avatarPreview: null,
    avatarSource: null,
    setAvatarSource: () => {},
    avatarError: '',
    setAvatarError: () => {},
    handleAvatarChange: () => {},
    handleAvatarConfirm: () => {},
    error: null,
    submitting: false,
    canSubmit: true,
    handleSubmit: () => {},
    handle: 'molly',
    showPicker: true,
    ...overrides,
  }
}

function renderSkin(slug: string, width: 'desktop' | 'mobile'): string {
  factor.value = width
  const Archetype = resolveVariant(surfaceMap('createCharacter'), slug)
  try {
    return renderToStaticMarkup(
      <MemoryRouter>
        <Archetype state={state({ factionSlug: slug, invited: ['ephemerists', 'coven'] })} />
      </MemoryRouter>,
    )
  } finally {
    factor.value = 'desktop'
  }
}

/** Placeholders of caret-able fields in source order; file/hidden inputs skipped (#1149). */
function fieldPlaceholders(html: string): string[] {
  const found: string[] = []
  for (const [, attrs] of html.matchAll(/<(?:input|textarea)\b([^>]*)>/g)) {
    if (/type="(?:file|hidden)"/.test(attrs)) continue
    found.push(/placeholder="([^"]*)"/.exec(attrs)?.[1] ?? '<unnamed>')
  }
  return found
}

describe('the field set is the same on every kit, at both widths', () => {
  it('the roster is the registry, not a list kept by hand', () => {
    // Guards against an empty registry passing every row by scanning nothing.
    expect(ARCHETYPES.length).toBeGreaterThan(1)
  })

  it.each(CASES)('%s on %s: name, bio, tagline — in that order and no others', (_name, slug, width) => {
    expect(fieldPlaceholders(renderSkin(slug, width))).toEqual(
      FIELD_ORDER.map((key) => forms(key)),
    )
  })
})

/**
 * Reserved masthead head on every kit (#2995): the page reskins as the calling
 * is picked, so differing mastheads moved the picker under the pointer. Asserts
 * every kit reads the same `reserveHead` floor. SSR has no layout, so whether the
 * floor covers each masthead is a rendered-sweep question, not provable here.
 */
describe('the masthead slot is reserved, and by one number (#2995)', () => {
  const boxes = (html: string, hook: 'head' | 'heading') =>
    [...html.matchAll(new RegExp(`<div data-composer-${hook}="" style="([^"]*)"`, 'g'))].map(
      ([, style]) => style,
    )

  it.each(CASES)('%s on %s: the sheet reserves its head', (_name, slug, width) => {
    expect(boxes(renderSkin(slug, width), 'head')).toHaveLength(1)
  })

  it.each(CASES)('%s on %s: and the heading block has its floor', (_name, slug, width) => {
    // Only `ComposerHeading` spells the floor; a hand-rolled heading has none.
    expect(boxes(renderSkin(slug, width), 'heading')).toHaveLength(1)
  })

  it.each(WIDTHS)('every kit reserves the same head and floor on %s', (width) => {
    for (const hook of ['head', 'heading'] as const) {
      const found = ARCHETYPES.map(
        (slug) => [slug || 'na', boxes(renderSkin(slug, width), hook)[0]] as const,
      )
      const values = new Set(found.map(([, style]) => style))
      expect(
        values.size,
        `nine kits, one ${hook} — got ${found.map(([k, v]) => `${k}: ${v}`).join(', ')}`,
      ).toBe(1)
      expect([...values][0], `the ${hook} is a reserved height, not an empty box`).toMatch(
        /min-height:\d+px/,
      )
    }
  })
})

describe('the exits read [Cancel] … [Create] on every kit, at both widths (#646)', () => {
  const CANCEL = common('actions.cancel')

  /** The cancel's own TEXT: an aria-labelled glyph elsewhere must not count. */
  const cancelAt = (html: string) => html.search(new RegExp(`>\\s*${CANCEL}\\s*<`))

  it.each(CASES)('%s on %s: the leave path is drawn before the commit', (_name, slug, width) => {
    const html = renderSkin(slug, width)
    const cancel = cancelAt(html)
    const submit = html.indexOf('type="submit"')
    expect(cancel, 'no textual cancel on the page').toBeGreaterThan(-1)
    expect(submit, 'no submit control on the page').toBeGreaterThan(-1)
    expect(cancel, '[Cancel] … [Create] is the global order settled in #646').toBeLessThan(submit)
  })

  it.each(CASES)('%s on %s: exactly one commit control', (_name, slug, width) => {
    // Two would mean a second per-width footer.
    const html = renderSkin(slug, width)
    expect(html.split('type="submit"').length - 1).toBe(1)
  })
})

/** Preview card and footer must state one starting level (#3075). */
describe('the preview card agrees with the footer about the starting level (#3075)', () => {
  const startsAt = forms('createCharacter.startsAt')
  const level = /\d+/.exec(startsAt)?.[0]

  it('the footer line names a level', () => {
    expect(level, `no number in "${startsAt}"`).toBeDefined()
  })

  it.each(CASES)('%s on %s: the card draws the level the footer states', (_name, slug, width) => {
    const html = renderSkin(slug, width)
    // Booleans, not `toContain`: a miss would print the whole sheet.
    const card = common('credential.lvl', { level })
    expect(html.includes(startsAt), `the footer line "${startsAt}" is not drawn`).toBe(true)
    expect(html.includes(card), `the card does not read "${card}"`).toBe(true)
  })
})
