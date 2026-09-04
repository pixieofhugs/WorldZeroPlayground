/**
 * Every propose-task kit asks for the same things, in the same order, inside
 * the same sheet — at both widths (#2993).
 *
 * ## The seam
 *
 * The rendered markup of every archetype `surfaceMap('proposeTask')` holds, at
 * both form factors. #2993's defect is a property of one tree: the na kit drew
 * the target-faction radiogroup OUTSIDE its `<form>`, above a hand-authored
 * card, because it was the one kit not on the composer chassis. Six kits draw
 * `sheet → heading → section(factionLabel) → radiogroup` and #2995 is filed on
 * the three that do not — so "the row is the form's first question" is a claim
 * about nine forms that nothing was making about any of them.
 *
 * A source scan cannot see it (each kit spells its own chips), and a suite that
 * renders one archetype once cannot either.
 *
 * `proposeTaskBreadcrumb.test.tsx` is the sibling and the split is deliberate:
 * it asks whether the trail is the shared one and whether it sits ABOVE the
 * sheet. This file asks what is INSIDE, and in what order.
 *
 * ## The roster is derived, never typed
 *
 * `surfaceMap('proposeTask')` plus `''`, which resolves to the na kit the same
 * way an unregistered slug does. A hand-listed `SITES` array is the exact
 * failure #2955 is open for and a typed roster cannot notice a tenth kit
 * (#2815), so the tenth is covered the day it registers with nothing to append.
 * `proposeTaskState` is the fixture the other five propose suites already share
 * — the thirty-key literal is built once, in one place (#2538).
 *
 * ## What is deliberately not asserted
 *
 * Nothing about paint, geometry or ornament: which face a kit's name field
 * wears, whether its commit is an inline button or a full-bleed band, whether
 * its chips are pills or slips. That is the archetype's, and ADR-0090's
 * tree/paint split is what says so. The busy CTA's `.control-off` treatment is
 * `submitControlOff.test.tsx`'s and is not restated here.
 *
 * Nothing here proves a pixel: `renderToStaticMarkup`, no DOM (SPEC-testing.md).
 * Visual QA is outstanding and stated on the PR.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import i18n from '../../../i18n'
import { resolveVariant } from '../../../utils/factionDispatch'
import { resolvedArchetype } from '../../../factions/lazyArchetype'
import { surfaceMap } from '../../../factions'
import { proposeTaskState } from './proposeTaskState'
import type { ProposeTaskState } from '../useProposeTask'

const factor = vi.hoisted(() => ({ value: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

/** Every registered kit, plus the empty slug that lands on the na one. */
const ARCHETYPES = [...Object.keys(surfaceMap('proposeTask')), '']
const WIDTHS = ['desktop', 'mobile'] as const
/* `[name, width, slug]` — the first two are what `it.each`'s `%s` placeholders
 * print, so a failing row names the kit AND the form factor. */
const CASES = WIDTHS.flatMap((width) =>
  ARCHETYPES.map((slug) => [slug || 'na', width, slug] as const),
)

const forms = i18n.getFixedT(null, 'forms')

/**
 * The fields the form asks for, in the order `useProposeTask` holds them.
 *
 * Read out of the catalogue rather than transcribed: since #2598 the words that
 * name these boxes are the words INSIDE them, so the expectation and the render
 * come from one string apiece and a reword cannot make this file lie. The state
 * is the page's opening position — not a metatask — so the worth field is the
 * base-points one and the notes field is drawn.
 */
const FIELD_ORDER = [
  'proposeTask.fields.name.label',
  'proposeTask.fields.description.placeholder',
  'proposeTask.fields.basePoints.placeholder',
  'proposeTask.fields.notes.label',
] as const

/**
 * One render per (slug, width), shared by every table below.
 *
 * Five tables over ten archetypes at two widths is a hundred renders of the
 * same twenty trees. Nothing below mutates the markup and the archetypes are
 * pure functions of the state prop, so the cache is a memo rather than a
 * fixture shortcut — a table needing a DIFFERENT state calls `render` itself.
 */
const RENDERS = new Map<string, string>()

function render(
  slug: string,
  width: 'desktop' | 'mobile',
  overrides: Partial<ProposeTaskState> = {},
): string {
  factor.value = width
  const deferred = resolveVariant(surfaceMap('proposeTask'), slug)
  const Archetype = resolvedArchetype(deferred)
  // Only undefined if the chunk never landed, which `test/preloadArchetypes.ts`
  // rules out — throwing says that, where rendering `undefined` would not.
  if (!Archetype) throw new Error(`no proposeTask archetype resolved for "${slug}"`)
  try {
    return renderToStaticMarkup(
      <MemoryRouter>
        <Archetype state={proposeTaskState({ factionSlug: slug, ...overrides })} />
      </MemoryRouter>,
    )
  } finally {
    factor.value = 'desktop'
  }
}

function skin(slug: string, width: 'desktop' | 'mobile'): string {
  const key = `${slug}@${width}`
  const cached = RENDERS.get(key)
  if (cached !== undefined) return cached
  const html = render(slug, width)
  RENDERS.set(key, html)
  return html
}

/**
 * The placeholder of every editable `<input>`/`<textarea>`, in source order.
 *
 * Read-only, file and hidden inputs are skipped: none of them is a field a
 * proposer fills in. Every box on this page is placeholder-only by ruling
 * (#2598), so an unnamed one is a defect and prints as `<unnamed>` rather than
 * being dropped.
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

/** The index of a control whose own TEXT is `word`, not an aria-label. */
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const textAt = (html: string, word: string) =>
  html.search(new RegExp(`>\\s*${escapeRegExp(word)}\\s*<`))

