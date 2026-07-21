import type { PraxisCardOut } from '../../../api/praxis'
import { factionCssVar } from '../../../utils/factions'
import { MobilePraxisBody, type MobileSlotTheme } from './shared'

/**
 * Everymen MOBILE praxis card (#573) — a filed work order on ruled cream
 * newsprint: a red margin rule, faint horizontal lines, typewriter voice. No
 * sigil (the faction carries none). Mirrors the desktop Everymen praxis frame;
 * --faction-everymen-* tokens, flips with [data-theme].
 */
export default function EverymenMobilePraxisCard({ praxis }: { praxis: PraxisCardOut }) {
  const theme: MobileSlotTheme = {
    ink: factionCssVar('everymen', 'card-text'),
    muted: factionCssVar('everymen', 'card-muted'),
    accent: factionCssVar('everymen', 'card-accent'),
    paper: factionCssVar('everymen', 'card-bg'),
    // Special Elite by its token (#888). The DESKTOP card lifts its display
    // face to Bebas Neue, Everymen's declared card font; the mobile broadsheet
    // is left on one typewriter face, since that is what it renders today and
    // this pass is tokenization, not a mobile restyle.
    displayFont: 'var(--font-faction-typewriter)',
    bodyFont: 'var(--font-faction-typewriter)',
  }
  return (
    <div
      style={{
        position: 'relative',
        background: factionCssVar('everymen', 'card-bg'),
        color: factionCssVar('everymen', 'card-text'),
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${factionCssVar('everymen', 'card-accent')}`,
        padding: 'var(--space-lg) var(--space-lg) var(--space-md) var(--space-xl)',
        backgroundImage:
          'repeating-linear-gradient(to bottom, transparent, transparent 17px, rgba(100,140,200,0.08) 17px, rgba(100,140,200,0.08) 18px)',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 14,
          top: 0,
          bottom: 0,
          width: 1,
          background: 'rgba(220,80,80,0.2)',
        }}
      />
      <MobilePraxisBody praxis={praxis} theme={theme} />
    </div>
  )
}
