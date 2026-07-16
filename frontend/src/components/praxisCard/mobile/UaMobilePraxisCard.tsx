import { useTranslation } from 'react-i18next'
import type { PraxisCardOut } from '../../../api/praxis'
import { factionCssVar } from '../../../utils/factions'
import { UACrest } from '../../cards/UACrest'
import { MobilePraxisBody, type MobileSlotTheme } from './shared'

/**
 * University of Asthmatics MOBILE praxis card (#573) — a gilt-salon acquisition
 * plate: gold-leaf frame, parchment ground with a faint dotted tooth, an
 * engraved "Acquisition · filed" running head with the salon crest. Mirrors the
 * desktop UA praxis frame; all colours via --ua-* tokens (always-light).
 */
export default function UaMobilePraxisCard({ praxis }: { praxis: PraxisCardOut }) {
  const { t } = useTranslation('praxis')
  const theme: MobileSlotTheme = {
    ink: factionCssVar('ua', 'card-text'),
    muted: factionCssVar('ua', 'card-muted'),
    accent: factionCssVar('ua', 'card-accent'),
    paper: factionCssVar('ua', 'card-bg'),
    displayFont: "'Playfair Display', serif",
    bodyFont: "'EB Garamond', serif",
    titleStyle: { fontStyle: 'italic' },
  }
  return (
    <div style={{ padding: 4, background: 'var(--ua-gilt)', borderRadius: 2 }}>
      <div
        style={{
          position: 'relative',
          background: factionCssVar('ua', 'card-bg'),
          border: '1px solid color-mix(in srgb, var(--ua-ink) 30%, transparent)',
          padding: '16px 16px 14px',
          backgroundImage:
            'radial-gradient(color-mix(in srgb, var(--ua-ink) 4%, transparent) 1px, transparent 1px)',
          backgroundSize: '5px 5px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            fontFamily: "'Marcellus SC', serif",
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: factionCssVar('ua', 'card-accent'),
          }}
        >
          <UACrest width={16} height={19} />
          {t('card.masthead.ua')}
        </div>
        <MobilePraxisBody praxis={praxis} theme={theme} />
      </div>
    </div>
  )
}
