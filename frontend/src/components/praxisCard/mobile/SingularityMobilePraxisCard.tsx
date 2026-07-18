import { useTranslation } from 'react-i18next'
import type { PraxisCardOut } from '../../../api/praxis'
import { MobilePraxisBody, type MobileSlotTheme } from './shared'

/**
 * Singularity MOBILE praxis card (#573) — a terminal readout on a scanline void:
 * bracketed corners, a blinking prompt masthead, mono phosphor. No sigil (the
 * faction carries none). Mirrors the desktop Singularity praxis frame;
 * --faction-singularity-* tokens read identically in both themes (always-dark).
 */
export default function SingularityMobilePraxisCard({ praxis }: { praxis: PraxisCardOut }) {
  const { t } = useTranslation('praxis')
  const theme: MobileSlotTheme = {
    ink: 'var(--faction-singularity-card-text)',
    muted: 'var(--faction-singularity-card-muted)',
    accent: 'var(--faction-singularity-card-accent)',
    paper: 'var(--faction-singularity-card-bg)',
    displayFont: "'Share Tech Mono', monospace",
    bodyFont: "'Share Tech Mono', monospace",
  }
  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--faction-singularity-card-bg)',
        border: '1px solid var(--faction-singularity-border-hard)',
        color: 'var(--faction-singularity-card-text)',
        padding: '16px',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.015) 2px, rgba(74,222,128,0.015) 4px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div
          style={{
            marginBottom: 12,
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 'var(--text-sm)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--faction-singularity-card-muted)',
          }}
        >
          {t('card.masthead.singularity')}
          <span
            style={{
              display: 'inline-block',
              width: 5,
              height: 9,
              marginLeft: 4,
              background: 'var(--faction-singularity-card-text)',
              verticalAlign: 'middle',
              animation: 'blink 1s step-end infinite',
            }}
          />
        </div>
        <MobilePraxisBody praxis={praxis} theme={theme} />
      </div>
      <style>{'@keyframes blink { 50% { opacity: 0; } }'}</style>
    </div>
  )
}
