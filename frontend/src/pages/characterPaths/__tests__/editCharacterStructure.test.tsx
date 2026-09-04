/**
 * Every edit-character kit offers the same fields, in the same order, and puts
 * the irreversible act AFTER the commit — at both widths (#2991).
 *
 * ## The seam, and why it is not a source scan
 *
 * The rendered markup of every archetype the registry holds, at both form
 * factors. #2991 was filed on two defects a per-file reading cannot see:
 *
 *   1. the `na` kit's PHONE branch offered three of the form's fields where its
 *      desktop branch offered five — no handle, no location — so an
 *      unaffiliated player could not set their location on a phone at all;
 *   2. the destructive action sat in four different places across eight kits,
 *      and on exactly two of them it came BEFORE the primary one: the Everymen
 *      stub, and the na phone column's mid-column delete above its sticky Save.
 *
 * Both are properties of one tree at one width. A grep sees neither, and a test
 * that renders one archetype once sees neither.
 *
 * `editCharacterDispatch.test.tsx` is the sibling and the split is deliberate:
 * that file asks whether each field is REACHABLE (named, unsuppressed focus
 * ring, no orphan `<label>`) and whether the delete slot survives the skin. This
 * one asks whether the SET and the ORDER are the same across every kit. A skin
 * may dress a field; it may not drop one, add one, or draw the delete above the
 * save.
 *
 * ## The roster is derived, never typed
 *
 * `surfaceMap('editCharacter')` plus `''`, which resolves to the na kit the same
 * way an unregistered slug does. A hand-listed `SITES` array is the exact
 * failure #2955 is open for, and a typed roster cannot notice a tenth kit
 * (#2815) — so the tenth kit is covered the day it registers, with nothing to
 * append.
 *
 * ## THE HANDLE IS A READOUT, AND THAT IS THE RULING (#2991, decision 3)
 *
 * The issue asks whether Coven's `@handle` caption satisfies "the handle is
 * present", or whether Coven owes the labelled field the other kits draw. It
 * satisfies it, and the roster is why: TWO kits draw the caption rather than one
 * — Coven and S.N.I.D.E. — and both draw it in one responsive tree, so it is on
 * screen at 375px and at 1280px alike. The issue measured four archetypes in a
 * browser and read a caption as an absence.
 *
 * The handle is auto-derived, unique and permanent (ADR-0019). It is not an
 * editable field on any kit: five kits draw it as a `readOnly` input, two as a
 * caption under the name, and every kit draws it a second time in the credential
 * card's eyebrow. So what is asserted below is the pair of claims that are
 * actually true of it — it is VISIBLE at both widths, and it is NEVER EDITABLE —
 * and the ordered set is the four fields a caret can change.
 *
 * ## What is deliberately not asserted
 *
 * Nothing about paint, geometry or ornament. Which face a kit's name field
 * wears, whether its commit is an inline button or a full-bleed band, whether
 * the tail sits inside the sheet or on the page — all of that is the
 * archetype's, and ADR-0090's tree/paint split is what says so. Nor the
 * `[Cancel] … [Save]` order (#646): that is the create surface's guard, and this
 * issue's AC 2 is about the DESTRUCTIVE action against the primary one.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import i18n from '../../../i18n'
import { resolveVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import type { EditCharacterState } from '../useEditCharacter'
import type { CharacterOut } from '../../../api/auth'

const factor = vi.hoisted(() => ({ value: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

/** Every registered skin, plus the empty slug that lands on the na kit. */
const ARCHETYPES = [...Object.keys(surfaceMap('editCharacter')), '']
const WIDTHS = ['desktop', 'mobile'] as const
/* `[name, width, slug]` — the first two are what `it.each`'s `%s` placeholders
 * print, so a failing row names the kit and the FORM FACTOR rather than naming
 * the kit twice. */
const CASES = WIDTHS.flatMap((width) => ARCHETYPES.map((slug) => [slug || 'na', width, slug] as const))

/**
 * The editable fields, in the order `useEditCharacter` holds them.
 *
 * Read out of the catalogue rather than transcribed: the words that name these
 * boxes are the words INSIDE them since #2793, so the expectation and the render
 * come from one string apiece and a reword cannot make this file lie.
 */
const FIELD_ORDER = [
  'character.namePlaceholder',
  'character.bioPlaceholder',
  'character.taglinePlaceholder',
  'character.locationPlaceholder',
] as const

const forms = i18n.getFixedT(null, 'forms')

const HANDLE = 'molly'

