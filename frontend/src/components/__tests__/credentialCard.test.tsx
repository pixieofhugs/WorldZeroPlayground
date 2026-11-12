/** CredentialCard skin contract (#271); #1626 trimmed it to who, which faction, how far. */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import i18n from '../../i18n'
import CredentialCard from '../CredentialCard'
import { factionName } from '../../utils/factions'

/** What a sighted reader can actually read: markup minus every tag/attribute. */
const visibleText = (html: string) => html.replace(/<[^>]*>/g, ' ')

describe('CredentialCard', () => {
  it('skins to the faction token set', () => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Marlow Quill" handle="marlowquill" factionSlug="coven" level={3} score={42} />,
    )
    expect(html).toContain('--faction-coven-card-bg')
    expect(html).toContain('Marlow Quill')
    expect(html).toContain('@marlowquill')
    expect(html).toContain('42')
  })

  it('renders the neutral treatment for na (not aliased to ua)', () => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug="na" level={1} score={0} />,
    )
    expect(html).toContain('--color-bg-surface-alt')
    expect(html).not.toContain('--faction-ua-card-bg')
  })

  it('falls back to "Wanderer" when the name is blank', () => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="   " handle="wanderer" factionSlug={null} level={1} score={0} />,
    )
    expect(html).toContain('Wanderer')
  })
})

/** #1626 delta 1. */
describe('CredentialCard eyebrow — the kicker is gone, the handle is not', () => {
  it('keeps the @handle', () => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Marlow Quill" handle="marlowquill" factionSlug="coven" level={3} score={42} />,
    )
    expect(visibleText(html)).toContain('@marlowquill')
  })

  it.each(['coven', 'na', null])('prints no kicker for %s', (slug) => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug={slug} level={1} score={0} />,
    )
    const text = visibleText(html).toLowerCase()
    expect(text, 'the CREDENTIAL kicker').not.toContain('credential')
    expect(text, 'the UNAFFILIATED kicker').not.toContain('unaffiliated')
  })
})

/** #1626 delta 4, owner ruling: screen readers get the faction name; the screen doesn't. */
describe('CredentialCard footer sigil — spoken, never printed', () => {
  const label = (html: string) => /aria-label="([^"]*)"/.exec(html)?.[1]

  it.each(['coven', 'ua', 'snide', 'everymen', 'singularity', 'wow', 'ephemerists', 'albescent'])(
    'names %s to assistive tech and to nobody else',
    (slug) => {
      const html = renderToStaticMarkup(
        <CredentialCard displayName="Wren" handle="wren" factionSlug={slug} level={1} score={0} />,
      )
      expect(label(html), 'the sigil is a labelled image').toBe(factionName(slug))
      expect(html).toContain('role="img"')
      expect(visibleText(html), 'no faction name on screen').not.toContain(factionName(slug))
    },
  )

  it('drops the "faction to be chosen" placeholder for the spectrum sigil', () => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug="na" level={1} score={0} />,
    )
    expect(visibleText(html)).not.toContain('faction to be chosen')
    expect(label(html)).toBe(factionName('na'))
  })

  it.each([
    ['na', 'na'],
    ['a slug no manifest knows', 'totally-unknown'],
    ['no slug at all', null],
  ])('draws the DefaultSigil ring for %s rather than a hole', (_case, slug) => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug={slug} level={1} score={0} />,
    )
    expect(html, 'the unaffiliated spectrum ring').toContain('--faction-default-rainbow-conic')
  })

  // #783's hazard: albescent's labyrinth is safe only because it carries no palette
  // of its own — it is cut from na's spectrum (#1891, Sigil Studies v2).
  it('gets albescent a shape of its own but never a colour of its own', () => {
    const albescent = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug="albescent" level={1} score={0} />,
    )
    const unaffiliated = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug="na" level={1} score={0} />,
    )
    expect(albescent, 'the labyrinth').toContain('/factionMarks/labyrinth.svg')
    expect(unaffiliated, 'the na ring, unchanged').not.toContain('/factionMarks/labyrinth.svg')
    // The paint: neither reaches for a reveal register or faction hue (#1891).
    expect(albescent, 'the deleted cross-hair').not.toContain('<linearGradient')
    expect(albescent, 'no name in the markup').not.toContain('albescent"')
    // Both draw the conic twice: hoop by class (#2992), mark by value — a sigil
    // must NOT turn (ADR-0083 §1). The counts can't tell the two apart; that's the point.
    for (const html of [albescent, unaffiliated]) {
      expect(html.split('--faction-default-rainbow-conic').length - 1, 'the mark, by value').toBe(1)
      expect(html.split('class="spectrum-dial"').length - 1, 'the hoop, by class').toBe(1)
    }
  })
})

