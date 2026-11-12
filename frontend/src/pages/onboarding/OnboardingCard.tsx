import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/**
 * The shell every onboarding card wears: the na spectrum sheet, lifted from
 * `DefaultTaskCard` (`SPEC-onboarding.md` § Visual language).
 *
 * Rainbow in exactly two places, guaranteed here: the 3px border band and the
 * conic step ring. No tick (#3098): alone it read as a stray pixel. Cards supply
 * words and controls only.
 *
 * The look-around escape lives here so every stop has it by construction.
 * Colour is all `--faction-default-*` tokens.
 */

const MONO = 'var(--font-body)'
const LORA = 'var(--font-display)'

/** Conic ring outer diameter; geometry, raw px (WORLD_ZERO_STYLE §4a). */
const RING_SIZE = 84
const SHEET_WIDTH = 560

/**
 * Max `card.stepCaption` length: geometry (#2765). 84px ring less `--space-xs`
 * each side = 76px; mono 11px at 0.6em + 0.2em tracking = 8.8px/char; 76/8.8 =
 * 8.6. `pages/__tests__/onboardingCards.test.tsx` holds the catalog to it.
 */
export const RING_CAPTION_MAX_CHARS = 8

const caption: CSSProperties = {
  fontFamily: MONO,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--faction-default-card-muted)',
}

/**
 * Controls must wrap (#2764): no `nowrap`. `text-align` centres the wrapped line;
 * `justify-content` alone leaves the second line ragged. Both are needed.
 */
const controlBase: CSSProperties = {
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  fontFamily: LORA,
  fontWeight: 600,
  fontSize: 'var(--text-xl)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  padding: 'var(--space-md) var(--space-2xl)',
  borderRadius: 11,
  textDecoration: 'none',
}

/**
 * Exported for `AuthCard`'s `SignInOptions`. Na's card ink, not a rainbow stop
 * (one stop reads as a single-hue accent, and would be a third rainbow).
 */
export const primaryControl: CSSProperties = {
  ...controlBase,
  border: 'none',
  background: 'var(--faction-default-card-accent)',
  color: 'var(--faction-default-on-accent)',
}

const secondaryControl: CSSProperties = {
  ...controlBase,
  background: 'transparent',
  color: 'var(--faction-default-card-text)',
  border: '1px solid color-mix(in srgb, var(--faction-default-card-accent) 35%, transparent)',
}

export default function OnboardingCard({
  step,
  title,
  actions,
  children,
}: {
  step: number
  title: string
  /** The look-around escape is added by the shell, not passed here. */
  actions: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation('onboarding')

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: 'var(--space-4xl) var(--space-sm)',
      }}
    >
      <article
        style={{
          boxSizing: 'border-box',
          width: SHEET_WIDTH,
          maxWidth: '100%',
          // Rainbow 1 of 2: painted into the border box behind the sheet.
          border: '3px solid transparent',
          borderRadius: 14,
          backgroundImage:
            'linear-gradient(var(--faction-default-card-bg), var(--faction-default-card-bg)), var(--faction-default-rainbow)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: '0 12px 32px -14px var(--color-cast-shadow)',
          color: 'var(--faction-default-card-text)',
          fontFamily: MONO,
          padding: 'var(--space-xl)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          {/* Rainbow 2 of 2: the conic ring. */}
          <div
            style={{
              flex: '0 0 auto',
              boxSizing: 'border-box',
              width: RING_SIZE,
              height: RING_SIZE,
              borderRadius: '50%',
              padding: 'var(--space-xs)',
              background: 'var(--faction-default-rainbow-conic)',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'var(--faction-default-card-bg)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 0.9,
              }}
            >
              <span style={{ fontFamily: LORA, fontWeight: 600, fontSize: 'var(--text-title)' }}>
                {step}
              </span>
              {/* #2765: degrade legibly if too long: `overflow-wrap` breaks,
                  `text-align` centres. RING_CAPTION_MAX_CHARS is the real fix. */}
              <span
                style={{
                  ...caption,
                  marginTop: 'var(--space-xs)',
                  textAlign: 'center',
                  overflowWrap: 'anywhere',
                }}
              >
                {t('card.stepCaption')}
              </span>
            </div>
          </div>

          <div style={{ flex: 1, height: 1, background: 'var(--faction-default-border)' }} />
        </div>

        <h1
          style={{
            fontFamily: LORA,
            fontWeight: 600,
            fontStyle: 'italic',
            fontSize: 'var(--text-title)',
            lineHeight: 1.14,
            margin: '0 0 var(--space-lg)',
            overflowWrap: 'anywhere',
          }}
        >
          {title}
        </h1>

        {children}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'var(--space-md)',
            // Bodies end on a zero bottom margin (#3098).
            marginTop: 'var(--space-2xl)',
          }}
        >
          {actions}
          {/* A plain link out (public surfaces need no session); `/tasks`, not
              `/`, which logged out re-explains the game. */}
          <Link to="/tasks" style={secondaryControl} data-testid="onboarding-look-around">
            {t('card.lookAround')}
          </Link>
        </div>
      </article>
    </div>
  )
}
