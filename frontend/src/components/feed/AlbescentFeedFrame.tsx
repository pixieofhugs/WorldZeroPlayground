import type { ReactNode } from 'react'

import i18n from '../../i18n'

/**
 * Albescent per-faction feed frame (surface #12, SPEC-faction-ui-profile.md;
 * #232 slice 2 — the read/content archetypes landed in slice 1 / #417).
 *
 * A thin presentational WRAPPER, like the other six frames: it skins the neutral
 * feed card (`children`) as a single entry in "The Record" — a white archival
 * sheet with an inset architectural hairline and a quiet mono masthead. The
 * frame supplies only the OUTER chrome; the unchanged card arrives via
 * `children` and must NOT be reimplemented here.
 *
 * Albescent is ALWAYS LIGHT: its --faction-albescent-* tokens are identical in
 * both themes, so the sheet reads as white paper regardless of the global theme
 * and never mutates data-theme (mirror of UAFeedFrame / SingularityFeedFrame).
 * It reads --faction-albescent-* directly rather than factionCssVar('albescent',
 * …), which still resolves the albescent→ua alias until the alias is dropped
 * (the final #232 step). An explicit `albescent` row in FACTION_FEED_FRAMES beats
 * the alias in pickVariant, so this renders immediately. Design:
 * docs/design/albescent-kit/Albescent Updates.html + albescent.css.
 */

// Token shorthands — every color resolves to a --faction-albescent-* var.
const SURFACE = 'var(--faction-albescent-surface)' // the white sheet
const BORDER = 'var(--faction-albescent-border)' // sheet edge
const BORDER_FAINT = 'var(--faction-albescent-border-faint)' // inset architectural line
const BORDER_RULE = 'var(--faction-albescent-border-rule)' // masthead hairline
const TEXT_FAINT = 'var(--faction-albescent-text-faint)' // quiet mono masthead
const MONO = 'var(--faction-albescent-mono)' // Courier Prime

// Neutral archival drop-shadow (black-alpha only, no faction hue) — ported from
// the design's --al-shadow; mirrors the inline neutral shadows the other frames use.
const SHEET_SHADOW = '0 2px 18px rgba(0,0,0,0.055), 0 1px 3px rgba(0,0,0,0.04)'

export default function AlbescentFeedFrame({ children }: { children: ReactNode }) {
  return (
    // White archival sheet — thin edge + soft neutral shadow.
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, boxShadow: SHEET_SHADOW }}>
      {/* inset architectural hairline holding the entry */}
      <div style={{ margin: 6, border: `1px solid ${BORDER_FAINT}`, padding: '13px 17px' }}>
        {/* quiet mono masthead */}
        <div
          aria-hidden="true"
          style={{
            fontFamily: MONO,
            fontSize: 7.5,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: TEXT_FAINT,
          }}
        >
          {i18n.t('feed:frame.albescent.masthead')}
        </div>
        <div aria-hidden="true" style={{ height: 1, width: 56, margin: '9px 0 12px', background: BORDER_RULE }} />

        {/* the neutral card, unchanged */}
        {children}
      </div>
    </div>
  )
}
