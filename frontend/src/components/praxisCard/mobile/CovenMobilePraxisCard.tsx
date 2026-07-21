import type { PraxisCardOut } from '../../../api/praxis'
import { useTranslation } from 'react-i18next'
import { factionCssVar } from '../../../utils/factions'
import { MobilePraxisBody, type MobileSlotTheme } from './shared'

/**
 * Cozy Coven MOBILE praxis card (#840) — the pink sticker, stacked.
 *
 * The chronicle STRUCTURE it borrowed is gone here too (ADR-0050): no
 * running-head band, a 1px hairline instead of a 2px binding, the sticker's 16px
 * radius, and the dispatch line written as the card's first line. Single column,
 * tokens only — the dark values are the design's own, not a cascade freebie.
 */
export default function CovenMobilePraxisCard({ praxis }: { praxis: PraxisCardOut }) {
  const { t } = useTranslation('praxis')
  const theme: MobileSlotTheme = {
    ink: factionCssVar('coven', 'card-text'),
    muted: 'var(--faction-coven-sticker-muted)',
    accent: 'var(--faction-coven-sticker-accent)',
    paper: 'var(--faction-coven-sticker-bg)',
    displayFont: 'var(--faction-coven-card-font)',
    bodyFont: 'var(--faction-coven-card-font)',
    titleStyle: { fontWeight: 700 },
  }
  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--faction-coven-sticker-bg)',
        border: '1px solid var(--faction-coven-sticker-border)',
        borderRadius: 16,
        boxShadow: '0 4px 18px var(--faction-coven-sticker-shadow)',
        padding: 'var(--space-lg)',
      }}
    >
      <MobilePraxisBody
        praxis={praxis}
        theme={theme}
        eyebrow={
          <div
            style={{
              fontFamily: 'var(--faction-coven-card-font)',
              fontWeight: 700,
              fontSize: 'var(--text-content)',
              color: 'var(--faction-coven-sticker-accent)',
            }}
          >
            {t('card.masthead.coven', { id: praxis.id })}
          </div>
        }
        mediaEmptyLabel={t('card.coven.mediaEmpty')}
      />
    </div>
  )
}
