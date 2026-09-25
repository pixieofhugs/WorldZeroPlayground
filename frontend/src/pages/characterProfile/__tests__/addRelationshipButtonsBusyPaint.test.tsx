/**
 * The seam: the profile's add-friend / add-foe pair, busy (#3011, audit of
 * #2814/#2994).
 *
 * #2486 ruled that a disabled primary control must DROP its CTA paint for
 * `.control-off` rather than fade, because `opacity` composites the whole
 * element — the fill sinks toward the sheet and the label's ink fades over
 * the already-faded fill, losing contrast twice.
 * `proposeTask/__tests__/submitControlOff.test.tsx` enforced that for the
 * nine propose kits; this pair kept the inline fade until now.
 *
 * `AddRelationshipButtons` was split out of `CharacterProfile` for exactly
 * this seam: `relationshipLoading` lived in that page's local `useState`,
 * and this harness has no DOM to click a button into its own busy state.
 *
 * The add-foe control is outline-only (`background: none`, danger ink,
 * danger border). `.control-off:disabled` does not touch `border`, so it
 * shows a neutral slab with a danger-coloured edge while busy — that is
 * accepted (owner ruling, #3011): label contrast comes from the neutral
 * fill and ink.
 *
 * STATE-KEYED, NOT A BARE `toContain` (review of #3068). `.control-off` rides
 * UNCONDITIONALLY — the CSS only takes effect under `:disabled` — so a bare
 * `expect(busyTag).toContain('control-off')` passes just as well on a LIVE
 * tag and proves nothing about the busy state specifically. `paintedOff()` is
 * the invariant that actually determines what paints: disabled together with
 * the class, asserted `false` while live and `true` while busy in the same
 * test.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import AddRelationshipButtons from '../AddRelationshipButtons'

function markup(loading: boolean): string {
  return renderToStaticMarkup(
    <AddRelationshipButtons
      loading={loading}
      factionSlug="ephemerists"
      onAddFriend={() => {}}
      onAddFoe={() => {}}
    />,
  )
}

/** The open tags of every button in `markup`. */
const buttonTags = (markup: string): string[] => markup.match(/<button[^>]*>/g) ?? []

/**
 * The invariant that actually determines the paint: `.control-off` only acts
 * under `:disabled`, so this is `true` exactly when both are present — never
 * from the class alone.
 */
const paintedOff = (tag: string): boolean =>
  tag.includes('disabled=""') && tag.includes('control-off')

describe('the profile relationship buttons drop their paint instead of fading (#2486)', () => {
  it('draws both controls live, and paints both off while a mutation is in flight', () => {
    const liveTags = buttonTags(markup(false))
    const busyTags = buttonTags(markup(true))
    expect(liveTags, 'add-friend and add-foe').toHaveLength(2)
    expect(busyTags, 'add-friend and add-foe').toHaveLength(2)
    for (const tag of liveTags) {
      expect(paintedOff(tag), 'not painted off before a request').toBe(false)
    }
    for (const tag of busyTags) {
      expect(paintedOff(tag), 'painted off while busy').toBe(true)
    }
  })

  it('declares no inline opacity on either control while busy', () => {
    // The exact defect #2486 removed. The class alone is not the whole
    // invariant, since nothing stops a fade being composited over it.
    for (const tag of buttonTags(markup(true))) {
      expect(tag, 'no fade on the control').not.toMatch(/(?:^|;|")\s*opacity\s*:/)
    }
  })
})
