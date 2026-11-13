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
