import type { PraxisCardOut } from '../../../api/praxis'
import { useTranslation } from 'react-i18next'
import { factionCssVar } from '../../../utils/factions'
import { MobilePraxisBody, type MobileSlotTheme } from './shared'

/**
 * Warriors of Whimsy MOBILE praxis card (#821) — the SAME chronicle structure as
 * Coven's, recoloured to WOW yellow (`--faction-wow-*`), never gold/plum. WOW's
 * first bespoke mobile skin (#812 gave it a colour, this gives it a card).
 * Single column, tokens only. Frame pixel-fidelity flagged for human QA.
 */
export default function WowMobilePraxisCard({ praxis }: { praxis: PraxisCardOut }) {
  const { t } = useTranslation('praxis')
  const theme: MobileSlotTheme = {
    ink: factionCssVar('wow', 'card-text'),
    muted: factionCssVar('wow', 'card-muted'),
    accent: factionCssVar('wow', 'card-accent'),
    paper: 'var(--faction-wow-chronicle-bg)',
    displayFont: 'var(--font-display)',
    bodyFont: "'EB Garamond', serif",
  }
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--faction-wow-chronicle-bg)',
        border: `2px solid ${factionCssVar('wow', 'card-accent')}`,
        borderRadius: 7,
        boxShadow: '0 12px 26px -12px var(--faction-wow-chronicle-shadow)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-sm) var(--space-lg)',
          background:
            'linear-gradient(90deg, var(--faction-wow-chronicle-header-from), var(--faction-wow-chronicle-header-to))',
          color: 'var(--faction-wow-chronicle-header-text)',
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-sm)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}
      >
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: star dingbat sized as a glyph, not read as text */}
        <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>
          ✦
        </span>
        {t('card.masthead.wow')}
      </div>
      <div style={{ padding: 'var(--space-lg)' }}>
        <MobilePraxisBody praxis={praxis} theme={theme} />
      </div>
    </div>
  )
}
