import type { PraxisCardOut } from '../../../api/praxis'
import { useTranslation } from 'react-i18next'
import { factionCssVar } from '../../../utils/factions'
import { MobilePraxisBody, type MobileSlotTheme } from './shared'

/**
 * Cozy Coven MOBILE praxis card (#821) — the gold/plum CHRONICLE: a vellum leaf
 * with a plum→pink running-head band and a moon device. Mirrors the desktop
 * chronicle frame; replaces the old taped-scrap collage. Single column, tokens
 * only. Frame pixel-fidelity flagged for human QA.
 */
export default function CovenMobilePraxisCard({ praxis }: { praxis: PraxisCardOut }) {
  const { t } = useTranslation('praxis')
  const theme: MobileSlotTheme = {
    ink: factionCssVar('coven', 'card-text'),
    muted: factionCssVar('coven', 'card-muted'),
    accent: 'var(--faction-coven-chronicle-accent)',
    paper: 'var(--faction-coven-chronicle-bg)',
    displayFont: 'var(--font-faction-script)',
    bodyFont: "'EB Garamond', serif",
  }
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--faction-coven-chronicle-bg)',
        border: '2px solid var(--faction-coven-chronicle-accent)',
        borderRadius: 7,
        boxShadow: '0 12px 26px -12px var(--faction-coven-chronicle-shadow)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-sm) var(--space-lg)',
          background:
            'linear-gradient(90deg, var(--faction-coven-chronicle-header-from), var(--faction-coven-chronicle-header-to))',
          color: 'var(--faction-coven-chronicle-header-text)',
          fontFamily: 'var(--font-faction-script)',
          fontSize: 'var(--text-sm)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}
      >
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: moon dingbat sized as a glyph, not read as text */}
        <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>
          {'☾'}
        </span>
        {t('card.masthead.coven')}
      </div>
      <div style={{ padding: 'var(--space-lg)' }}>
        <MobilePraxisBody praxis={praxis} theme={theme} />
      </div>
    </div>
  )
}
