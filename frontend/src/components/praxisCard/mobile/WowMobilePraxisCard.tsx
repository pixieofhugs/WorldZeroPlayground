import type { PraxisCardOut } from '../../../api/praxis'
import { useTranslation } from 'react-i18next'
import { MobilePraxisBody, type MobileSlotTheme } from './shared'

/**
 * Warriors of Whimsy MOBILE praxis card (#840) — the chronicle, stacked.
 *
 * Carries the desktop rebuild's three corrections down to the phone:
 *  • the gradient masthead band becomes the design's 6px gold/plum STRIPE, and
 *    the running head becomes an eyebrow line inside the card;
 *  • the frame binds in GOLD, not plum — the border was reading the accent;
 *  • the display face is MedievalSharp. It was `--font-display` (Lora), so the
 *    chronicle's whole voice stopped at the desktop breakpoint (#860 ask 5).
 * Single column, tokens only.
 */
export default function WowMobilePraxisCard({ praxis }: { praxis: PraxisCardOut }) {
  const { t } = useTranslation('praxis')
  const theme: MobileSlotTheme = {
    ink: 'var(--faction-wow-card-text)',
    muted: 'var(--faction-wow-card-muted)',
    accent: 'var(--faction-wow-card-accent)',
    paper: 'var(--faction-wow-chronicle-bg)',
    displayFont: 'var(--faction-wow-card-font)',
    bodyFont: 'var(--faction-wow-body-font)',
  }
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--faction-wow-chronicle-bg)',
        border: '2px solid var(--faction-wow-chronicle-border)',
        borderRadius: 9,
        boxShadow: '0 12px 26px -12px var(--faction-wow-chronicle-shadow)',
      }}
    >
      <div
        aria-hidden
        style={{
          height: 6,
          background:
            'repeating-linear-gradient(90deg, var(--faction-wow-chronicle-gold) 0 11px, var(--faction-wow-card-accent) 11px 22px)',
        }}
      />
      <div style={{ padding: 'var(--space-lg)' }}>
        <MobilePraxisBody
          praxis={praxis}
          theme={theme}
          eyebrow={
            <div
              className="eyebrow"
              style={{
                fontFamily: 'var(--faction-wow-card-font)',
                letterSpacing: '0.14em',
                color: 'var(--faction-wow-card-accent)',
              }}
            >
              {t('card.masthead.wow', { id: praxis.id })}
            </div>
          }
          mediaEmptyLabel={t('card.wow.illumination')}
        />
      </div>
    </div>
  )
}
