/**
 * Mobile FieldDesk-home Singularity dispatch (#526) — asserts the registry
 * routes a Singularity node's carried life to its bespoke terminal home skin,
 * and that an unregistered slug still falls through to the Default mobile home.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import DefaultFieldDesk from '../mobileArchetypes/DefaultFieldDesk'
import SingularityHome from '../mobileArchetypes/SingularityHome'

describe('mobile FieldDesk-home Singularity dispatch', () => {
  it('resolves singularity to the bespoke terminal home skin', () => {
    expect(pickVariant(surfaceMap('mobileFieldDesk'), 'singularity', DefaultFieldDesk)).toBe(SingularityHome)
  })

  it('falls through to the Default mobile home for other slugs', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobileFieldDesk'), slug, DefaultFieldDesk)).toBe(DefaultFieldDesk)
    }
  })
})
