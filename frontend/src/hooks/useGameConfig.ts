import { useEffect, useState } from 'react'
import { getGameConfig, type GameConfigOut } from '../api/gameConfig'

let cachedConfig: GameConfigOut | null = null
let fetchPromise: Promise<GameConfigOut> | null = null

/**
 * Hook to fetch and cache the current era game config.
 * Config is fetched once and shared across all consumers.
 */
export function useGameConfig() {
  const [config, setConfig] = useState<GameConfigOut | null>(cachedConfig)

  useEffect(() => {
    if (cachedConfig) {
      setConfig(cachedConfig)
      return
    }
    if (!fetchPromise) {
      fetchPromise = getGameConfig()
        .then((data) => {
          cachedConfig = data
          return data
        })
        .catch(() => {
          fetchPromise = null
          return null as unknown as GameConfigOut
        })
    }
    fetchPromise.then((data) => {
      if (data) setConfig(data)
    })
  }, [])

  return config
}
