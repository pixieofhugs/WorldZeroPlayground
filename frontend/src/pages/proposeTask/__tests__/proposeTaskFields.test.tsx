/**
 * The propose form's fields as a keyboard and screen reader meet them (#2993):
 * the na rebuild shipped `outline: 'none'` on every field, unseen because the
 * focus sweeps walked other registries (see `WORLD_ZERO_STYLE.md`).
 *
 * The derived row asks for NO SUPPRESSION, not the shared ring: an inline
 * `outline: none` beats any stylesheet (#2266), and a kit may keep the UA ring
 * (Singularity). `data-composer-field` pairing is asserted where a kit opts in.
 * Roster derived from `surfaceMap('proposeTask')` plus `''` (#2955).
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

function renderSkin(
  slug: string,
  width: 'desktop' | 'mobile',
  isMetatask = false,
): string {
  factor.value = width
  const deferred = resolveVariant(surfaceMap('proposeTask'), slug)
  const Archetype = resolvedArchetype(deferred)
  if (!Archetype) throw new Error(`no proposeTask archetype resolved for "${slug}"`)
  try {
    return renderToStaticMarkup(
      <MemoryRouter>
        {/* `canProposeMetatask` only offers the mode; `isMetatask` draws the
            bonus branch. Naming rows walk both states (#3030). */}
        <Archetype
          state={proposeTaskState({
            factionSlug: slug,
            canProposeMetatask: true,
            isMetatask,
          })}
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
    // A sweep that renders no fields passes every row below.
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
    // Half-dressed: the focus indicator would change as you tab across.
    const fields = textFields(renderSkin(slug, width))
    const dressed = fields.filter((field) => field.includes('data-composer-field'))
    if (dressed.length === 0) return
    expect(dressed.length, 'some fields take the shared ring and some do not').toBe(fields.length)
  })

  it.each(CASES)('%s on %s: every field names itself in the box', (_name, width, slug) => {
    // Placeholder-only (#2598). Both `isMetatask` branches: the points field is
    // authored once per branch (#3030).
    for (const isMetatask of [false, true] as const) {
      for (const field of textFields(renderSkin(slug, width, isMetatask))) {
        expect(
          attr(field, 'placeholder'),
          `a placeholder-only field with no placeholder (metatask=${isMetatask}): ${field.trim()}`,
        ).toBeTruthy()
      }
    }
  })

  it.each(CASES)('%s on %s: and announces itself to a screen reader', (_name, width, slug) => {
    // Not that placeholder and aria-label MATCH: the description box reads
    // "Task Description" but announces "Description", by ruling (recorded in
    // `SingularityProposeTask`'s header). Both branches, as above (#3030).
    for (const isMetatask of [false, true] as const) {
      for (const field of textFields(renderSkin(slug, width, isMetatask))) {
        expect(
          attr(field, 'aria-label'),
          `a textbox with no accessible name (metatask=${isMetatask}): ${field.trim()}`,
        ).toBeTruthy()
      }
    }
  })
})

describe('the na kit pairs the suppression it dropped with the shared ring', () => {
  // By name: the kit #2993 rebuilt.
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
