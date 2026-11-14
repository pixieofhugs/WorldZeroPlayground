/**
 * Every propose-task kit asks for the same things, in the same order, inside
 * the same sheet — at both widths (#2993: the na kit drew the target-faction
 * radiogroup outside its `<form>`).
 *
 * Roster derived from `surfaceMap('proposeTask')` plus `''` (the na fallback),
 * so a tenth kit is covered on registration (#2955, #2815). Order inside the
 * sheet only; the breadcrumb above it is `proposeTaskBreadcrumb.test.tsx`'s.
 * Paint, geometry and ornament are the archetype's (ADR-0090) and not asserted;
 * nor is `.control-off` (`submitControlOff.test.tsx`). Static markup, no DOM.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import i18n from '../../../i18n'
import { resolveVariant } from '../../../utils/factionDispatch'
import { resolvedArchetype } from '../../../factions/lazyArchetype'
import { surfaceMap } from '../../../factions'
import DefaultEditPraxis from '../../editPraxis/archetypes/DefaultEditPraxis'
import { anEditPraxisState } from '../../../test/fixtures'
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
/* `[name, width, slug]`: `%s` prints the kit and the form factor. */
const CASES = WIDTHS.flatMap((width) =>
  ARCHETYPES.map((slug) => [slug || 'na', width, slug] as const),
)

const forms = i18n.getFixedT(null, 'forms')

/**
 * Fields in `useProposeTask` order, read from the catalogue (placeholders name
 * the boxes since #2598). Opening state: not a metatask.
 */
const FIELD_ORDER = [
  'proposeTask.fields.name.label',
  'proposeTask.fields.description.placeholder',
  'proposeTask.fields.basePoints.placeholder',
  'proposeTask.fields.notes.label',
] as const

/** One render per (slug, width), memoised; a table needing other state calls `render`. */
const RENDERS = new Map<string, string>()

function render(
  slug: string,
  width: 'desktop' | 'mobile',
  overrides: Partial<ProposeTaskState> = {},
): string {
  factor.value = width
  const deferred = resolveVariant(surfaceMap('proposeTask'), slug)
  const Archetype = resolvedArchetype(deferred)
  // `test/preloadArchetypes.ts` rules this out; throw rather than render undefined.
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
 * Placeholders of editable inputs/textareas, in source order. Every box is
 * placeholder-only (#2598), so an unnamed one prints `<unnamed>`.
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
    // A registry that emptied would otherwise pass every row by scanning nothing.
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
    // Metatask swaps base points for bonus and drops notes (#1823).
    const html = render(slug, width, { canProposeMetatask: true, isMetatask: true })
    expect(editableFields(html)).toEqual([
      forms('proposeTask.fields.name.label'),
      forms('proposeTask.fields.description.placeholder'),
      forms('proposeTask.fields.bonusPoints.placeholder'),
    ])
  })
})

describe('the target faction is the form’s FIRST question (AC 2, #2993, #2995)', () => {
  it.each(CASES)('%s on %s: the radiogroup is inside the form', (_name, width, slug) => {
    // No DOM, so "inside the sheet" is read off markup order.
    const html = skin(slug, width)
    const form = html.indexOf('<form')
    const group = html.indexOf('role="radiogroup"')
    expect(form, 'the form is the sheet boundary this reads against').toBeGreaterThan(-1)
    expect(group, 'no target-faction radiogroup on the page').toBeGreaterThan(-1)
    expect(group, 'the pick belongs to the form it dresses').toBeGreaterThan(form)
  })

  it.each(CASES)('%s on %s: and it comes before the first field', (_name, width, slug) => {
    // Nothing a proposer fills in may precede who the task is for.
    const html = skin(slug, width)
    const group = html.indexOf('role="radiogroup"')
    const firstField = html.indexOf(`placeholder="${forms('proposeTask.fields.name.label')}"`)
    expect(firstField, 'no name field on the page').toBeGreaterThan(-1)
    expect(group).toBeLessThan(firstField)
  })

  it.each(CASES)('%s on %s: one group, and every option in it', (_name, width, slug) => {
    // na + seven factions = ONE radiogroup of eight (#1824); no split, no ChipRow.
    const html = skin(slug, width)
    expect(html.match(/role="radiogroup"/g)).toHaveLength(1)
    expect(html.match(/role="radio"/g)).toHaveLength(8)
  })
})

/**
 * The reserved masthead head (#2995). The page reskins on every chip click, so
 * each kit's own masthead height moved the row under the pointer.
 * `ComposerSheet`'s `reserveHead` gives one floor from `useComposerSizes()`;
 * asserted: every kit reads the SAME number. Static markup cannot prove the
 * floor is tall enough for every masthead — that is checked by eye.
 */
describe('the masthead slot is reserved, and by one number (#2995)', () => {
  const boxes = (html: string, hook: 'head' | 'heading') =>
    [...html.matchAll(new RegExp(`<div data-composer-${hook}="" style="([^"]*)"`, 'g'))].map(
      ([, style]) => style,
    )

  it.each(CASES)('%s on %s: the sheet reserves its head', (_name, width, slug) => {
    // One per page: the form's sheet.
    expect(boxes(skin(slug, width), 'head')).toHaveLength(1)
  })

  it.each(CASES)('%s on %s: and the heading block has its floor', (_name, width, slug) => {
    // Only `ComposerHeading` spells it; a hand-rolled heading has no floor.
    expect(boxes(skin(slug, width), 'heading')).toHaveLength(1)
  })

  it.each(CASES)('%s on %s: the success sheet reserves one too', (_name, width, slug) => {
    // Filing must not swap the reserved head for the kit's native one.
    const html = render(slug, width, { success: true })
    expect(boxes(html, 'head'), 'the success sheet is the same sheet').toHaveLength(1)
  })

  it.each(WIDTHS)('every kit reserves the same head and floor on %s', (width) => {
    for (const hook of ['head', 'heading'] as const) {
      const found = ARCHETYPES.map(
        (slug) => [slug || 'na', boxes(skin(slug, width), hook)[0]] as const,
      )
      const values = new Set(found.map(([, style]) => style))
      expect(
        values.size,
        `nine kits, one ${hook} — got ${found.map(([k, v]) => `${k}: ${v}`).join(', ')}`,
      ).toBe(1)
      expect([...values][0], `the ${hook} is a reserved height, not an empty box`).toMatch(
        /min-height:var\(--composer-(head|heading)-height\)/,
      )
    }
  })

  it('a surface that did NOT opt in reserves nothing', () => {
    /* Default OFF; ~thirty composers on other surfaces rely on it. The na
     * composer (ADR-0065 reference) stands for the set. */
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DefaultEditPraxis state={anEditPraxisState()} />
      </MemoryRouter>,
    )
    expect(html).not.toContain('data-composer-head')
    expect(html).not.toContain('data-composer-heading')
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
    // Two would mean a per-width second footer (#2991).
    expect(skin(slug, width).split('type="submit"').length - 1).toBe(1)
  })
})
