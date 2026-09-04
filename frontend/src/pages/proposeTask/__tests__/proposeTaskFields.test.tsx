/**
 * The propose form's fields, as a keyboard and a screen reader meet them
 * (#2993, the surface `createCharacterFields.test.tsx` could not see).
 *
 * THE SEAM IS THE RENDERED FIELD, not the file that draws it — and the sweep is
 * pointed at THIS registry, which is the whole reason the file exists.
 * `WORLD_ZERO_STYLE.md` states the lesson twice over: "#2488's Done-when read
 * 'all eight archetypes' and meant the eight CREATE plates; the guard it left
 * behind sweeps that registry, so the identical pair of declarations on the
 * EDIT page went on shipping for months, invisible to a green build and to the
 * very test written to catch them." `composerFocusRing.test.tsx` and
 * `createCharacterFields.test.tsx` walk `editPraxis` and `createCharacter`.
 * Nothing walked `proposeTask`, and the na kit shipped its rebuild with
 * `outline: 'none'` on the box every field on the page spreads — no focus
 * indicator on any of the four, on na and on Albescent, at either width.
 *
 * ## Why the row is "no suppression" and not "carries the shared ring"
 *
 * An inline `outline: none` beats any stylesheet, so a plate that sets it has
 * no ring whatever else it carries — that is exactly what #2266 found in the
 * composer, and `WORLD_ZERO_STYLE.md` again: "a suppression with nothing in its
 * place is the defect, and stripping it is the whole repair", because the worst
 * case then is the user agent's own ring, which is a visible ring.
 * `data-composer-field` — the #2266 rule, `currentColor` at a negative offset —
 * is what a plate adds on top so the ring is the skin's ink rather than browser
 * chrome, and a kit may deliberately keep the UA ring instead (Singularity says
 * so in its create header). So the derived row asks for no suppression, and the
 * pairing is asserted where a kit opts into it.
 *
 * ## The roster is derived, never typed
 *
 * `surfaceMap('proposeTask')` plus `''`, at both form factors. A tenth kit is
 * swept the day it registers, with nothing to append (#2955, #2815), and
 * `proposeTaskState` is the fixture the other propose suites already share.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import { resolveVariant } from '../../../utils/factionDispatch'
import { resolvedArchetype } from '../../../factions/lazyArchetype'
import { surfaceMap } from '../../../factions'
import { proposeTaskState } from './proposeTaskState'

const factor = vi.hoisted(() => ({ value: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

const DefaultProposeTask = (await import('../archetypes/DefaultProposeTask')).default

const ARCHETYPES = [...Object.keys(surfaceMap('proposeTask')), '']
const WIDTHS = ['desktop', 'mobile'] as const
const CASES = WIDTHS.flatMap((width) =>
  ARCHETYPES.map((slug) => [slug || 'na', width, slug] as const),
)

/**
 * The kits whose every field carries an `aria-label` — which is all of them but
 * one. See the row that pins the exception; it is a defect rather than a
 * dispensation, and it is asserted from the other side so that fixing it
 * retires the filter.
 */
const UNNAMED_FIELD = new Set(['wow'])
const NAMED_CASES = CASES.filter(([, , slug]) => !UNNAMED_FIELD.has(slug))

function renderSkin(slug: string, width: 'desktop' | 'mobile'): string {
  factor.value = width
  const deferred = resolveVariant(surfaceMap('proposeTask'), slug)
  const Archetype = resolvedArchetype(deferred)
  if (!Archetype) throw new Error(`no proposeTask archetype resolved for "${slug}"`)
  try {
    return renderToStaticMarkup(
      <MemoryRouter>
        {/* Metatask ON so the bonus field is drawn too — the one field the
            opening state hides, and one a caret can reach like any other. */}
        <Archetype
          state={proposeTaskState({ factionSlug: slug, canProposeMetatask: true })}
        />
      </MemoryRouter>,
    )
  } finally {
    factor.value = 'desktop'
  }
}

/** Every `<input>`/`<textarea>` a caret can land in, with its attributes. */
function textFields(html: string): string[] {
  const found: string[] = []
  for (const [, attrs] of html.matchAll(/<(?:input|textarea)\b([^>]*)>/g)) {
    if (/type="(?:file|hidden)"/.test(attrs)) continue
    found.push(attrs)
  }
  return found
}

const attr = (attrs: string, name: string): string | null =>
  new RegExp(`${name}="([^"]*)"`).exec(attrs)?.[1] ?? null

