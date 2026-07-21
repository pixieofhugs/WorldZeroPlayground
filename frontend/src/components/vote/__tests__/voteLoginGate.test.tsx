/**
 * The logged-out vote gate (#855, design v2 `LOGGED OUT · VOTE GATE`).
 *
 * The contract these cases pin, in the order it is easy to break:
 *  1. ONE catalog key for all nine slugs — the casing the design draws is
 *     `text-transform`, never nine hardcoded strings.
 *  2. ONE line: no disabled 1-5 control, no stamp chrome.
 *  3. A faction VOICE: the slug reaches the gate through the context published
 *     by VoteUI, so the nine widgets keep their zero-prop call site.
 *  4. `wow` wears the chronicle plum and `coven` the marker pink — the design
 *     board labels those two backwards (ADR-0050), so an inversion
 *     here would look correct against the artifact and be wrong.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../../i18n'
import i18n from '../../../i18n'
import { VoteLoginGate, VoteFactionContext } from '../VoteShell'

/** Every faction slug the vote surface can be asked for, plus the no-faction case. */
const SLUGS = [
  'ua',
  'snide',
  'singularity',
  'everymen',
  'ephemerists',
  'wow',
  'coven',
  'albescent',
  'na',
]

/** No colour may reach the markup as a literal — tokens only (ADR-0049). */
const HEX = /#[0-9a-fA-F]{3,8}\b/

const gate = (slug?: string | null) => renderToStaticMarkup(<VoteLoginGate factionSlug={slug} />)

/**
 * Strip tags so a copy assertion cannot be satisfied by an attribute value, and
 * put back the entities React escapes (Singularity's caret is one).
 */
const text = (html: string) =>
  html.replace(/<[^>]*>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&')

describe('VoteLoginGate', () => {
  it('renders the one shared copy key for every slug', () => {
    const copy = i18n.t('votes:chrome.loginGate')
    expect(copy).toBeTruthy()
    for (const slug of SLUGS) {
      expect(text(gate(slug))).toContain(copy)
    }
  })

  it('is a single line — no control, no stamp chrome', () => {
    for (const slug of [...SLUGS, null, undefined, 'not-a-faction']) {
      const html = gate(slug)
      expect(html).not.toContain('<button')
      expect(html).not.toContain('disabled')
      expect(html).not.toContain('<svg')
      // one element, and it is the eyebrow
      expect(html.match(/</g)?.length).toBe(2)
      expect(html).toContain('class="eyebrow"')
    }
  })

  it('spells every colour and face as a token', () => {
    for (const slug of [...SLUGS, 'not-a-faction']) {
      expect(gate(slug)).not.toMatch(HEX)
      expect(gate(slug)).toContain('var(--')
    }
  })

  it('gives each faction its own voice', () => {
    expect(gate('ua')).toContain('--faction-ua-card-accent')
    expect(gate('snide')).toContain('--faction-snide-card-accent')
    expect(gate('everymen')).toContain('--faction-everymen-card-accent')
    expect(gate('ephemerists')).toContain('--faction-ephemerists-card-accent')
  })

  it('keeps wow on the chronicle plum and coven on the marker pink', () => {
    const wow = gate('wow')
    expect(wow).toContain('--faction-wow-card-accent')
    expect(wow).toContain('--faction-wow-card-font')
    expect(wow).not.toContain('coven')

    const coven = gate('coven')
    expect(coven).toContain('--faction-coven-card-accent')
    expect(coven).toContain('--faction-coven-card-font')
    expect(coven).not.toContain('wow')
  })

  it('prefixes the Singularity caret and keeps the terminal lowercase', () => {
    const html = gate('singularity')
    expect(text(html).trim().startsWith('>')).toBe(true)
    expect(html).toContain('text-transform:lowercase')
  })

  it('falls the unaffiliated spectrum through for na, albescent and unknown slugs', () => {
    for (const slug of ['na', 'albescent', 'not-a-faction', null, undefined]) {
      const html = gate(slug)
      expect(html).toContain('--faction-default-rainbow')
      expect(html).toContain('background-clip:text')
    }
  })

  it('reads the slug from the context VoteUI publishes', () => {
    const html = renderToStaticMarkup(
      <VoteFactionContext.Provider value="snide">
        <VoteLoginGate />
      </VoteFactionContext.Provider>,
    )
    expect(html).toContain('--faction-snide-card-accent')
  })

  it('lets an explicit prop win over the context', () => {
    const html = renderToStaticMarkup(
      <VoteFactionContext.Provider value="snide">
        <VoteLoginGate factionSlug="ua" />
      </VoteFactionContext.Provider>,
    )
    expect(html).toContain('--faction-ua-card-accent')
    expect(html).not.toContain('--faction-snide-card-accent')
  })
})