describe('the roster is the registry, not a list kept by hand', () => {
  it('walks every registered kit and the fall-through', () => {
    // Not a count: the derivation is the point. A registry that emptied would
    // fail here rather than pass every row below by scanning nothing.
    expect(ARCHETYPES.length, 'slugs in surfaceMap("proposeTask") plus ""').toBeGreaterThan(9)
  })
})

describe('the form asks the same things in the same order (AC 1)', () => {
  it.each(CASES)(
    '%s on %s: name, description, worth, notes — in that order and no others',
    (_name, width, slug) => {
      expect(editableFields(skin(slug, width))).toEqual(FIELD_ORDER.map((key) => forms(key)))
    },
  )

  it.each(CASES)('%s on %s: the worth field follows the metatask tick', (_name, width, slug) => {
    // The one field that CHANGES with the state rather than moving: ticking
    // "create as metatask" swaps base points for the bonus and drops the notes
    // box, because `planProposalSubmission` carries neither on that branch
    // (#1823). Same slot, same order, one key different.
    const html = render(slug, width, { canProposeMetatask: true, isMetatask: true })
    expect(editableFields(html)).toEqual([
      forms('proposeTask.fields.name.label'),
      forms('proposeTask.fields.description.placeholder'),
      forms('proposeTask.fields.bonusPoints.placeholder'),
    ])
  })
})

/**
 * The one kit that still draws the row outside its `<form>`, and it is NOT
 * grandfathered — it is #2995's, in as many words.
 *
 * `EverymenProposeTask`'s header argues the placement ("the pick is what the
 * card then wears, so it cannot live inside the thing it dresses"); six kits
 * disprove it by shipping, #2993 moved the na kit in, and #2995 moves Everymen
 * and rewrites that paragraph. Editing it here would be this lane reaching into
 * a file another issue owns.
 *
 * So the exception is asserted BOTH WAYS: the row below skips it, and the row
 * under that pins it still outside. The day #2995 lands, that second row goes
 * red and this set is deleted — which is the opposite of a skip list, where
 * fixing the defect changes nothing and the entry outlives it.
 */
const OUTSIDE_THE_FORM = new Set(['everymen'])
const inside = CASES.filter(([, , slug]) => !OUTSIDE_THE_FORM.has(slug))
const outside = CASES.filter(([, , slug]) => OUTSIDE_THE_FORM.has(slug))

describe('the target faction is the form’s FIRST question (AC 2, #2993)', () => {
  it('the exception list names kits that exist', () => {
    // A typo'd slug would silently exempt nothing and pin nothing, leaving both
    // rows below green about a kit that was never measured.
    for (const slug of OUTSIDE_THE_FORM) expect(ARCHETYPES).toContain(slug)
  })

  it.each(inside)('%s on %s: the radiogroup is inside the form', (_name, width, slug) => {
    // The defect this issue was filed on. Every kit wraps its sheet in the
    // page's one `<form>`, so — with no DOM to ask — "inside the sheet" is read
    // off the order of the markup the same way `proposeTaskBreadcrumb` reads
    // "above" it. The na kit drew this row before the `<form>` tag entirely.
    const html = skin(slug, width)
    const form = html.indexOf('<form')
    const group = html.indexOf('role="radiogroup"')
    expect(form, 'the form is the sheet boundary this reads against').toBeGreaterThan(-1)
    expect(group, 'no target-faction radiogroup on the page').toBeGreaterThan(-1)
    expect(group, 'the pick belongs to the form it dresses').toBeGreaterThan(form)
  })

  it.each(outside)('%s on %s: is still outside it, and that is #2995’s', (_name, width, slug) => {
    const html = skin(slug, width)
    expect(
      html.indexOf('role="radiogroup"'),
      'this kit moved in — delete it from OUTSIDE_THE_FORM and let the row above cover it',
    ).toBeLessThan(html.indexOf('<form'))
  })

  it.each(CASES)('%s on %s: and it comes before the first field', (_name, width, slug) => {
    // "First section" without a DOM: nothing a proposer fills in may be read
    // before the row that says who the task is for.
    const html = skin(slug, width)
    const group = html.indexOf('role="radiogroup"')
    const firstField = html.indexOf(`placeholder="${forms('proposeTask.fields.name.label')}"`)
    expect(firstField, 'no name field on the page').toBeGreaterThan(-1)
    expect(group).toBeLessThan(firstField)
  })

  it.each(CASES)('%s on %s: one group, and every option in it', (_name, width, slug) => {
    // Eight mutually exclusive choices are ONE radiogroup on every skin — na
    // plus the seven factions (#1824). A kit that split the row in two, or that
    // reached for a horizontally scrolling `ChipRow` and buried three options,
    // fails here.
    const html = skin(slug, width)
    expect(html.match(/role="radiogroup"/g)).toHaveLength(1)
    expect(html.match(/role="radio"/g)).toHaveLength(8)
  })
})

describe('the exits come before the commit, on every kit and both widths (#646)', () => {
  it.each(CASES)('%s on %s: cancel is drawn before submit', (_name, width, slug) => {
    const html = skin(slug, width)
    const cancel = textAt(html, forms('proposeTask.submit.cancel'))
    const submit = html.indexOf('type="submit"')
    expect(cancel, 'no cancel control on the page').toBeGreaterThan(-1)
    expect(submit, 'no commit control on the page').toBeGreaterThan(-1)
    expect(cancel, '[Cancel] … [Submit] is the global order (#646)').toBeLessThan(submit)
  })

  it.each(CASES)('%s on %s: exactly one commit control', (_name, width, slug) => {
    // Two would mean a kit kept a second footer for one width — the defect the
    // na character form's sticky phone bar was (#2991).
    expect(skin(slug, width).split('type="submit"').length - 1).toBe(1)
  })
})
