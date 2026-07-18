import { useTranslation } from 'react-i18next'
import type { PraxisCardOut } from '../../../api/praxis'
import { factionCssVar } from '../../../utils/factions'
import { SnideSigil } from '../../snide/snideAtoms'
import { MobilePraxisBody, type MobileSlotTheme } from './shared'

const TORN_CLIP =
  'polygon(0% 0%, 4% 100%, 8% 20%, 12% 90%, 16% 10%, 20% 80%, 24% 0%, 28% 100%, 32% 15%, 36% 85%, 40% 5%, 44% 95%, 48% 20%, 52% 80%, 56% 0%, 60% 100%, 64% 15%, 68% 90%, 72% 5%, 76% 85%, 80% 0%, 84% 100%, 88% 20%, 92% 80%, 96% 10%, 100% 0%)'

/**
 * S.N.I.D.E. MOBILE praxis card (#573) — a dark evidence file with a torn top
 * edge, a strip of tape, and the struck-through circle-S sigil. Mirrors the
 * desktop SNIDE praxis frame; --faction-snide-* tokens, native-dark.
 */
export default function SnideMobilePraxisCard({ praxis }: { praxis: PraxisCardOut }) {
  const { t } = useTranslation('praxis')
  const accent = factionCssVar('snide', 'card-accent')
  const theme: MobileSlotTheme = {
    ink: factionCssVar('snide', 'card-text'),
    muted: factionCssVar('snide', 'card-muted'),
    accent,
    paper: factionCssVar('snide', 'card-bg'),
    displayFont: 'var(--faction-snide-font-cond)',
    bodyFont: 'var(--faction-snide-font-type)',
  }
  return (
    <div
      style={{
        position: 'relative',
        background: factionCssVar('snide', 'card-bg'),
        color: factionCssVar('snide', 'card-text'),
        border: `1px solid ${factionCssVar('snide', 'border')}`,
        padding: '18px 16px 14px',
        boxShadow: '5px 6px 0 rgba(0,0,0,.5)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -1,
          left: 0,
          right: 0,
          height: 6,
          background: 'var(--color-bg-page)',
          clipPath: TORN_CLIP,
        }}
      />
      <div className="snide-tape" style={{ top: -8, left: 20, transform: 'rotate(-8deg)' }} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          fontFamily: 'var(--faction-snide-font-type)',
          fontSize: 'var(--text-sm)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: accent,
        }}
      >
        <SnideSigil size={16} color={accent} />
        {t('card.masthead.snide')}
      </div>
      <MobilePraxisBody praxis={praxis} theme={theme} />
    </div>
  )
}
