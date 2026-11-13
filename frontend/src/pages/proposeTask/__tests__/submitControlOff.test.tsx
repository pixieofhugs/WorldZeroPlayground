/**
 * The propose form's primary action once BUSY (#2994). #2486 ruled a disabled
 * primary drops its CTA paint for `.control-off` rather than fading (opacity
 * loses contrast twice). `disabledControlContrast.test.ts` enforces that only
 * for start-disabled controls on character pages; every propose kit gates on
 * `submitting`, so this surface was uncovered and the Default still faded.
 *
 * Rendered via `surfaceMap('proposeTask')`, so a tenth kit is swept on
 * registration. The off pair itself is measured in `disabledControlContrast`
 * only; this file asserts the class is worn and nothing fades over it.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { archetypeFor, EVERY_SLUG, proposeTaskState } from './proposeTaskState'

/** The kit's page, rendered for one slug in one busy state. */
function markupFor(slug: string, submitting: boolean): string {
  const Archetype = archetypeFor(slug)
  return renderToStaticMarkup(
    <MemoryRouter>
      <Archetype state={proposeTaskState({ factionSlug: slug, submitting })} />
    </MemoryRouter>,
  )
}

/**
 * Open tags of every `type="submit"` button. Matched, not parsed: React escapes
 * `>` in attributes, and the floor below proves something was found.
 */
const submitTags = (markup: string): string[] =>
  (markup.match(/<button[^>]*>/g) ?? []).filter((tag) => tag.includes('type="submit"'))

const classesOf = (tag: string): string[] =>
  /class="([^"]*)"/.exec(tag)?.[1].split(/\s+/).filter(Boolean) ?? []

const styleOf = (tag: string): string => /style="([^"]*)"/.exec(tag)?.[1] ?? ''

describe('the propose sweep reaches every registered kit', () => {
  it('walks a roster no smaller than the one registered today', () => {
    // A render scan that renders nothing passes; a floor so a tenth kit is swept.
    expect(EVERY_SLUG.length, 'slugs in surfaceMap("proposeTask")').toBeGreaterThanOrEqual(9)
  })
})

describe('a busy propose control drops its paint instead of fading (#2486)', () => {
  for (const slug of EVERY_SLUG) {
    it(`${slug} — the submit control exists and is live before submitting`, () => {
      const tags = submitTags(markupFor(slug, false))
      // Proves the busy case below is the BUSY state, not an always-disabled control.
      expect(tags.length, 'submit controls drawn').toBe(1)
      expect(tags[0], 'the control is enabled before submitting').not.toContain('disabled=""')
    })

    it(`${slug} — the busy submit control wears .control-off`, () => {
      const [tag] = submitTags(markupFor(slug, true))
      expect(tag, 'a submit control is drawn while busy').toBeDefined()
      expect(tag, 'the control is disabled while busy').toContain('disabled=""')
      expect(classesOf(tag!), 'the disabled treatment is the measured one').toContain('control-off')
    })

    it(`${slug} — the busy submit control declares no opacity`, () => {
      // `.control-off:disabled` replaces the fill, but a fade could still composite over it.
      expect(styleOf(submitTags(markupFor(slug, true))[0] ?? ''), 'no fade on the CTA').not.toMatch(
        /(?:^|;)\s*opacity\s*:/,
      )
    })
  }
})
