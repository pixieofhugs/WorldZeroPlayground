/**
 * The level-up copy sheet draws every level the config hands it, so every rank
 * and unlock in the progression catalog is a key the copy editor can reach.
 * The config here carries the whole catalog, alternating ability and sense so
 * both eyebrows draw.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import progression from '../../../locales/en/progression.json'
import { recordedCopyTargets, setCopyRecording } from '../../../utils/copyRegistry'

const RANKS = Object.keys(progression.ranks)
const UNLOCKS = Object.keys(progression.unlocks)

vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => ({
    level_profiles: [
      { rank_key: '', unlocks: [] },
      ...RANKS.map((rank_key, i) => ({
        rank_key,
        unlocks: UNLOCKS.filter((_, j) => j % RANKS.length === i).map((key, j) => ({
          kind: j % 2 ? 'sense' : 'ability',
          key,
        })),
      })),
    ],
  }),
}))

const { default: LevelUpCopySheet } = await import('../LevelUpCopySheet')

describe('the level-up copy sheet', () => {
  it('renders every progression catalog key', () => {
    setCopyRecording(true)
    let asked = new Set<string>()
    try {
      renderToStaticMarkup(<LevelUpCopySheet />)
      asked = new Set(recordedCopyTargets().map(({ ns, key }) => `${ns}:${key}`))
    } finally {
      setCopyRecording(false)
    }
    const keys = [
      ...Object.keys(progression.popup).map((k) => `popup.${k}`),
      ...RANKS.map((k) => `ranks.${k}`),
      ...Object.entries(progression.unlocks).flatMap(([k, v]) =>
        'desc' in v ? [`unlocks.${k}.name`, `unlocks.${k}.desc`] : [`unlocks.${k}.name`],
      ),
    ]
    expect(keys.filter((key) => !asked.has(`progression:${key}`))).toEqual([])
  })
})
