import { useTranslation } from 'react-i18next'
import type { PraxisCardOut } from '../../../api/praxis'
import { Lotus } from '../../factionMarks'
import { UaSigil } from '../../cards/UaSigil'
import { MobilePraxisBody, type MobileSlotTheme } from './shared'

/**
 * University of Asthmatics MOBILE praxis card (#573, reskinned #857) — the
 * vellum sheet in the hand: one 2px vermilion rule, the 158° parchment ground,
 * the lotus floated off the left edge, and the salon crest on the running head.
 * Single column, no fixed-px layout grid (SPEC-faction-ui-profile §1a); the
 * ensō total mark arrives with the shared `ScoreStamp`, which mobile renders
 * unchanged (it is size-agnostic by design — ADR-0049).
 *
 * WHY THIS CARD IS WARM WHEN THE FACTION IS NOT (#857): the praxis handoff wins
 * the praxis card, the UA identity kit (#788, #848–853) wins every other UA
 * surface. Deliberate exception. Every colour resolves from the
 * `--faction-ua-card-*` namespace; nothing reads the legacy gilt-salon token
 * family (ua-gold, ua-gilt, ua-ink, ua-paper, ua-line …) that #853 deletes —
 * an acceptance gate, so this file stays at zero hits for that prefix. UA dims
 * in dark now, too (#848 reversed the "always-light" ruling).
 */
export default function UaMobilePraxisCard({ praxis }: { praxis: PraxisCardOut }) {
  const { t } = useTranslation('praxis')
  const theme: MobileSlotTheme = {
    ink: 'var(--faction-ua-card-text)',
    muted: 'var(--faction-ua-card-muted)',
    accent: 'var(--faction-ua-card-accent)',
    paper: 'var(--faction-ua-card-bg)',
    displayFont: 'var(--faction-ua-card-font)',
    bodyFont: 'var(--faction-ua-body-font)',
    titleStyle: { fontWeight: 600, letterSpacing: '-0.01em' },
  }
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 7,
        background: 'var(--faction-ua-card-parchment)',
        border: '2px solid var(--faction-ua-card-frame)',
        boxShadow:
          '0 14px 40px -22px color-mix(in srgb, var(--faction-ua-card-text) 50%, transparent)',
        padding: 'var(--space-lg) var(--space-lg) var(--space-md)',
        fontFamily: 'var(--faction-ua-body-font)',
        color: 'var(--faction-ua-card-text)',
      }}
    >
      {/*
       * The ground watermark, scaled to the hand — the desktop sheet floats a
       * 420px lotus at left:-150; a phone-width card takes a smaller ring at a
       * proportionally shallower offset so the same crescent shows. Ornament
       * geometry, raw on purpose (§4a). Opacity is a token, so dark lifts it
       * through the cascade rather than through a ternary here.
       */}
      <Lotus
        size={300}
        color="var(--faction-ua-card-lotus)"
        style={{
          position: 'absolute',
          left: -110,
          top: 190,
          transform: 'translateY(-50%)',
          opacity: 'var(--faction-ua-card-lotus-opacity)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-md)',
            fontFamily: 'var(--faction-ua-body-font)',
            fontSize: 'var(--text-base)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--faction-ua-card-muted)',
          }}
        >
          <UaSigil width={16} height={19} />
          {t('card.masthead.ua')}
        </div>
        <MobilePraxisBody praxis={praxis} theme={theme} />
      </div>
    </div>
  )
}
