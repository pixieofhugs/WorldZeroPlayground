import { useTranslation } from 'react-i18next'
import type { PraxisCardOut } from '../../../api/praxis'
import { EphemeristsSigil, Foxing } from '../../cards/ephemeristsAtoms'
import { MobilePraxisBody, type MobileSlotTheme } from './shared'

/**
 * The Ephemerists MOBILE praxis card (#573) — a sealed ephemeris entry: a foxed
 * vellum leaf with a lapis-ruled running head, the watching-wanderer sigil, and
 * rubric-accented text. Mirrors the desktop Ephemerists praxis frame; --eph-*
 * tokens, theme-aware through the cascade.
 */
export default function EphemeristsMobilePraxisCard({ praxis }: { praxis: PraxisCardOut }) {
  const { t } = useTranslation('praxis')
  const theme: MobileSlotTheme = {
    ink: 'var(--eph-vellum-text)',
    muted: 'var(--eph-muted)',
    accent: 'var(--eph-rubric)',
    paper: 'var(--eph-vellum)',
    displayFont: 'var(--eph-display)',
    bodyFont: 'var(--eph-serif)',
  }
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--eph-vellum)',
        color: 'var(--eph-vellum-text)',
        border: '1px solid color-mix(in srgb, var(--eph-vellum-text) 30%, transparent)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 8px 20px -16px rgba(0,0,0,0.6)',
      }}
    >
      <Foxing opacity={0.4} />
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          borderBottom: '1px solid var(--eph-gold-deep)',
          boxShadow: '0 2px 0 -1px color-mix(in srgb, var(--eph-lapis) 55%, transparent)',
          fontFamily: 'var(--eph-serif)',
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--eph-rubric)',
        }}
      >
        <EphemeristsSigil size={13} color="var(--eph-lapis)" />
        {t('card.masthead.ephemerists')}
      </div>
      <div style={{ position: 'relative', zIndex: 2, padding: '14px 16px' }}>
        <MobilePraxisBody praxis={praxis} theme={theme} />
      </div>
    </div>
  )
}
