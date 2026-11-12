/**
 * The row under the level track: points to next level, and all-time (#2767).
 * One tree for nine mounts (ADR-0078); each kit's voice arrives via `style`.
 *
 * WRAPS on the baseline: the top-level caption is a sentence that can't share a
 * ~272px rail, and centred captions interleaved. When both fit it stays one
 * line. `nowrap` keeps `3,886 ALL-TIME` together.
 */
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import type { LevelTrack } from '../utils/levelTrack'

interface LevelTrackMetaProps {
  /** The track, or `null` while the era's curve is still loading. */
  track: LevelTrack | null
  /** Era-spanning points, drawn on the right. */
  allTimeScore: number
  /** The mounting kit's caption voice — font, size, tracking, colour. */
  style: CSSProperties
}

export default function LevelTrackMeta({ track, allTimeScore, style }: LevelTrackMetaProps) {
  const { t } = useTranslation()

  return (
    <div
      className="flex flex-wrap items-baseline gap-2"
      style={{ marginTop: 'var(--space-sm)' }}
    >
      {track && (
        <span style={style}>
          {track.nextLevel === null
            ? t('sidebar.characterCard.topLevel')
            : t('sidebar.characterCard.toNextLevel', {
                points: track.pointsToNext.toLocaleString(),
                level: track.nextLevel,
              })}
        </span>
      )}
      <span style={{ ...style, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
        {t('sidebar.characterCard.allTime', { points: allTimeScore.toLocaleString() })}
      </span>
    </div>
  )
}
