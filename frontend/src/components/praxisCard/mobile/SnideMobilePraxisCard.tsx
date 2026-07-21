import { useTranslation } from 'react-i18next'
import type { PraxisCardOut } from '../../../api/praxis'
import { factionCssVar } from '../../../utils/factions'
import { SnideSigil } from '../../snide/snideAtoms'
import { MobilePraxisBody, type MobileSlotTheme } from './shared'

/**
 * S.N.I.D.E. MOBILE praxis card (#573) — a dark evidence file with a strip of
 * tape and the struck-through circle-S sigil. Mirrors the desktop SNIDE praxis
 * frame; --faction-snide-* tokens, native-dark.
 *
 * The tape is design-backed and stays: the mobile design draws `.snide-tape`
 * and calls this card "lifted from the real SNIDETaskCard. Nothing invented."
 * The torn top edge that used to sit above it was NOT — a 26-point clip-path
 * with no counterpart in any design — so #867 deleted it here, as #842 had on
 * desktop. Do not reinstate it.
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
        padding: 'var(--space-lg) var(--space-lg) var(--space-md)',
        boxShadow: '5px 6px 0 rgba(0,0,0,.5)',
      }}
    >
      <div className="snide-tape" style={{ top: -8, left: 20, transform: 'rotate(-8deg)' }} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-md)',
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
