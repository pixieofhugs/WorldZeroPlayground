import type { CSSProperties } from 'react'
import { factionCssVar } from '../../utils/factions'
import type { JoinControlSkin } from '../JoinControl'
import LetterSheet from './LetterSheet'
import { MECHANIC_INDEX, type InvitationLetterProps } from './letterTypes'

/**
 * The letter for any slug without its own (#3294): the adaptive prospectus the
 * seven factions all wore before they were given letters of their own --
 * neutral paper and ink, the app's faces, the faction hue on the perks.
 *
 * #2298 cut the kicker, the prospectus overline and the terms slip; the letter
 * is masthead, headline, pitch, ONE box, CTA. #2774: only the mechanic is named.
 */

const PAPER = 'var(--color-bg-page)'
const INK = 'var(--color-text-primary)'
const MUTED = 'var(--color-text-secondary)'
const FAINT = 'var(--color-text-tertiary)'
const FONT_DISPLAY = 'var(--font-display)'
const FONT_BODY = 'var(--font-body)'

export default function DefaultInvitationLetter({
  slug,
  name,
  headline,
  pitch,
  perks,
  joinLabel,
  dismissLabel,
  confirming,
  onEnlist,
  onDismiss,
  renderConfirm,
}: InvitationLetterProps) {
  const accent = factionCssVar(slug)
  // The same accent, measured safe as INK rather than as a fill (#2619).
  const accentInk = factionCssVar(slug, 'accent-ink')
  const border = factionCssVar(slug, 'border')

  const enlistStyle: CSSProperties = {
    flex: 1,
    fontFamily: FONT_BODY,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontSize: 'var(--text-md)',
    fontWeight: 700,
    padding: 'var(--space-md) var(--space-lg)',
    border: 'none',
    background: accent,
    color: PAPER,
    cursor: 'pointer',
    boxShadow: `4px 4px 0 ${border}`,
    transition: 'opacity 150ms',
  }
  const dismissStyle: CSSProperties = {
    fontFamily: FONT_BODY,
    fontSize: 'var(--text-base)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: 'var(--space-sm) var(--space-sm)',
    border: 'none',
    background: 'transparent',
    color: FAINT,
    cursor: 'pointer',
  }
  const skin: JoinControlSkin = {
    openStyle: enlistStyle,
    confirmStyle: enlistStyle,
    cancelStyle: dismissStyle,
    proseStyle: {
      fontFamily: FONT_BODY,
      fontSize: 'var(--text-content)',
      lineHeight: 1.5,
      color: MUTED,
      margin: '0 0 var(--space-md)',
    },
    errorStyle: {
      fontFamily: FONT_BODY,
      fontSize: 'var(--text-content)',
      color: 'var(--color-danger)',
      margin: '0 0 var(--space-md)',
    },
  }

  return (
    <LetterSheet
      data-letter="default"
      ground={{ background: PAPER, padding: 'var(--space-xl)', fontFamily: FONT_BODY }}
      card={{
        border: `2px solid ${border}`,
        borderRadius: 12,
        boxShadow: '0 18px 46px -14px var(--color-cast-shadow)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <span
          aria-hidden
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            flex: 'none',
            background: accent,
            boxShadow: `0 0 0 3px ${PAPER}, 0 0 0 4px ${border}`,
          }}
        />
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 'var(--text-content)',
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: INK,
          }}
        >
          {name}
        </span>
      </div>

      <h2
        style={{
          fontFamily: FONT_DISPLAY,
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: 'var(--text-title)',
          lineHeight: 1.12,
          color: INK,
          margin: '0 0 var(--space-md)',
        }}
      >
        {headline}
      </h2>

      <p
        style={{
          fontFamily: FONT_BODY,
          fontSize: 'var(--text-content)',
          lineHeight: 1.55,
          color: MUTED,
          margin: '0 0 var(--space-lg)',
        }}
      >
        {pitch}
      </p>

      {perks.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)',
            border: `1px solid ${border}`,
            borderRadius: 8,
            padding: 'var(--space-md) var(--space-lg)',
            margin: '0 0 var(--space-xl)',
            background: factionCssVar(slug, 'light'),
          }}
        >
          {perks.map((perk, idx) => {
            const mechanic = idx === MECHANIC_INDEX
            return (
              <li
                key={idx}
                data-perk={mechanic ? 'mechanic' : 'flavour'}
                style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}
              >
                {/* eslint-disable-next-line local/no-raw-style-values, local/no-faction-hue-as-ink -- ornament: a four-pointed-star dingbat used as a list bullet, not type. `aria-hidden` because the perk beside it carries the whole meaning (#2108). The hue marks the ONE row that states a real mechanic. */}
                <span aria-hidden="true" style={{ color: mechanic ? accent : FAINT, fontSize: 12, lineHeight: 1.4, flex: 'none' }}>
                  &#x2726;
                </span>
                <span>
                  {perk.name && (
                    <span
                      data-perk-name
                      style={{
                        display: 'block',
                        fontFamily: FONT_BODY,
                        fontSize: 'var(--text-md)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        lineHeight: 1.4,
                        color: accentInk,
                      }}
                    >
                      {perk.name}
                    </span>
                  )}
                  <span
                    style={{
                      display: 'block',
                      fontFamily: FONT_DISPLAY,
                      fontStyle: 'italic',
                      fontSize: 'var(--text-content)',
                      lineHeight: 1.4,
                      color: INK,
                    }}
                  >
                    {perk.desc}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {!confirming ? (
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          <button
            type="button"
            autoFocus
            onClick={onEnlist}
            style={skin.openStyle}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {joinLabel}
          </button>
          <button type="button" onClick={onDismiss} style={dismissStyle}>
            {dismissLabel}
          </button>
        </div>
      ) : (
        <div>{renderConfirm(skin)}</div>
      )}
    </LetterSheet>
  )
}
