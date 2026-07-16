import { useTranslation } from 'react-i18next'
import type { PraxisCardOut } from '../../../api/praxis'
import AlbescentSigil from '../../cards/AlbescentSigil'
import { MobilePraxisBody, type MobileSlotTheme } from './shared'

/**
 * Albescent MOBILE praxis card (#573) — a filed account in the Register: a pure
 * cotton sheet, a hairline architectural inset, the surveyor's Mark and a quiet
 * "Account · filed" running head, then Cormorant italic. First-class identity —
 * the explicit dispatcher entry beats the albescent→ua alias. Reads its own
 * --faction-albescent-* tokens directly (always-light, one hue of ink).
 */
const ink = (pct: number) => `color-mix(in srgb, var(--faction-albescent-card-text) ${pct}%, transparent)`

export default function AlbescentMobilePraxisCard({ praxis }: { praxis: PraxisCardOut }) {
  const { t } = useTranslation('praxis')
  const theme: MobileSlotTheme = {
    ink: 'var(--faction-albescent-card-text)',
    muted: ink(42),
    accent: ink(55),
    paper: 'var(--faction-albescent-card-bg)',
    displayFont: 'var(--faction-albescent-card-font)',
    bodyFont: 'var(--faction-albescent-mono)',
    titleStyle: { fontStyle: 'italic', fontWeight: 300 },
  }
  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--faction-albescent-card-bg)',
        color: 'var(--faction-albescent-card-text)',
        border: `1px solid ${ink(10)}`,
        boxShadow: '0 2px 18px rgba(0,0,0,0.055), 0 1px 3px rgba(0,0,0,0.04)',
        padding: '14px 16px',
      }}
    >
      <div style={{ position: 'absolute', inset: 5, border: `1px solid ${ink(5)}`, pointerEvents: 'none' }} />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          fontFamily: 'var(--faction-albescent-mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: ink(30),
        }}
      >
        <AlbescentSigil size={14} />
        {t('card.masthead.albescent')}
      </div>
      <div style={{ position: 'relative' }}>
        <MobilePraxisBody praxis={praxis} theme={theme} />
      </div>
    </div>
  )
}
