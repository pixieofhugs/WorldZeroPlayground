import type { CSSProperties } from 'react'
import type { JoinControlSkin } from '../JoinControl'
import LetterSheet from './LetterSheet'
import { MECHANIC_INDEX, type InvitationLetterProps } from './letterTypes'
import { CovenBand } from '../cardMasthead/factionBands'
import { COVEN_CARD_CTA } from '../taskCard/cardCta'
import {
  BORDER,
  CARD,
  CHROME,
  CovenCat,
  DISPLAY,
  GOLD,
  HAIR,
  INK,
  LABEL,
  READING,
  SHADOW,
  SLIP_SHEET,
  SOFT,
  Spark,
  Thread,
} from '../factionMarks/covenSlip'
import { factionBodyVars } from '../../utils/factionBodyFace'

/**
 * The Coven's letter (#3294): the candlelit spell slip, as the task card draws
 * it -- the pink-to-lavender sheet, the rose band with its twinkle field and
 * white hat, the turning cat in the corner, a heart-tied braid under the
 * headline, a charm box for the perks, the card's own gradient CTA.
 *
 * Every mark is the shipped one (`covenSlip`, `CovenBand`, `COVEN_CARD_CTA`);
 * nothing is redrawn. Light and dark flip through the `--faction-coven-*`
 * cascade. Inks are the slip's three measured tiers, which clear AA on every
 * stop of the sheet; the perk text sits on the ward `CARD`, where the same
 * tiers are measured too.
 */

const NOTICE = 'var(--faction-coven-card-notice)'

export default function CovenInvitationLetter({
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
  const openStyle: CSSProperties = { ...COVEN_CARD_CTA, flex: 1, cursor: 'pointer' }
  const dismissStyle: CSSProperties = {
    fontFamily: CHROME,
    fontWeight: 700,
    fontSize: 'var(--text-md)',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    minHeight: 44,
    padding: 'var(--space-sm)',
    border: 'none',
    background: 'transparent',
    color: LABEL,
    cursor: 'pointer',
  }
  const skin: JoinControlSkin = {
    openStyle,
    confirmStyle: openStyle,
    cancelStyle: dismissStyle,
    proseStyle: {
      fontFamily: READING,
      fontStyle: 'italic',
      fontSize: 'var(--text-content)',
      lineHeight: 1.5,
      color: SOFT,
      margin: '0 0 var(--space-md)',
    },
    errorStyle: {
      fontFamily: READING,
      fontSize: 'var(--text-content)',
      color: NOTICE,
      margin: '0 0 var(--space-md)',
    },
  }

  return (
    <LetterSheet
      data-letter="coven"
      ground={{
        ...factionBodyVars('coven'),
        background: SLIP_SHEET,
        color: INK,
        fontFamily: CHROME,
        overflow: 'hidden',
      }}
      card={{
        border: `2px solid ${BORDER}`,
        borderRadius: 18,
        boxShadow: SHADOW,
      }}
    >
      {/* The watermark, placed as the task card places it (#2041). */}
      <CovenCat size={190} style={{ right: -6, bottom: -4, opacity: 0.09 }} />

      {/* inert: a band that links away has no place in a dialog holding a pending answer. */}
      <CovenBand inert />

      <div style={{ position: 'relative', zIndex: 2, padding: 'var(--space-lg) var(--space-xl) var(--space-xl)' }}>
        <h2
          style={{
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: 'var(--text-title)',
            lineHeight: 1.06,
            letterSpacing: '0.005em',
            color: INK,
            margin: '0 0 var(--space-sm)',
            overflowWrap: 'anywhere',
          }}
        >
          {headline}
        </h2>

        <Thread style={{ margin: '0 0 var(--space-md)' }} />

        <p
          style={{
            fontFamily: READING,
            fontStyle: 'italic',
            fontSize: 'var(--text-content)',
            lineHeight: 1.5,
            color: SOFT,
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
              padding: 'var(--space-md) var(--space-lg)',
              margin: '0 0 var(--space-xl)',
              background: CARD,
              border: `1px solid ${HAIR}`,
              borderRadius: 12,
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
                  <span style={{ flex: 'none', paddingTop: 'var(--space-xs)' }}>
                    <Spark size={12} color={GOLD} />
                  </span>
                  <span>
                    {perk.name && (
                      <span
                        data-perk-name
                        style={{
                          display: 'block',
                          fontFamily: CHROME,
                          fontWeight: 700,
                          fontSize: 'var(--text-lg)',
                          lineHeight: 1.3,
                          color: LABEL,
                        }}
                      >
                        {perk.name}
                      </span>
                    )}
                    <span
                      style={{
                        display: 'block',
                        fontFamily: READING,
                        fontStyle: 'italic',
                        fontSize: 'var(--text-content)',
                        lineHeight: 1.45,
                        color: SOFT,
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
            <button type="button" autoFocus onClick={onEnlist} style={openStyle}>
              <Spark size={12} color="currentColor" />
              {joinLabel}
            </button>
            <button type="button" onClick={onDismiss} style={dismissStyle}>
              {dismissLabel}
            </button>
          </div>
        ) : (
          <div>{renderConfirm(skin)}</div>
        )}
      </div>
    </LetterSheet>
  )
}
