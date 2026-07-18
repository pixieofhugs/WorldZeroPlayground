import { useTranslation } from 'react-i18next'
import type { PraxisCardOut } from '../../../api/praxis'
import DefaultSigil from '../../cards/DefaultSigil'
import { MobilePraxisBody, type MobileSlotTheme } from './shared'

/**
 * Default MOBILE praxis card (#573) — the spectrum fallback skin for `na` /
 * unaffiliated proof and any task faction without a bespoke card. A clean sheet
 * banded in the spectrum rainbow and marked with the seven-segment ring.
 * Mirrors the desktop DefaultPraxisCard; --faction-default-* tokens, flips
 * light/dark.
 */
export default function DefaultMobilePraxisCard({ praxis }: { praxis: PraxisCardOut }) {
  const { t } = useTranslation('praxis')
  const theme: MobileSlotTheme = {
    ink: 'var(--faction-default-card-text)',
    muted: 'var(--faction-default-card-muted)',
    accent: 'var(--faction-default-card-accent)',
    paper: 'var(--faction-default-card-bg)',
    displayFont: "'Courier Prime', monospace",
    bodyFont: "'Courier Prime', monospace",
  }
  return (
    <div style={{ borderRadius: 10, padding: 4, background: 'var(--faction-default-rainbow)' }}>
      <div
        style={{
          position: 'relative',
          background: 'var(--faction-default-card-bg)',
          color: 'var(--faction-default-card-text)',
          borderRadius: 6,
          padding: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            fontFamily: "'Courier Prime', monospace",
            fontSize: 'var(--text-sm)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--faction-default-card-muted)',
          }}
        >
          <DefaultSigil size={18} />
          {t('card.masthead.default')}
        </div>
        <MobilePraxisBody praxis={praxis} theme={theme} />
      </div>
    </div>
  )
}
