import { describe, it, expect } from 'vitest'
import { resolveTaunt } from '../taunts'

const base = { from_name: 'Ada', to_name: 'Bo', trigger_type: 'level_up' }

describe('resolveTaunt', () => {
  it('interpolates both names', () => {
    const text = resolveTaunt({ ...base, id: 0, faction_slug: 'default' })
    expect(text).toContain('Ada')
    expect(text).toContain('Bo')
  })

  it('an unknown faction falls back to the default variants', () => {
    expect(resolveTaunt({ ...base, id: 1, faction_slug: 'nonesuch' })).toBe(
      resolveTaunt({ ...base, id: 1, faction_slug: 'default' }),
    )
  })

  it('an unknown trigger resolves null, not a missing-key string', () => {
    expect(resolveTaunt({ ...base, id: 1, faction_slug: 'default', trigger_type: 'nope' })).toBeNull()
  })

  it('variant is id modulo length: wraps, and a negative id still lands in range', () => {
    const pick = (id: number) => resolveTaunt({ ...base, id, faction_slug: 'default' })
    // default.level_up has 2 variants
    expect(pick(2)).toBe(pick(0))
    expect(pick(3)).toBe(pick(1))
    expect(pick(0)).not.toBe(pick(1))
    expect(pick(-1)).toBe(pick(1))
  })
})
