// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  copyTargetsForElement,
  copyTargetsForText,
  recordRenderedCopy,
  setCopyRecording,
} from '../copyRegistry'

const target = { ns: 'factions', key: 'descriptions.everymen' }
const whole = 'First paragraph.\n\nSecond paragraph.\n  \nThird.'

afterEach(() => setCopyRecording(false))

describe('multi-paragraph copy', () => {
  it('resolves a single paragraph to the key that owns the whole string', () => {
    setCopyRecording(true)
    recordRenderedCopy(whole, target)
    expect(copyTargetsForText('Second paragraph.')).toEqual([target])
    const p = document.createElement('p')
    p.textContent = 'Third.'
    expect(copyTargetsForElement(p)).toEqual([target])
  })

  it('keeps an ambiguous paragraph ambiguous', () => {
    const other = { ns: 'common', key: 'x' }
    setCopyRecording(true)
    recordRenderedCopy('Third.', other)
    recordRenderedCopy(whole, target)
    expect(copyTargetsForText('Third.')).toEqual([other, target])
  })

  it('disarming clears the paragraph entries', () => {
    setCopyRecording(true)
    recordRenderedCopy(whole, target)
    setCopyRecording(false)
    expect(copyTargetsForText('Third.')).toEqual([])
  })
})

describe('what a click borrows', () => {
  const badge = { ns: 'feed', key: 'taskCard.inProgress' }
  const el = (html: string) => {
    const div = document.createElement('div')
    div.innerHTML = html
    return div
  }

  it('a lone newline is a paragraph too', () => {
    setCopyRecording(true)
    recordRenderedCopy('One line.\nNext line.', target)
    expect(copyTargetsForText('Next line.')).toEqual([target])
  })

  it("a player's text never takes the key of the badge beside it", () => {
    setCopyRecording(true)
    recordRenderedCopy('in progress', badge)
    const card = el('<span>in progress</span><h2>My own task title</h2>')
    expect(copyTargetsForElement(card.querySelector('h2'))).toEqual([])
  })

  it('a button whose only other text is a glyph still resolves', () => {
    setCopyRecording(true)
    recordRenderedCopy('in progress', badge)
    expect(copyTargetsForElement(el('<span>★</span><span>in progress</span>'))).toEqual([badge])
  })

  it('copy with a glyph rendered beside it in the same text resolves', () => {
    setCopyRecording(true)
    recordRenderedCopy('See more', target)
    expect(copyTargetsForElement(el('See more →'))).toEqual([target])
  })
})

