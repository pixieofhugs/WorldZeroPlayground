import { describe, it, expect } from 'vitest'
import feed from '../en/feed.json'

type Card = { blurb?: string; status?: { locked?: string } }

describe('factionSelect copy', () => {
  it('no faction card ships the literal placeholder word as its blurb or standing', () => {
    const cards = Object.entries(feed.factionSelect as Record<string, Card>)
    expect(cards.length).toBeGreaterThan(0)
    for (const [slug, card] of cards) {
      for (const text of [card.blurb, card.status?.locked]) {
        expect(text, slug).not.toMatch(/^\s*placeholder\s*$/i)
      }
    }
  })
})
