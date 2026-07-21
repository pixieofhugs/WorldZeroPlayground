import { useTranslation } from 'react-i18next'
import type { PraxisCardOut } from '../../../api/praxis'
import { MobilePraxisBody, type MobileSlotTheme } from './shared'

/**
 * Default MOBILE praxis card (#573, #820, #842) — the unaffiliated PLAIN CREAM
 * SHEET, the fallback skin for `na` proof and any themed-but-unskinned task
 * faction. Mirrors the desktop DefaultPraxisCard, including what came off it:
 * the full-bleed rainbow BAND and the `DefaultSigil` masthead row were both
 * inventions with no counterpart in the vendored prototype, and made the
 * least-marked faction the loudest card in the feed.
 *
 * The rainbow survives only as the eyebrow's text-clip here; the sheet's other
 * three appearances (the score box's rule and total, the divider) belong to the
 * shared score stamp and the desktop frame. All colour via --faction-default-*,
 * so it flips light/dark through the [data-theme] cascade.
 */
export default function DefaultMobilePraxisCard({ praxis }: { praxis: PraxisCardOut }) {
  const { t } = useTranslation('praxis')
  const theme: MobileSlotTheme = {
    ink: 'var(--faction-default-card-text)',
    muted: 'var(--faction-default-card-muted)',
    accent: 'var(--faction-default-card-accent)',
    paper: 'var(--faction-default-card-bg)',
    displayFont: 'var(--faction-default-card-font)',
    bodyFont: "'Courier Prime', monospace",
  }
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 10,
        background: 'var(--faction-default-card-bg)',
        color: 'var(--faction-default-card-text)',
        border: '1px solid var(--faction-default-card-line)',
        boxShadow: '0 3px 14px rgba(34, 26, 18, 0.1)',
        padding: 'var(--space-lg)',
      }}
    >
      <div
        className="eyebrow"
        style={{
          letterSpacing: '0.16em',
          background: 'var(--faction-default-eyebrow-rainbow)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          marginBottom: 'var(--space-sm)',
        }}
      >
        {t('card.masthead.default')}
      </div>
      <MobilePraxisBody praxis={praxis} theme={theme} />
    </div>
  )
}
