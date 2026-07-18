import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SkyCrown } from './Constellation'
import { MeadowBloom } from './Meadow'

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
  /** Which viz the legend is the key TO. The three chips mean the same three
   *  things in both, but the wording and the glyphs have to match what is
   *  actually on the canvas — a "Crown = the lead" chip under a meadow that has
   *  no crown is the mock-style lie epic #654 was grilled to prevent (#684). */
  variant?: 'sky' | 'meadow'
}

export default function SkyLegend({ scoreMode, variant = 'sky' }: SkyLegendProps) {
  const { t } = useTranslation('common')
  const meadow = variant === 'meadow'
  const group = meadow ? 'meadowLegend' : 'legend'

  return (
    <ul
      className="flex flex-wrap items-center list-none mt-3 p-0 m-0"
      style={{ gap: 'var(--space-lg)' }}
    >
      <LegendChip variant={variant} icon={<SigilScaleIcon variant={variant} />}>
        {scoreMode === 'era'
          ? t(`leaderboard.desktop.${group}.sizeEra`)
          : t(`leaderboard.desktop.${group}.sizeAllTime`)}
      </LegendChip>
      <LegendChip
        variant={variant}
        icon={meadow ? <MeadowBloom size={22} champion /> : <SkyCrown size={20} />}
      >
        {t(`leaderboard.desktop.${group}.crown`)}
      </LegendChip>
      <LegendChip variant={variant} icon={<FaintOrbIcon variant={variant} />}>
        {t(`leaderboard.desktop.${group}.faint`)}
      </LegendChip>
    </ul>
  )
}

function LegendChip({
  icon,
  children,
  variant,
}: {
  icon: ReactNode
  children: ReactNode
  variant: 'sky' | 'meadow'
}) {
  const meadow = variant === 'meadow'
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
          background: meadow ? 'var(--meadow-bg)' : 'var(--sky-bg)',
          border: `1px solid ${meadow ? 'var(--meadow-field)' : 'var(--sky-ring)'}`,
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

/** Two dots, small beside large — "bigger sigil/bloom = more points". */
function SigilScaleIcon({ variant }: { variant: 'sky' | 'meadow' }) {
  const meadow = variant === 'meadow'
  return (
    <svg width={24} height={20} viewBox="0 0 24 20" aria-hidden>
      <circle cx={6} cy={13} r={3.5} fill={meadow ? 'var(--meadow-stem)' : 'var(--sky-name-muted)'} />
      <circle
        cx={16}
        cy={10}
        r={7}
        fill={meadow ? 'var(--meadow-champion-petal)' : 'var(--sky-crown)'}
        opacity={0.9}
      />
    </svg>
  )
}

/** One barely-there orb/bloom — "faint = still at zero". */
function FaintOrbIcon({ variant }: { variant: 'sky' | 'meadow' }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden>
      <circle
        cx={10}
        cy={10}
        r={7}
        fill={variant === 'meadow' ? 'var(--meadow-name)' : 'var(--sky-name)'}
        opacity={0.25}
      />
    </svg>
  )
}