describe('every propose-task field can be seen to have focus', () => {
  it('the roster is the registry, not a list kept by hand', () => {
    expect(ARCHETYPES.length, 'slugs in surfaceMap("proposeTask") plus ""').toBeGreaterThan(9)
  })

  it.each(CASES)('%s on %s: draws fields at all', (_name, width, slug) => {
    // The floor that makes every row below mean something: a sweep that renders
    // no fields passes all of them.
    expect(textFields(renderSkin(slug, width)).length).toBeGreaterThanOrEqual(4)
  })

  it.each(CASES)('%s on %s: no field suppresses its focus ring', (_name, width, slug) => {
    for (const field of textFields(renderSkin(slug, width))) {
      expect(
        attr(field, 'style') ?? '',
        `outline killed on "${attr(field, 'aria-label')}"`,
      ).not.toMatch(/outline:\s*none/)
    }
  })

  it.each(CASES)('%s on %s: a kit that takes the shared ring takes it on EVERY field', (_name, width, slug) => {
    // Half-dressed is the failure this catches: one box wearing the skin's own
    // `currentColor` ring and the next wearing the browser's is a page whose
    // focus indicator changes as you tab across it. A kit that opts out
    // entirely is covered by the row above, which is #2266's actual rule.
    const fields = textFields(renderSkin(slug, width))
    const dressed = fields.filter((field) => field.includes('data-composer-field'))
    if (dressed.length === 0) return
    expect(dressed.length, 'some fields take the shared ring and some do not').toBe(fields.length)
  })

  it.each(CASES)('%s on %s: every field names itself in the box', (_name, width, slug) => {
    // A placeholder-only form with a box that carries no placeholder is a box
    // with nothing written on it at all (#2598). True of every kit.
    for (const field of textFields(renderSkin(slug, width))) {
      expect(
        attr(field, 'placeholder'),
        `a placeholder-only field with no placeholder: ${field.trim()}`,
      ).toBeTruthy()
    }
  })

  it.each(NAMED_CASES)('%s on %s: and announces itself to a screen reader', (_name, width, slug) => {
    // This form is placeholder-only (#2598), so a box with no placeholder is an
    // unlabelled box to a sighted player and a box with no `aria-label` is an
    // unlabelled box to a screen reader. Both are asserted.
    //
    // NOT that the two strings MATCH, which is where the create-side twin of
    // this row goes one step further. On this surface they deliberately differ
    // on one field: the description box reads "Task Description" and announces
    // "Description", because in the box the word has to say which description
    // it is and in the announcement the section already has. Six kits copy that
    // pair from the na kit and `SingularityProposeTask`'s header records it by
    // name, so a row demanding equality here would be asserting against a
    // ruling rather than for an absence.
    for (const field of textFields(renderSkin(slug, width))) {
      expect(
        attr(field, 'aria-label'),
        `a textbox with no accessible name: ${field.trim()}`,
      ).toBeTruthy()
    }
  })

  it.each(WIDTHS)('wow’s points field is the one gap, and it is a real one — %s', (width) => {
    // ASSERTED BOTH WAYS RATHER THAN SKIPPED. `WowProposeTask`'s points input
    // carries `placeholder="Points"` and no `aria-label`, where all eight other
    // kits carry both — so it is the only field on this surface whose name a
    // screen reader has to fall back to the placeholder for. That is a genuine
    // defect and a one-attribute fix, but it is in a faction kit #2993's lane
    // may not edit, so it is pinned here instead of quietly excluded: the day
    // someone adds the attribute, this row goes red and `NAMED_CASES` loses its
    // filter. A skip list would have let the fix arrive and the exception stay.
    const unnamed = textFields(renderSkin('wow', width)).filter(
      (field) => attr(field, 'aria-label') === null,
    )
    expect(unnamed.length, 'wow named its points field — delete this row').toBe(1)
    expect(attr(unnamed[0]!, 'placeholder'), 'and it is the points field').toBeTruthy()
  })
})

describe('the na kit pairs the suppression it dropped with the shared ring', () => {
  // Asserted on the archetype by name, the way `unaffiliatedOption`'s dress
  // block is: this is the kit #2993 rebuilt, and the pairing is what makes its
  // ring the sheet's own ink rather than the user agent's chrome.
  it.each(WIDTHS)('every field carries `data-composer-field` — %s', (width) => {
    factor.value = width
    try {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <DefaultProposeTask state={proposeTaskState({ canProposeMetatask: true })} />
        </MemoryRouter>,
      )
      const fields = textFields(html)
      expect(fields.length, 'name, description, worth, notes').toBe(4)
      for (const field of fields) {
        expect(field, `"${attr(field, 'aria-label')}" takes the browser ring`).toContain(
          'data-composer-field',
        )
      }
    } finally {
      factor.value = 'desktop'
    }
  })
})
