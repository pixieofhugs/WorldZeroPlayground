import type { PraxisCardOut } from '../../../api/praxis'
import { factionCssVar } from '../../../utils/factions'
import { CovenSigil } from '../../cards/CovenSigil'
import i18n from '../../../i18n'
import { MobilePraxisBody, type MobileSlotTheme } from './shared'

/**
 * Warriors of Whimsy MOBILE praxis card (#573) — a taped scrap of the proof
 * board: a torn pink strip peeking behind the tilted notepad, a strip of tape,
 * sparkle marks. Mirrors the desktop COVEN praxis frame; --faction-wow-* tokens,
 * always-light.
 */
export default function CovenMobilePraxisCard({ praxis }: { praxis: PraxisCardOut }) {
  const accent = factionCssVar('wow', 'card-accent')
  const theme: MobileSlotTheme = {
    ink: factionCssVar('wow', 'card-text'),
    muted: factionCssVar('wow', 'card-muted'),
    accent,
    paper: factionCssVar('wow', 'card-bg'),
    displayFont: 'var(--faction-wow-card-font)',
    bodyFont: "'Courier Prime', monospace",
  }
  return (
    <div
      style={{
        position: 'relative',
        paddingTop: 'var(--space-sm)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: -3,
          right: -3,
          height: 26,
          background: 'var(--faction-wow-scrap-mid)',
          border: '1.5px solid rgba(0,0,0,0.12)',
          transform: 'rotate(-3deg)',
        }}
      />
      <div
        style={{
          position: 'relative',
          background: factionCssVar('wow', 'card-bg'),
          border: '1.5px solid rgba(0,0,0,0.12)',
          padding: 'var(--space-lg) var(--space-lg) var(--space-md)',
          zIndex: 2,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -6,
            left: '50%',
            transform: 'translateX(-50%) rotate(-2deg)',
            width: 54,
            height: 14,
            background: 'var(--faction-wow-tape)',
            borderRadius: 1,
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-md)',
            fontFamily: "'Courier Prime', monospace",
            fontSize: 'var(--text-sm)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: accent,
          }}
        >
          <CovenSigil size={11} color={accent} />
          {i18n.t('feed:identity.wow.windowTitle')}
        </div>
        <MobilePraxisBody praxis={praxis} theme={theme} />
      </div>
    </div>
  )
}
