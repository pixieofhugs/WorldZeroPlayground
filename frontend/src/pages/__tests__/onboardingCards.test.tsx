/**
 * The three onboarding cards (#1861, `docs/spec/SPEC-onboarding.md`).
 *
 * WHAT THIS CAN TEST. The harness is `renderToStaticMarkup` — no DOM, no
 * events, effects never run — so the cards are exercised as the pure render
 * units they were written to be, one at a time, rather than by walking the
 * flow. `Onboarding.tsx`'s step machine is two lines of derivation over
 * `useAuth()`; what it derives *from* is pinned in `AuthContext` and what it
 * derives *to* is these three.
 *
 * The four things that would each be a silent regression:
 *
 *   1. **The escape.** "A door, not a wall": every stop keeps "let me just look
 *      around" available. It is rendered by the shell, so this asserts it on
 *      every card — losing it on one is the failure mode.
 *   2. **Neither provider privileged.** Two buttons that drift apart in size,
 *      class or ink is how one quietly becomes the recommended way in. The
 *      assertion compares the rendered tags rather than eyeballing the source.
 *   3. **The real Disclaimer.** `main` auto-deploys, and the check reads
 *      `common.json` so a swap to placeholder legal text fails here. Since
 *      #2766 the copy around it is written too, and the block below holds the
 *      whole route to that.
 *   4. **Rainbow in exactly three places.** The restraint IS the design, which
 *      makes it the one visual rule a test can hold: three references per card,
 *      counted in the markup.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

import '../../i18n'
import common from '../../locales/en/common.json'
import onboarding from '../../locales/en/onboarding.json'

vi.mock('../../api/terms', () => ({ acceptTerms: () => Promise.resolve({}) }))
vi.mock('../../api/auth', () => ({ loginWith: () => {} }))

import IntroCard from '../onboarding/IntroCard'
import AuthCard from '../onboarding/AuthCard'
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
  ['intro', <IntroCard onContinue={() => {}} />],
  ['auth', <AuthCard />],
  ['terms', <TermsCard onAccepted={() => {}} />],
]

describe('every onboarding card', () => {
  for (const [name, card] of CARDS) {
    it(`${name} keeps a way out of the flow`, () => {
      const markup = render(card)

      expect(markup).toContain('data-testid="onboarding-look-around"')
      // `/tasks` and not `/`: `/` logged out is Home, which explains the game a
      // second time. Public surfaces need no session, so this is a link out and
      // not a dismissal.
      expect(markup).toContain('href="/tasks"')
    })

    it(`${name} spends the rainbow exactly three times`, () => {
      const markup = render(card)

      // The border band, the conic step ring, one tick. A fourth is a design
      // change, not a tweak.
      expect(markup.match(/--faction-default-rainbow/g)).toHaveLength(3)
    })

    it(`${name} lets a long control label wrap onto a centred second line`, () => {
      const markup = render(card)

      // #2764: `controlBase` set `white-space:nowrap`, so a label wider than the
      // 560px sheet ran out past the rainbow border rather than breaking — and
      // on a 375px phone that bites at much shorter labels. The actions row
      // already wraps; it was the button that could not.
      //
      // Asserted on the MARKUP and not on the exported style object, because
      // that is what also covers the two provider buttons `SignInOptions`
      // renders from the style it is handed.
      expect(markup).not.toContain('white-space:nowrap')

      // `justify-content:center` centres the anonymous flex ITEM inside the
      // control; once the label wraps that item fills the width and the short
      // second line still rags left. Centring the LINES is `text-align`'s job,
      // so every control carries it. `inline-flex` is `controlBase`'s alone on
      // this surface, which is what makes it the selector.
      for (const style of markup.match(/style="[^"]*"/g) ?? []) {
        if (style.includes('display:inline-flex')) expect(style).toContain('text-align:center')
      }
    })

    it(`${name} states no colour of its own`, () => {
      const markup = render(card)

      // Every colour through a `--faction-default-*` token so both themes come
      // from the `[data-theme="dark"]` cascade. A hex in a style attribute is
      // a light-only card.
      expect(markup).not.toMatch(/style="[^"]*#[0-9a-fA-F]{3}/)
    })
  }
})

describe('the intro card', () => {
  it('carries all six things the pitch must land', () => {
    const markup = render(<IntroCard onContinue={() => {}} />)

    for (const slot of Object.values(onboarding.intro.paragraph)) {
      expect(markup).toContain(asRendered(slot))
    }
  })

  it('lands them in ONE paragraph, not three beats', () => {
    const markup = render(<IntroCard onContinue={() => {}} />)

    const pitch = /<p[^>]*data-testid="onboarding-pitch"[^>]*>([\s\S]*?)<\/p>/.exec(markup)?.[1]
    for (const slot of Object.values(onboarding.intro.paragraph)) {
      expect(pitch).toContain(asRendered(slot))
    }
    // The whole card holds one <p>. Six slots joined into it is a paragraph;
    // six <p>s would be the three-beat shape the spec rules out.
    expect(markup.match(/<p[ >]/g)).toHaveLength(1)
  })

  it('says nothing about praxis, factions or signing up before auth', () => {
    // The WORDS, not the markup: `--faction-default-*` tokens are all over the
    // style attributes and are not copy. Strip every attribute and judge what
    // is left, which is what a player reads.
    const words = render(<IntroCard onContinue={() => {}} />)
      .replace(/<[^>]*>/g, ' ')
      .toLowerCase()

    // The player meets "praxis" once they have one — nothing formally teaches
    // the word. Factions are invitation-gated (ADR-0022) and unreachable at
    // level 0, so naming them pre-signup sells what the game cannot deliver.
    expect(words).not.toContain('praxis')
    expect(words).not.toContain('faction')
    // "Sign up" belongs to the task claim: a Character signs up FOR A TASK.
    // Account creation uses other words.
    expect(words).not.toContain('sign up')
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

    // A provider is named on the button that goes to it and nowhere else
    // (#1738). Strip the two buttons and neither word may survive.
    const framing = markup.replace(/<button[\s\S]*?<\/button>/g, '').toLowerCase()

    expect(framing).not.toContain('google')
    expect(framing).not.toContain('discord')
  })
})

describe('the terms card', () => {
  it('shows the real Disclaimer, not a placeholder', () => {
    const markup = render(<TermsCard onAccepted={() => {}} />)

    for (const paragraph of [
      common.disclaimer.p1,
      common.disclaimer.p2,
      common.disclaimer.p3,
      common.disclaimer.lastUpdated,
    ]) {
      expect(markup).toContain(asRendered(paragraph))
    }
  })

  it('reads the document from the same keys the Disclaimer page does', () => {
    const markup = render(<TermsCard onAccepted={() => {}} />)

    // No PLACEHOLDER in the document block: `main` auto-deploys, so provisional
    // legal text would ship to production. The framing line above it used to be
    // the placeholder side of that boundary and is written now (#2766), so the
    // whole card is held to it by the block at the foot of this file.
    const document = /data-testid="onboarding-terms-document"[^>]*>([\s\S]*?)<\/div>/.exec(markup)?.[1]

    expect(document).toBeTruthy()
    expect(document).not.toContain('PLACEHOLDER')
  })

  it('offers an accept control', () => {
    const markup = render(<TermsCard onAccepted={() => {}} />)

    expect(markup).toContain('data-testid="onboarding-accept-terms"')
  })
})

/* ========================================================================== *
 * #2766 — THE COPY IS WRITTEN, and #2765 — THE RING HOLDS ITS CAPTION.
 *
 * These are one block because they are one seam: what the catalog holds and
 * what the ring can draw are the same question. The arc is public with no
 * `ProtectedRoute` and `main` auto-deploys, so a slot that slips back to
 * `PLACEHOLDER` is placeholder text in front of a stranger.
 * ========================================================================== */
