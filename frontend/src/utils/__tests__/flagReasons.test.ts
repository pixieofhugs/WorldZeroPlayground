import { describe, it, expect } from 'vitest'
import { flagReasonLabel, flagReasonOptions, FLAG_REASON_OTHER } from '../flagReasons'

describe('flag reasons', () => {
  it('an unknown stored key reads as Other, never a raw key or missing-key echo', () => {
    expect(flagReasonLabel('made-up')).toBe(flagReasonLabel(FLAG_REASON_OTHER))
    expect(flagReasonLabel('made-up')).toBe('Other')
  })

  it('options cover every reason, each with a real label, Other last', () => {
    const options = flagReasonOptions()
    expect(options.map((o) => o.value)).toEqual(['spam', 'harassment', 'nsfw', 'slop', 'other'])
    for (const o of options) {
      expect(o.label).not.toMatch(/flagReasons/)
      expect(flagReasonLabel(o.value)).toBe(o.label)
    }
    expect(options.at(-1)?.value).toBe(FLAG_REASON_OTHER)
  })
})
