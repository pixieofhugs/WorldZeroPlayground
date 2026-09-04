/**
 * Every character-creation kit offers the same fields, in the same order, with
 * the same exits — at both widths (#2992).
 *
 * ## The seam, and why it is not a source scan
 *
 * The rendered markup of every archetype the registry holds. #2992 was filed on
 * two defects a per-file reading cannot see: the na kit's PHONE branch offered
 * three of the form's fields where its desktop branch offered five, and its
 * desktop footer drew `[Create] [Cancel]` — the inverse of the global order
 * settled in #646 — while its phone branch drew no textual cancel at all. Both
 * are properties of one tree at one width, so both are invisible to a grep and
 * to a test that renders one archetype once.
 *
 * `createCharacterFields.test.tsx` is the sibling and the split is deliberate:
 * that file asks whether each field is *reachable* (named, unsuppressed focus
 * ring, no orphan `<label>`), and this one asks whether the SET and the ORDER
 * are the same across nine kits. A skin may dress a field; it may not drop one,
 * add one, or swap the exits round.
 *
 * ## The roster is derived, never typed
 *
 * `surfaceMap('createCharacter')` plus `''`, which resolves to the na kit the
 * same way an unregistered slug does. A hand-listed `SITES` array is the exact
 * failure #2955 is open for, and a typed roster cannot notice a tenth kit
 * (#2815) — so the tenth kit is covered here the day it registers, with nothing
 * to append.
 *
 * ## What is deliberately not asserted
 *
 * Nothing about paint, geometry or ornament. Which face a kit's name field
 * wears, whether its commit is an inline button or a full-bleed band, whether it
 * draws a masthead — all of that is the archetype's, and ADR-0090's tree/paint
 * split is what says so. This file only pins the field set and the exits, which
 * are the two things `useCreateCharacter` and #646 own rather than any skin.
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

/**
 * The form's fields, in the order `useCreateCharacter` holds them.
 *
 * Read out of the catalogue rather than transcribed: the words that name these
 * boxes are the words INSIDE them since #2793, so the expectation and the render
 * come from one string apiece and a reword cannot make this file lie.
 */
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

/**
 * The placeholder of every `<input>`/`<textarea>` a caret can land in, in source
 * order. File and hidden inputs are skipped: each sits behind a button that
 * names itself (`PortraitPicker`, #1149) and none of them is a form field.
 */
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
    // Not a count: the derivation is the point. A tenth kit is covered the day
    // it registers, and a registry that emptied would fail here rather than
    // pass every row below by scanning nothing.
    expect(ARCHETYPES.length).toBeGreaterThan(1)
  })

  it.each(CASES)('%s on %s: name, bio, tagline — in that order and no others', (_name, slug, width) => {
    expect(fieldPlaceholders(renderSkin(slug, width))).toEqual(
      FIELD_ORDER.map((key) => forms(key)),
    )
  })
})

/**
 * The reserved masthead head, on every kit (#2995).
 *
 * The defect is Propose a Task's, one surface over: this page reskins live as
 * the calling is chosen — `CreateCharacter.tsx` says so in as many words — so
 * every click on the picker renders a DIFFERENT archetype, and each one started
 * its content column wherever its own masthead ended (UA passes none; the
 * Ephemerists' sky band plus its cornice is 96px). The picker walked out from
 * under the pointer.
 *
 * `ComposerSheet`'s `reserveHead` puts a floor under that slot out of
 * `useComposerSizes()`. The number is not written down here — what is asserted
 * is that every kit reads the SAME one, which is the property that makes the
 * row stand still.
 *
 * WHAT THIS CANNOT PROVE, AND IT IS MORE HERE THAN ON THE PROPOSE PAGE. Two
 * things. `renderToStaticMarkup` has no layout, so "the reserved head is at
 * least as tall as every kit's actual masthead" — the property the fix turns on
 * — is a RENDERED SWEEP question that stays green here whatever the number is.
 * And the picker sits LATE on this surface, six blocks below the sheet's edge,
 * so its offset is the sum of everything above it and the per-kit field metrics
 * in between (border weight, the name field's tier, textarea line-height) are
 * each kit's dress. This proves the two shared terms are reserved and spelled
 * once; the residual is measured and reported on the PR rather than regularized
 * away.
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
    // `ComposerHeading` is the only thing that spells the floor, so a kit that
    // hand-rolled its own heading box has none and fails here.
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

  /**
   * The cancel control's own TEXT, not an `aria-label` anywhere on the page.
   *
   * The distinction is the defect: the retired na phone column had a back
   * chevron labelled `Cancel` in its top row, so a page-wide search for the word
   * found a control at the very top and reported the order correct while the
   * only visible exit was a glyph the footer never drew.
   */
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
    // Two would mean a skin kept a second footer for one width — which is what
    // the phone branch's sticky bar was.
    const html = renderSkin(slug, width)
    expect(html.split('type="submit"').length - 1).toBe(1)
  })
})
