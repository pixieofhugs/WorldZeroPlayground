/**
 * The baseline row under the level track: what is owed, and what has ever been
 * earned (#2767).
 *
 * ONE ROW, NINE MOUNTS. This tree used to be hand-authored in nine files — the
 * rail's character card and all eight mobile Field Desks — with `WowFieldDesk`
 * spelling it as an inline style object rather than the `flex items-center
 * gap-2` the other eight used, so a class-name census missed it. Nothing about
 * the row differs between them: it is TREE, not skin (ADR-0078), and the whole
 * of each kit's voice arrives through `style`, which is the per-file caption
 * constant the site already had (`identityMetaStyle` on the rail,
 * `trackMetaStyle` on each desk — Coven's is `{...CAPTION}` and UA's is
 * `{...smallCaps}`). Pass that constant; do not re-derive it here.
 *
 * WHY IT WRAPS. At the top of the era's curve the left caption is a sentence —
 * `"Nowhere to go from here but the top"`, ~262px at 10px uppercase with
 * `0.12em` tracking — and the right one is ~105px, in a rail about 272px wide.
 * There is no gap at which that pair fits. On `align-items: center` both
 * captions wrapped and their lines INTERLEAVED, which is what made the two read
 * as one paragraph. So the row wraps, and it aligns on the baseline: when both
 * captions fit (the mid-curve `"114 TO LEVEL 9"` branch, which is every
 * character below the top) it renders exactly as it always did — one line,
 * all-time flush right on its auto margin — and when they don't, all-time drops
 * to a line of its own and stays right.
 *
 * That is deliberately NOT an unconditional stack, which would spend a line of
 * vertical space on every card for the sake of the one branch that needs it.
 *
 * `whiteSpace: 'nowrap'` on the all-time span is the third property: without it
 * `3,886 ALL-TIME` breaks between the figure and its label, which is worse than
 * the overflow it is avoiding.
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
