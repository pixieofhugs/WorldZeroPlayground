/**
 * CredentialCard skin contract (#271). One structure, color + font only:
 * a faction with card tokens skins via --faction-<slug>-card-*; everything else
 * (na, factionless) falls to the neutral field treatment.
 *
 * #1626 trimmed that structure to the three facts a credential carries — who,
 * which faction, how far along — so the assertions below are as much about what
 * the card no longer prints as about what it does.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so the copy keys resolve to English text.
import '../../i18n'
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

/**
 * #1626 delta 1. The kicker printed "CREDENTIAL" opposite the handle — the
 * card naming the object the reader is already holding — and "UNAFFILIATED" for
 * everyone else, which the footer sigil says again. The handle is the half of
 * that row that identifies anyone, so it stays.
 */
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

/**
 * #1626 delta 4 + the owner ruling: "I want screen readers to have the faction
 * name, but for the name to not show up on the screen." The footer pill (a
 * faction name in the faction's own font) became a 42px hoop around a 28px
 * sigil, so the mark carries the identity and `aria-label` carries the word.
 *
 * The card stays SLUG-BLIND: it asks `FactionSigil` for a sigil by slug and
 * takes what it is given. There is no `if (slug === ...)` here to drift.
 */
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

  // The one named hazard (#783): albescent registers no `sigil` row, so the
  // dispatcher used to hand it the unaffiliated ring while its own cross-hair
  // sat in components/sigil/. Resolved inside FactionSigil, not here — this
  // asserts the card GETS the right mark, which is all the card may know.
  it('gets albescent its own cross-hair, without a branch in the card', () => {
    const rings = (html: string) => html.split('--faction-default-rainbow-conic').length - 1
    const albescent = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug="albescent" level={1} score={0} />,
    )
    const unaffiliated = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug="na" level={1} score={0} />,
    )
    // Its own mark, and since #1658 its own ink: the cross-hair is stroked from
    // the spectrum's stops rather than the flat reveal ink. Asserted at the
    // dispatcher in factionSigil.test.tsx; this only pins that the card is
    // still handed it.
    expect(albescent, "albescent's spectrum-stroked mark").toContain('--faction-default-stop-1')
    // na wears the spectrum TWICE — portrait hoop and sigil. Albescent keeps the
    // hoop (it is unthemed on purpose, #783) and the sigil is the one thing that
    // differs, so counting the ring is what tells the two apart.
    expect(rings(unaffiliated), 'na: hoop + sigil').toBe(2)
    expect(rings(albescent), 'albescent: hoop only, the sigil is its own').toBe(1)
  })
})

/**
 * The 42px sigil slot's hoop (#1658 — the second half of #1630's albescent
 * treatment, which lands here because the slot is the card's, not the profile's).
 *
 * Seam: the card's rendered markup. The card is still slug-blind — it asks
 * `factionSigilRing` the same way it asks `FactionSigil` for a mark, and takes
 * what it is given — so what is asserted is the ANSWER, per slug, and the
 * failure mode guarded is the leak: a hoop that changes for anyone but
 * albescent means the override was written into the card instead of the mark.
 */
describe('CredentialCard sigil slot hoop (#1658)', () => {
  // The SLOT's border, read off the labelled `role="img"` span — not the first
  // `border:` in the markup, which is the card's own frame and carries the
  // faction accent on every skinned slug.
  const hoop = (slug: string | null) => {
    const html = renderToStaticMarkup(
      <CredentialCard displayName="Wren" handle="wren" factionSlug={slug} level={1} score={0} />,
    )
    const slot = /<span role="img"[^>]*style="([^"]*)"/.exec(html)?.[1] ?? ''
    return /border:2px solid ([^;"]+)/.exec(slot)?.[1]
  }

  it('rings the albescent mark in the spectrum blue', () => {
    // The design's `#60a5fa` is not a literal to transcribe: it is
    // --faction-default-stop-6's DARK value (#1657), so the token is what
    // carries it and light mode gets #2563eb for free.
    expect(hoop('albescent')).toBe('var(--faction-default-stop-6)')
  })

  it.each(['ua', 'coven', 'snide', 'everymen', 'singularity', 'wow', 'ephemerists', 'na', null])(
    'leaves the hoop on the card accent for %s',
    (slug) => {
      expect(hoop(slug)).toBe('var(--fc-accent)')
    },
  )
})

/**
 * #1626 delta 3. A two-line clamp on a 500-character field only ever showed its
 * first sentence, so the bio moved to the profile's ② About block. The card
 * cannot render it at ANY mount because it no longer accepts it — this pins the
 * runtime half of that (no clamp, no blank-passport filler); the compiler pins
 * the rest at the four call sites.
 */
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
    expect(html).toMatch(/font-size:var\(--text-lg\)[^"]*"[^>]*>lvl 4/)
  })
})

/**
 * #1263. The portrait ring is a plain `onClick` button — a second trigger for
 * PortraitPicker's hidden file input — and there is no `onDrop`/`onDragOver`
 * anywhere in the component. Its `title` was "Drag a photo here, or click to
 * upload", and a `title` with no other labelling IS the button's accessible
 * name, so a screen-reader user was handed an instruction the control cannot
 * accept. The ruling was to fix the copy, not to build the drop target.
 */
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
