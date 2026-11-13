/**
 * Every edit-character kit offers the same fields in the same order and draws
 * delete AFTER the commit, at both widths (#2991). Rendered markup, since both
 * defects were properties of one tree at one width. Reachability of each field
 * is `editCharacterDispatch.test.tsx`'s job; this file pins the SET and ORDER.
 * Roster derived from the registry (#2955).
 *
 * The handle is a readout (ADR-0019; #2991 decision 3): a `readOnly` box or a
 * caption (Coven, S.N.I.D.E.). Asserted: the FORM draws it (not just
 * `CredentialCard`, which always prints it), and no editable control holds it.
 *
 * Paint, geometry and `[Cancel] … [Save]` order (#646) are not asserted here.
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
/* `[name, width, slug]`: the first two feed `it.each`'s `%s` placeholders. */
const CASES = WIDTHS.flatMap((width) => ARCHETYPES.map((slug) => [slug || 'na', width, slug] as const))

/** The editable fields in `useEditCharacter` order, as catalogue keys (#2793). */
const FIELD_ORDER = [
  'character.namePlaceholder',
  'character.bioPlaceholder',
  'character.taglinePlaceholder',
  'character.locationPlaceholder',
] as const

const forms = i18n.getFixedT(null, 'forms')

const HANDLE = 'molly'

/** One render per (slug, width), memoised: the archetypes are pure of the state. */
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
 * Placeholder of every EDITABLE `<input>`/`<textarea>`, in source order.
 * `readonly` (the handle box) and file/hidden inputs are skipped.
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
 * The markup with `CredentialCard` (which always prints `@handle`) cut out.
 * Start: `--fc-bg:`, declared only on the card's root (the handle sits above the
 * portrait ring, so cutting from the ring is wrong). End: the name field's
 * placeholder; every kit draws its handle after it.
 */
function outsideTheCard(html: string): string {
  const card = html.indexOf('--fc-bg:')
  const firstField = html.indexOf(`placeholder="${forms('character.namePlaceholder')}"`)
  if (card === -1 || firstField === -1 || firstField < card) return html
  return html.slice(0, card) + html.slice(firstField)
}

describe('the field set is the same on every kit, at both widths (AC 1)', () => {
  it('the roster is the registry, not a list kept by hand', () => {
    // An emptied registry would pass every row below by scanning nothing.
    expect(ARCHETYPES.length).toBeGreaterThan(1)
  })

  it.each(CASES)('%s on %s: name, bio, tagline, location — in that order and no others', (_name, width, slug) => {
    expect(editableFields(renderSkin(slug, width))).toEqual(FIELD_ORDER.map((key) => forms(key)))
  })

  it.each(CASES)('%s on %s: the FORM draws the handle, not just the credential card', (_name, width, slug) => {
    const html = renderSkin(slug, width)
    const form = outsideTheCard(html)
    const count = (source: string) => source.split(`@${HANDLE}`).length - 1
    // If the card isn't found the helper returns the page whole.
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
   * The delete control's own text node, not an `aria-label`. Escaped: catalogue
   * copy may gain regex metacharacters in a reword.
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
   * The confirm key sits behind local `confirming` state no static render can
   * open, so source proves it inherits the affordance's position: an early return
   * from the same component, no portal.
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
    expect(CONFIRM_YES).not.toBe(DELETE)
  })

  it.each(CASES)('%s on %s: exactly one commit control', (_name, width, slug) => {
    // Two would mean a second footer for one width.
    expect(renderSkin(slug, width).split('type="submit"').length - 1).toBe(1)
  })
})
