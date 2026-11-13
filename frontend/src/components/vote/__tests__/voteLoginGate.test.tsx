/**
 * The logged-out vote gate (#855). One catalog key for all slugs (casing is
 * `text-transform`); one line, no disabled control; slug via VoteUI's context.
 * The design board labels wow/coven backwards (ADR-0050): wow is plum.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../../i18n'
import i18n from '../../../i18n'
import { VoteLoginGate, VoteFactionContext } from '../VoteShell'

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

const HEX = /#[0-9a-fA-F]{3,8}\b/

const gate = (slug?: string | null) => renderToStaticMarkup(<VoteLoginGate factionSlug={slug} />)

/** Tags stripped, escaped entities restored (Singularity's caret). */
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
      // `.label-heading`, not `-caption`: four voices rely on its uppercase,
      // which `.label-caption` resets (#1307).
      expect(html.match(/</g)?.length).toBe(2)
      expect(html).toContain('class="label-heading"')
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
