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
 * The handle is auto-derived, unique and permanent (ADR-0019), so it is not an
 * editable field on ANY kit: five draw it as a `readOnly` input, two as a
 * caption under the name. What the ruling turns on is that those two treatments
 * are the same OFFER — the handle is legible, and reaching it costs a reader
 * nothing — so the two rows below assert exactly that pair of claims:
 *
 *   - it is drawn by the FORM, not only by the credential card. Every kit mounts
 *     `CredentialCard`, which prints `@handle` in its eyebrow unconditionally, so
 *     a page-wide search for the string is a test that cannot fail. What is
 *     asserted is the handle OUTSIDE that card.
 *   - no focusable control holds it. That is the difference between the caption
 *     and the box that matters to a keyboard: a `readOnly` input is still a tab
 *     stop, a caption is not — and neither is a control a player can change. A
 *     kit that made the handle a live `<input>` would fail here, which is the
 *     regression the ruling is actually protecting against.
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
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import i18n from '../../../i18n'
import { resolveVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import { aCharacter, anEditCharacterState } from '../../../test/fixtures'

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

/**
 * One render per (slug, width), shared by all four tables.
 *
 * Four `it.each(CASES)` blocks over ten archetypes at two widths is eighty
 * renders of the same twenty trees. Nothing below mutates the markup, and the
 * archetypes are pure functions of the state — so the cache is a memo, not a
 * fixture shortcut, and a suite that needed a DIFFERENT state would take its own
 * `renderSkin` rather than a parameter on this one.
 */
const RENDERS = new Map<string, string>()

function renderSkin(slug: string, width: 'desktop' | 'mobile'): string {
  const key = `${slug}@${width}`
  const cached = RENDERS.get(key)
  if (cached !== undefined) return cached

  factor.value = width
  const Archetype = resolveVariant(surfaceMap('editCharacter'), slug)
  try {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Archetype
          state={anEditCharacterState({
            character: aCharacter({ username: HANDLE, display_name: 'Molly', faction_slug: slug }),
          })}
        />
      </MemoryRouter>,
    )
    RENDERS.set(key, html)
    return html
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

/**
 * The markup with the credential card cut out of it.
 *
 * THE CARD IS WHY A PAGE-WIDE HANDLE SEARCH CANNOT FAIL. Every kit mounts
 * `CredentialCard`, and its eyebrow prints `@handle` unconditionally — so
 * `expect(html).toContain('@molly')` is green on a kit whose FORM drops the
 * handle entirely, which is the defect #2991 was filed on for the na phone
 * column. The assertion has to be about what the form draws.
 *
 * The cut is between two landmarks rather than a tag balance, because a
 * substring scan is what every row here does anyway:
 *
 *   - the START is the card's root, found by `--fc-bg:`. That custom property is
 *     DECLARED exactly once, on `CredentialCard`'s outermost div, and read as
 *     `var(--fc-bg)` by its descendants — so the declaration with its colon is
 *     the root and nothing else. The eyebrow is inside it, which is what the
 *     first version of this helper got wrong by cutting from the portrait ring:
 *     the handle is printed ABOVE the ring, so cutting from the ring left it in.
 *   - the END is the name field's placeholder, which every kit draws after the
 *     card. Nothing between the two is the form's: the five kits that spell the
 *     handle as a `readOnly` box and the two that caption it both draw it AFTER
 *     the name field, never between the card and it.
 *
 * The rows that use this assert the cut actually removed something, so a kit
 * that stopped mounting the card would fail here rather than fall back to the
 * un-failable search.
 */
function outsideTheCard(html: string): string {
  const card = html.indexOf('--fc-bg:')
  const firstField = html.indexOf(`placeholder="${forms('character.namePlaceholder')}"`)
  if (card === -1 || firstField === -1 || firstField < card) return html
  return html.slice(0, card) + html.slice(firstField)
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

  it.each(CASES)('%s on %s: the FORM draws the handle, not just the credential card', (_name, width, slug) => {
    const html = renderSkin(slug, width)
    const form = outsideTheCard(html)
    const count = (source: string) => source.split(`@${HANDLE}`).length - 1
    // The cut's OWN premise, asserted per kit rather than trusted: if the card
    // were not found the helper returns the page whole, and this row would be
    // the un-failable page-wide search it exists to replace.
    expect(
      count(form),
      'the credential card was not found, so nothing was cut and this row proves nothing',
    ).toBeLessThan(count(html))
    expect(
      form,
      'the handle is only on the credential card — the form itself drops it',
    ).toContain(`@${HANDLE}`)
  })

  it.each(CASES)('%s on %s: and no focusable control holds it', (_name, width, slug) => {
    const html = renderSkin(slug, width)
    // A caption is not a tab stop and a `readOnly` input is one that cannot be
    // changed; a live `<input>` would be neither, and that is the regression.
    expect(
      editableFields(html),
      'the handle is a readout, never a field',
    ).not.toContain(forms('character.handlePlaceholder'))
    for (const [, attrs] of html.matchAll(/<input\b([^>]*)>/g)) {
      if (!attrs.includes(`value="@${HANDLE}"`)) continue
      expect(attrs, 'a box holding the handle must be readOnly').toMatch(/\breadonly\b/i)
    }
  })
})

describe('the destructive action follows the primary one, on every kit and both widths (AC 2)', () => {
  /**
   * The delete control's own TEXT, not an `aria-label` anywhere on the page —
   * the same distinction the create-side guard draws for its cancel.
   * `DeleteCharacter` renders the label as the button's only child, and
   * `textTransform` is CSS, so the catalogue string is what lands in the markup.
   *
   * ESCAPED, because it is CATALOGUE COPY going into a regex. Today it reads
   * "Delete this character" and every character in it is inert; a reword to
   * "Delete this character?" or "Delete (permanently)" would turn a literal into
   * a metacharacter and quietly change what this file matches. A guard whose
   * meaning depends on nobody adding punctuation is not a guard.
   */
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const textAt = (html: string, word: string) =>
    html.search(new RegExp(`>\\s*${escapeRegExp(word)}\\s*<`))

  const DELETE = forms('editCharacter.delete')
  const CONFIRM_YES = forms('editCharacter.deleteConfirmYes')

  it.each(CASES)('%s on %s: save is drawn before the delete affordance', (_name, width, slug) => {
    const html = renderSkin(slug, width)
    const save = html.indexOf('type="submit"')
    const remove = textAt(html, DELETE)
    expect(save, 'no commit control on the page').toBeGreaterThan(-1)
    expect(remove, 'no delete control on the page').toBeGreaterThan(-1)
    expect(
      save,
      'the irreversible act may not be read before the ordinary one (#2991 AC 2)',
    ).toBeLessThan(remove)
  })

  /**
   * The row above measures the AFFORDANCE. The control that actually spends the
   * character is the confirm's own key, drawn only once `DeleteCharacter`'s
   * local `confirming` is true — so "save before delete" has to hold for that
   * node too, or the guard is pinning the safe half of a two-step.
   *
   * IT IS ASSERTED FROM SOURCE, AND THAT IS A LIMIT WORTH STATING. `confirming`
   * is local state with no prop over it, this suite renders through
   * `renderToStaticMarkup`, and the repo carries no DOM harness to click with —
   * so the panel cannot be rendered open here. What CAN be established is the
   * property that makes the rendered rows above carry to it: the confirm is an
   * early return from the same component, in the same slot, with no portal. A
   * panel that took the affordance's exact place inherits its position on every
   * one of the ten kits at both widths, which is what the rows above measured.
   *
   * A portal is the specific thing that would break it — it would move the
   * irreversible control out of the tail and out of the order entirely — so it
   * is named rather than left to the shape match.
   */
  it('the confirm is an early return in the affordance’s own slot, never a portal', () => {
    const slots = readFileSync(
      fileURLToPath(new URL('../editCharacterSlots.tsx', import.meta.url)),
      'utf8',
    )
    expect(
      slots,
      'the button and the panel are two returns from ONE component, so they share a slot',
    ).toMatch(/if \(!confirming\) \{\s*return \(/)
    expect(slots, 'and the panel is the other return').toContain(
      "t('editCharacter.deleteConfirmYes')",
    )
    expect(
      slots,
      'a portal would lift the irreversible control out of the tail and out of the order',
    ).not.toContain('createPortal')
    // The confirm's own commit word exists and is not the affordance's, which is
    // what makes them two different controls rather than one relabelled.
    expect(CONFIRM_YES).not.toBe(DELETE)
  })

  it.each(CASES)('%s on %s: exactly one commit control', (_name, width, slug) => {
    // Two would mean a skin kept a second footer for one width — which is what
    // the na phone column's sticky Save bar was.
    expect(renderSkin(slug, width).split('type="submit"').length - 1).toBe(1)
  })
})
