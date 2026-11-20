/**
 * The three onboarding cards (#1861, `docs/spec/SPEC-onboarding.md`), rendered
 * one at a time with `renderToStaticMarkup` (no effects, no flow walking).
 * Guards: the escape link on every card, neither provider privileged, the real
 * Disclaimer (`main` auto-deploys), and the rainbow spent exactly twice.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

import '../../i18n'
import common from '../../locales/en/common.json'
import onboarding from '../../locales/en/onboarding.json'

vi.mock('../../api/terms', () => ({ acceptTerms: () => Promise.resolve({}) }))
vi.mock('../../api/auth', () => ({ loginWith: () => {} }))

import AuthCard from '../onboarding/AuthCard'
import Disclaimer from '../Disclaimer'
import TermsCard from '../onboarding/TermsCard'
import { RING_CAPTION_MAX_CHARS } from '../onboarding/OnboardingCard'

const render = (node: React.ReactNode): string =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

/** Copy as it reaches the markup: react-dom/server escapes these five. */
const asRendered = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

const CARDS: Array<[string, React.ReactNode]> = [
  ['auth', <AuthCard />],
  ['terms', <TermsCard onAccepted={() => {}} />],
]

// The login step left the shared shell (no ring, one rainbow border); the terms card still wears it.
const SHELL_CARDS = CARDS.filter(([name]) => name !== 'auth')

describe('every onboarding card', () => {
  for (const [name, card] of CARDS) {
    it(`${name} keeps a way out of the flow`, () => {
      const markup = render(card)

      expect(markup).toContain('data-testid="onboarding-look-around"')
      // Not `/`: logged out that is Home, which explains the game again.
      expect(markup).toContain('href="/tasks"')
    })

  }
  for (const [name, card] of SHELL_CARDS) {
    it(`${name} spends the rainbow exactly twice`, () => {
      const markup = render(card)

      // The border band and the conic step ring; a third is a design change.
      expect(markup.match(/--faction-default-rainbow/g)).toHaveLength(2)
    })
  }
  for (const [name, card] of CARDS) {
    it(`${name} lets a long control label wrap onto a centred second line`, () => {
      const markup = render(card)

      // #2764. On the markup, so `SignInOptions`' provider buttons are covered.
      expect(markup).not.toContain('white-space:nowrap')

      // Wrapped lines need `text-align` (flex centring only centres the item).
      // `inline-flex` is `controlBase`'s alone here, hence the selector.
      for (const style of markup.match(/style="[^"]*"/g) ?? []) {
        if (style.includes('display:inline-flex')) expect(style).toContain('text-align:center')
      }
    })

    it(`${name} states no colour of its own`, () => {
      const markup = render(card)

      // A hex in a style attribute is a light-only card.
      expect(markup).not.toMatch(/style="[^"]*#[0-9a-fA-F]{3}/)
    })
  }
})

describe('the seven beat lines', () => {
  // Numbered keys are the seven lines; bN keys hold a beat's own stage copy.
  const lines = Object.entries(onboarding.beats).filter(([k]) => /^\d$/.test(k)).map(([, v]) => String(v))

  it('are seven, and none is empty', () => {
    expect(lines).toHaveLength(7)
    for (const line of lines) expect(line.trim()).not.toBe('')
  })

  it('say nothing about praxis, factions or signing up before auth', () => {
    const words = lines.join(' ').toLowerCase()
    // Factions are invitation-gated (ADR-0022); "sign up" is reserved for claiming a task.
    for (const banned of ['praxis', 'faction', 'sign up']) expect(words).not.toContain(banned)
  })
})

