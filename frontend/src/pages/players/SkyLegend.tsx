import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SkyCrown } from './Constellation'

/**
 * The sky's key, as three icon chips (#730 §3).
 *
 * It used to be one run-on sentence per score mode. Only the FIRST chip is
 * mode-dependent ("era points" / "all-time points") — the crown and the faint
 * orb mean the same thing in both modes — so this is four catalog keys, not six.
 *
 * Each icon sits on a `--sky-bg` swatch so the crown and the orbs read exactly
 * as they do inside the sky; the page around the legend is ordinary page chrome,
 * so its labels use the page text tokens rather than the `--sky-*` ink.
 */
export interface SkyLegendProps {
  scoreMode: 'era' | 'alltime'
}

export default function SkyLegend({ scoreMode }: SkyLegendProps) {
  const { t } = useTranslation('common')

  return (
    <ul
      className="flex flex-wrap items-center list-none mt-3"
      style={{ gap: 'var(--space-lg)', padding: 0, margin: 0 }}
    >
      <LegendChip icon={<SigilScaleIcon />}>
        {scoreMode === 'era'
          ? t('leaderboard.desktop.legend.sizeEra')
          : t('leaderboard.desktop.legend.sizeAllTime')}
      </LegendChip>
      <LegendChip icon={<SkyCrown size={20} />}>
        {t('leaderboard.desktop.legend.crown')}
      </LegendChip>
      <LegendChip icon={<FaintOrbIcon />}>{t('leaderboard.desktop.legend.faint')}</LegendChip>
    </ul>
  )
}

function LegendChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
      <span
        aria-hidden
        className="flex items-center justify-center rounded-full"
        style={{
          // Ornament geometry: a fixed swatch that frames the glyph (#730 §4a).
          width: 34,
          height: 34,
          flex: 'none',
          background: 'var(--sky-bg)',
          border: '1px solid var(--sky-ring)',
        }}
      >
        {icon}
      </span>
      <span className="content-text font-body" style={{ color: 'var(--color-text-secondary)' }}>
        {children}
      </span>
    </li>
  )
}

/** Two sigil dots, small beside large — "bigger sigil = more points". */
function SigilScaleIcon() {
  return (
    <svg width={24} height={20} viewBox="0 0 24 20" aria-hidden>
      <circle cx={6} cy={13} r={3.5} fill="var(--sky-name-muted)" />
      <circle cx={16} cy={10} r={7} fill="var(--sky-crown)" opacity={0.9} />
    </svg>
  )
}

/** One barely-there orb — "faint = still at zero". */
function FaintOrbIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden>
      <circle cx={10} cy={10} r={7} fill="var(--sky-name)" opacity={0.25} />
    </svg>
  )
}