describe('the arc a stranger actually reads', () => {
  for (const [name, card] of CARDS) {
    it(`${name} shows a stranger no placeholder`, () => {
      const words = render(card).replace(/<[^>]*>/g, ' ')

      expect(words).not.toContain('PLACEHOLDER')
    })

    it(`${name} wraps an over-long ring caption INSIDE the circle (#2765)`, () => {
      // 0.2em tracking is the ring caption's alone on this sheet once the note
      // slot is gone — the control is 0.14em and the title carries none.
      const ring = (render(card).match(/style="[^"]*"/g) ?? []).filter((style) =>
        style.includes('letter-spacing:0.2em'),
      )

      expect(ring).toHaveLength(1)
      // Without these the caption ran out past the conic band on both sides and
      // the second line ragged left. `text-align` centres the LINES;
      // `overflow-wrap` is what lets a too-long word break at all. The <h1>
      // two elements down has carried the same pair for the same reason.
      expect(ring[0]).toContain('text-align:center')
      expect(ring[0]).toContain('overflow-wrap:anywhere')
    })

    it(`${name} stands its tick alone, the note slot retired (#2766)`, () => {
      // The tick is kit furniture — "the 3px band, the conic ring, and one
      // tick" — not a completion state, so nothing is set beside it and the
      // `note` prop is gone rather than optional.
      expect(render(card)).toMatch(/<span aria-hidden="true"[^>]*><\/span><\/div>/)
    })
  }

  it('keeps the ring caption inside the characters the ring can draw', () => {
    // Geometry, not preference: 76px of usable width at 11px with 0.2em
    // tracking in a 0.6em-advance monospace. The constant carries the working.
    expect(onboarding.card.stepCaption.length).toBeLessThanOrEqual(RING_CAPTION_MAX_CHARS)
  })

  it('stores the four CSS-uppercased strings unshouted', () => {
    // `text-transform: uppercase` does the shouting — the caption style for the
    // first two, `controlBase` for the last two. A catalog holding pre-shouted
    // text gives the next editor no way to tell whether the caps are the design
    // or the copy (#2598 §B2b removed exactly that trap from another catalog).
    for (const shouted of [
      onboarding.card.stepCaption,
      onboarding.card.lookAround,
      onboarding.intro.continue,
      onboarding.terms.accept,
    ]) {
      expect(shouted).not.toBe(shouted.toUpperCase())
    }
  })
})