function character(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 1,
    username: HANDLE,
    display_name: 'Molly',
    bio: 'Doing very human things.',
    tagline: 'Slow spells, strong tea.',
    avatar_url: '',
    location: 'PDX',
    level: 4,
    score: 340,
    all_time_score: 340,
    faction_slug: '',
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
    location: 'PDX',
    setLocation: () => {},
    avatarFile: null,
    avatarSource: null,
    setAvatarSource: () => {},
    avatarPreview: null,
    avatarError: '',
    setAvatarError: () => {},
    handleAvatarChange: () => {},
    handleAvatarConfirm: () => {},
    saving: false,
    canSubmit: true,
    error: '',
    handleSubmit: () => {},
    deleting: false,
    handleDelete: () => {},
    ...overrides,
  }
}

function renderSkin(slug: string, width: 'desktop' | 'mobile'): string {
  factor.value = width
  const Archetype = resolveVariant(surfaceMap('editCharacter'), slug)
  try {
    return renderToStaticMarkup(
      <MemoryRouter>
        <Archetype state={state({ character: character({ faction_slug: slug }) })} />
      </MemoryRouter>,
    )
  } finally {
    factor.value = 'desktop'
  }
}

/**
 * The placeholder of every EDITABLE `<input>`/`<textarea>`, in source order.
 *
 * `readonly` is filtered out rather than counted, which is the whole of the
 * handle ruling in the header: five kits spell the handle as a read-only box and
 * two as a caption, and a set that counted the box would be asserting a
 * TREATMENT rather than a field. File and hidden inputs are skipped too — each
 * sits behind a button that names itself (`PortraitPicker`, #1149) and none of
 * them is a form field.
 */
function editableFields(html: string): string[] {
  const found: string[] = []
  for (const [, attrs] of html.matchAll(/<(?:input|textarea)\b([^>]*)>/g)) {
    if (/type="(?:file|hidden)"/.test(attrs)) continue
    if (/\breadonly\b/i.test(attrs)) continue
    found.push(/placeholder="([^"]*)"/.exec(attrs)?.[1] ?? '<unnamed>')
  }
  return found
}

describe('the field set is the same on every kit, at both widths (AC 1)', () => {
  it('the roster is the registry, not a list kept by hand', () => {
    // Not a count: the derivation is the point. A tenth kit is covered the day
    // it registers, and a registry that emptied would fail here rather than
    // pass every row below by scanning nothing.
    expect(ARCHETYPES.length).toBeGreaterThan(1)
  })

  it.each(CASES)('%s on %s: name, bio, tagline, location — in that order and no others', (_name, width, slug) => {
    expect(editableFields(renderSkin(slug, width))).toEqual(FIELD_ORDER.map((key) => forms(key)))
  })

  it.each(CASES)('%s on %s: the handle is on the page and cannot be typed into', (_name, width, slug) => {
    const html = renderSkin(slug, width)
    // Present — as a read-only box, as a caption, or as the credential card's
    // eyebrow. Which of the three is the kit's dress; that it is legible on the
    // form factor the player is on is not.
    expect(html, 'the auto-derived handle is not shown at all').toContain(`@${HANDLE}`)
    // And never editable: ADR-0019 derives it, so a caret in it would be a
    // control that cannot change what it holds.
    expect(
      editableFields(html),
      'the handle is a readout, never a field',
    ).not.toContain(forms('character.handlePlaceholder'))
  })
})

describe('the destructive action follows the primary one, on every kit and both widths (AC 2)', () => {
  /**
   * The delete control's own TEXT, not an `aria-label` anywhere on the page —
   * the same distinction the create-side guard draws for its cancel.
   * `DeleteCharacter` renders the label as the button's only child, and
   * `textTransform` is CSS, so the catalogue string is what lands in the markup.
   */
  const DELETE = forms('editCharacter.delete')
  const deleteAt = (html: string) => html.search(new RegExp(`>\\s*${DELETE}\\s*<`))

  it.each(CASES)('%s on %s: save is drawn before delete', (_name, width, slug) => {
    const html = renderSkin(slug, width)
    const save = html.indexOf('type="submit"')
    const remove = deleteAt(html)
    expect(save, 'no commit control on the page').toBeGreaterThan(-1)
    expect(remove, 'no delete control on the page').toBeGreaterThan(-1)
    expect(
      save,
      'the irreversible act may not be read before the ordinary one (#2991 AC 2)',
    ).toBeLessThan(remove)
  })

  it.each(CASES)('%s on %s: exactly one commit control', (_name, width, slug) => {
    // Two would mean a skin kept a second footer for one width — which is what
    // the na phone column's sticky Save bar was.
    expect(renderSkin(slug, width).split('type="submit"').length - 1).toBe(1)
  })
})
