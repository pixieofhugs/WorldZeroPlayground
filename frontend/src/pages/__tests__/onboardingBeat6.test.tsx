/** Beat 6 takes its level and unlock line from the config and catalogs (rule 12): swap the config and the markup follows. */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'

import '../../i18n'
import progression from '../../locales/en/progression.json'
import votes from '../../locales/en/votes.json'

const profiles = vi.hoisted(() => ({
  value: [
    { rank_key: '', unlocks: [] },
    { rank_key: 'x', unlocks: [] },
    { rank_key: 'trailhead', unlocks: [{ kind: 'ability', key: 'vote' }, { kind: 'sense', key: 'worn_paths' }] },
  ],
}))
vi.mock('../../hooks/useGameConfig', () => ({ useGameConfig: () => ({ level_profiles: profiles.value }) }))

import Beat6 from '../onboarding/beats/Beat6'

describe('Beat 6', () => {
  it('rolls into the first level that unlocks something, and names only its abilities', () => {
    const m = renderToStaticMarkup(<Beat6 confidence={0.7} />)
    expect(m).toContain('<span>1</span><span>2</span>')
    expect(m).toContain(progression.unlocks.vote.name)
    expect(m).not.toContain(progression.unlocks.worn_paths.name)
    expect(m).toContain(votes.chrome.receivedVoteGate)
  })
})