describe('the auth card', () => {
  it('offers both providers', () => {
    const markup = render(<AuthCard />)

    expect(markup).toContain(common.signIn.google)
    expect(markup).toContain(common.signIn.discord)
  })

  it('privileges neither', () => {
    const markup = render(<AuthCard />)

    const control = (provider: string): string => {
      const tag = new RegExp(`<button[^>]*data-testid="sign-in-${provider}"[^>]*>`).exec(markup)?.[0]
      return (tag ?? '').replace(`data-testid="sign-in-${provider}"`, '')
    }

    expect(control('google')).not.toBe('')
    expect(control('google')).toBe(control('discord'))
  })

  it('names no provider in the framing copy', () => {
    const markup = render(<AuthCard />)

    // #1738: a provider is named only on its own button.
    const framing = markup.replace(/<button[\s\S]*?<\/button>/g, '').toLowerCase()

    expect(framing).not.toContain('google')
    expect(framing).not.toContain('discord')
  })
})

describe('the Disclaimer page', () => {
  it('shows the deleted-account record paragraph (p4)', () => {
    expect(render(<Disclaimer />)).toContain(asRendered(common.disclaimer.p4))
  })
})

describe('the terms card', () => {
  it('shows the real Disclaimer, not a placeholder', () => {
    const markup = render(<TermsCard onAccepted={() => {}} />)

    for (const paragraph of [
      common.disclaimer.p1,
      common.disclaimer.p2,
      common.disclaimer.p3,
      common.disclaimer.p4,
      common.disclaimer.lastUpdated,
    ]) {
      expect(markup).toContain(asRendered(paragraph))
    }
  })

  it('reads the document from the same keys the Disclaimer page does', () => {
    const markup = render(<TermsCard onAccepted={() => {}} />)

    // `main` auto-deploys, so provisional legal text would ship.
    const document = /data-testid="onboarding-terms-document"[^>]*>([\s\S]*?)<\/div>/.exec(markup)?.[1]

    expect(document).toBeTruthy()
    expect(document).not.toContain('PLACEHOLDER')
  })

  it('offers an accept control', () => {
    const markup = render(<TermsCard onAccepted={() => {}} />)

    expect(markup).toContain('data-testid="onboarding-accept-terms"')
  })
})

/* #2766 copy is written; #2765 the ring holds its caption. The arc is public
 * and `main` auto-deploys. */
describe('the arc a stranger actually reads', () => {
  for (const [name, card] of CARDS) {
    it(`${name} shows a stranger no placeholder`, () => {
      const words = render(card).replace(/<[^>]*>/g, ' ')

      expect(words).not.toContain('PLACEHOLDER')
    })

  }
  for (const [name, card] of SHELL_CARDS) {
    it(`${name} wraps an over-long ring caption INSIDE the circle (#2765)`, () => {
      // 0.2em tracking is the ring caption's alone on this sheet.
      const ring = (render(card).match(/style="[^"]*"/g) ?? []).filter((style) =>
        style.includes('letter-spacing:0.2em'),
      )

      expect(ring).toHaveLength(1)
      expect(ring[0]).toContain('text-align:center')
      expect(ring[0]).toContain('overflow-wrap:anywhere')
    })

    it(`${name} draws no tick, and sets its controls one deliberate step below the body (#3098)`, () => {
      const markup = render(card)

      expect(markup).not.toMatch(/<span aria-hidden="true"[^>]*><\/span>/)
      // Body ends on zero margin, so the row's gap is the whole distance.
      expect(markup).toMatch(/<\/(p|div)><div style="[^"]*margin-top:var\(--space-2xl\)/)
    })
  }

  it('keeps the ring caption inside the characters the ring can draw', () => {
    // Geometry; the constant carries the working.
    expect(onboarding.card.stepCaption.length).toBeLessThanOrEqual(RING_CAPTION_MAX_CHARS)
  })

  it('stores the four CSS-uppercased strings unshouted', () => {
    // CSS does the shouting; pre-shouted copy hides that (#2598 §B2b).
    for
 (const shouted of [
      onboarding.card.stepCaption,
      onboarding.card.lookAround,
      onboarding.terms.accept,
    ]) {
      expect(shouted).not.toBe(shouted.toUpperCase())
    }
  })
})
