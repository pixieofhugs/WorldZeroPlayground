/**
 * The propose form's primary action, once it is BUSY (#2994, audit of #2814).
 *
 * WHY THIS FILE EXISTS AND `disabledControlContrast` DOES NOT COVER IT.
 * #2486 ruled that a disabled primary control must DROP its CTA paint for the
 * measured `--control-off-fill` / `--control-off-ink` pair rather than fade,
 * because `opacity` composites the whole element — the fill sinks toward the
 * sheet and the label's ink fades over the faded fill, so the label loses
 * contrast twice. `characterPaths/__tests__/disabledControlContrast.test.ts`
 * enforces that, but it sweeps `disabled={!…}` — the control that is disabled
 * when the page OPENS — and its docblock says busy states are deliberately out
 * of its scope. It also walks `pages/characterPaths/archetypes` for
 * `(Create|Edit)Character.tsx`, so it could not reach here whatever it swept.
 *
 * NO PROPOSE ARCHETYPE HAS A START-DISABLED CONTROL. All nine gate on
 * `submitting`, which is the transient class that file excludes. So the
 * invariant was unenforced on this surface, and seven of the nine kits
 * discovered `.control-off` privately during #2538 while `DefaultProposeTask`
 * kept `opacity: submitting ? 0.6 : 1` — the literal spelling #2486 removed —
 * and `AlbescentProposeTask` inherited it by delegation. That is #2814's thesis
 * exactly: an invariant hand-written seven times and absent from the Default.
 *
 * THE SEAM IS THE RENDERED CONTROL, NOT THE SOURCE TEXT. A source scan would
 * have to find each kit's file by directory and filename — the coupling that
 * made the sibling guard unable to see this surface in the first place. Walking
 * `surfaceMap('proposeTask')` and rendering instead means a tenth kit is swept
 * the moment it registers, and the Albescent wrapper is measured through what
 * it actually draws rather than exempted for drawing nothing of its own.
 *
 * IT DOES NOT RE-MEASURE THE PAIR. `--control-off-fill` / `--control-off-ink`
 * and the Singularity's `.sg-control-off` re-point are measured once, in
 * `disabledControlContrast.test.ts`, and its CSS block says the consuming sites
 * "should NOT restate the values". This file asserts only that the class is
 * worn and nothing fades on top of it.
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
 * The open tags of every `type="submit"` button in `markup`.
 *
 * Matched on the tag rather than parsed: these pages carry no `>` inside an
 * attribute value (React escapes it to `&gt;`), and the two things asserted —
 * the class list and the `style` declarations — are both attributes of this one
 * tag. The floor below proves the extraction found something at every slug.
 */
const submitTags = (markup: string): string[] =>
  (markup.match(/<button[^>]*>/g) ?? []).filter((tag) => tag.includes('type="submit"'))

const classesOf = (tag: string): string[] =>
  /class="([^"]*)"/.exec(tag)?.[1].split(/\s+/).filter(Boolean) ?? []

const styleOf = (tag: string): string => /style="([^"]*)"/.exec(tag)?.[1] ?? ''

describe('the propose sweep reaches every registered kit', () => {
  it('walks a roster no smaller than the one registered today', () => {
    // A render scan that renders nothing passes. Nine kits are registered
    // (albescent, coven, default/na, ephemerists, everymen, singularity, snide,
    // ua, wow); a floor rather than an equality, so a tenth is swept without
    // touching this file.
    expect(EVERY_SLUG.length, 'slugs in surfaceMap("proposeTask")').toBeGreaterThanOrEqual(9)
  })
})

describe('a busy propose control drops its paint instead of fading (#2486)', () => {
  for (const slug of EVERY_SLUG) {
    it(`${slug} — the submit control exists and is live before submitting`, () => {
      const tags = submitTags(markupFor(slug, false))
      // Proves the extraction matches a real call site, and that what the busy
      // case below measures is the BUSY state and not a control that is always
      // disabled.
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
      // The exact defect #2486 removed. `.control-off:disabled` replaces the
      // fill with `!important`, but nothing stops a fade being composited over
      // the result, so the class alone is not the whole invariant.
      expect(styleOf(submitTags(markupFor(slug, true))[0] ?? ''), 'no fade on the CTA').not.toMatch(
        /(?:^|;)\s*opacity\s*:/,
      )
    })
  }
})