/** The sigil slot's hoop (#1658). A hoop changing for anyone but albescent means the override leaked into the card. */
describe('CredentialCard sigil slot hoop (#1658)', () => {
  // The slot's border, not the card frame's (the first `border:`).
  const hoop = (slug: string | null) => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug={slug} level={1} score={0} />,
    )
    const slot = /<span role="img"[^>]*style="([^"]*)"/.exec(html)?.[1] ?? ''
    return /border:2px solid ([^;"]+)/.exec(slot)?.[1]
  }

  it('rings the albescent mark in the spectrum blue', () => {
    // The design's `#60a5fa` is stop-6's dark value (#1657).
    expect(hoop('albescent')).toBe('var(--faction-default-stop-6)')
  })

  it.each(['ua', 'coven', 'snide', 'everymen', 'singularity', 'wow', 'ephemerists', 'na', null])(
    'leaves the hoop on the card accent for %s',
    (slug) => {
      expect(hoop(slug)).toBe('var(--fc-accent)')
    },
  )
})

/** #1626 delta 3: the bio moved to the profile's About block. */
describe('CredentialCard has no bio slot', () => {
  it('prints no bio and no placeholder for it', () => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug="coven" level={1} score={0} />,
    )
    expect(html, 'the two-line clamp').not.toContain('-webkit-line-clamp')
    expect(visibleText(html), 'the blank-passport filler').not.toContain('blank passport')
  })
})

/** #1626 deltas 2 + 5: the portrait is the subject; the level is a footnote. */
describe('CredentialCard proportions', () => {
  const html = renderToStaticMarkup(
    <CredentialCard displayName="Wren" handle="wren" factionSlug="coven" level={4} score={9} />,
  )

  it('gives the portrait ring 136px, not 96', () => {
    expect(html).toContain('width:136px')
    expect(html).not.toContain('width:96px')
  })

  it('sets the level readout at the 12px step', () => {
    // Pins the type RUNG; the words are the catalog's.
    const readout = i18n.t('common:credential.lvl', { level: 4 })
    expect(html).toMatch(
      new RegExp(`font-size:var\\(--text-lg\\)[^"]*"[^>]*>${readout}`),
    )
  })
})

/** #1263: the ring only opens a file input, so its name must not promise drag-and-drop. */
describe('CredentialCard portrait ring — the label names what the control does', () => {
  const ringOf = (html: string) => /<button[^>]*>/.exec(html)?.[0] ?? ''

  it('gives the upload ring an accessible name describing a click', () => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug="na" level={1} score={0} onAvatarClick={() => {}} />,
    )
    const ring = ringOf(html)
    expect(ring, 'the ring is a real button when it uploads').toBeTruthy()
    expect(ring).toContain('aria-label="Click to upload a photo"')
    expect(ring, 'the tooltip says the same thing').toContain('title="Click to upload a photo"')
  })

  it('promises no drag-and-drop the component cannot honour', () => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug="coven" level={1} score={0} onAvatarClick={() => {}} />,
    )
    expect(html.toLowerCase(), 'no false affordance in any label').not.toContain('drag')
  })

  it('renders no button — and no upload label — when the ring is not an affordance', () => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug="coven" level={1} score={0} />,
    )
    expect(ringOf(html), 'a display-only ring is not a control').toBe('')
    expect(html).not.toContain('upload')
  })
})

/**
 * `stillRing` (#3024). `.spectrum-dial` carries the resting conic too, so an
 * opt-out that only dropped the class would un-paint the hoop.
 */
describe('CredentialCard still ring', () => {
  const ring = (props: { factionSlug: string | null; stillRing?: boolean }) => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" level={1} score={0} {...props} />,
    )
    const at = html.indexOf('width:136px')
    return html.slice(html.lastIndexOf('<', at), html.indexOf('>', at) + 1)
  }

  it('keeps the class by default, wherever the mount says nothing', () => {
    expect(ring({ factionSlug: 'na' })).toContain('class="spectrum-dial"')
  })

  it.each(['na', 'albescent', null])(
    'trades the class for the ramp it carries, for %s',
    (slug) => {
      const still = ring({ factionSlug: slug, stillRing: true })
      expect(still, 'nothing for `.alb-moves .spectrum-dial` to reach').not.toContain(
        'spectrum-dial',
      )
      expect(still, 'still, not gone').toContain('var(--faction-default-rainbow-conic)')
    },
  )

  it('leaves a themed hoop alone — it was never the spectrum', () => {
    const themed = ring({ factionSlug: 'coven', stillRing: true })
    expect(themed).toContain('var(--fc-accent)')
    expect(themed).not.toContain('rainbow-conic')
  })
})
