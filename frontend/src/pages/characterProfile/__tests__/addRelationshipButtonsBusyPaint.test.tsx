/**
 * The profile's add-friend / add-foe pair while busy (#3011): `.control-off`, not
 * an opacity fade (#2486). Add-foe keeps its danger border while busy (owner
 * ruling, #3011).
 *
 * `.control-off` is always on the tag and only acts under `:disabled`, so
 * `paintedOff()` checks both together rather than a bare `toContain`.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import AddRelationshipButtons from '../AddRelationshipButtons'

function markup(loading: boolean, factionSlug = 'ephemerists'): string {
  return renderToStaticMarkup(
    <AddRelationshipButtons
      loading={loading}
      factionSlug={factionSlug}
      onAddFriend={() => {}}
      onAddFoe={() => {}}
    />,
  )
}

const buttonTags = (markup: string): string[] => markup.match(/<button[^>]*>/g) ?? []

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
    // A fade could still be composited over the class.
    for (const tag of buttonTags(markup(true))) {
      expect(tag, 'no fade on the control').not.toMatch(/(?:^|;|")\s*opacity\s*:/)
    }
  })

  // Singularity's header is theme-invariant VOID; the house neutral is a pale slab there.
  it('wears .sg-control-off alongside .control-off on a Singularity profile', () => {
    const busyTags = buttonTags(markup(true, 'singularity'))
    expect(busyTags, 'add-friend and add-foe').toHaveLength(2)
    for (const tag of busyTags) {
      expect(paintedOff(tag), 'still painted off, alongside not instead').toBe(true)
      expect(tag, "the Singularity's own repoint").toContain('sg-control-off')
    }
  })

  it('leaves .sg-control-off off another faction profile', () => {
    const busyTags = buttonTags(markup(true))
    expect(busyTags, 'add-friend and add-foe').toHaveLength(2)
    for (const tag of busyTags) {
      expect(paintedOff(tag), 'painted off by the house neutral').toBe(true)
      expect(tag, 'the house neutral alone').not.toContain('sg-control-off')
    }
  })
})
