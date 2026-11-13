import type { CSSProperties } from 'react'
import type { JoinControlSkin } from '../JoinControl'
import { EphemeristsBand } from '../cardMasthead/factionBands'
import { EPHEMERISTS_CARD_CTA } from '../taskCard/cardCta'
import {
  BRASS,
  BRASS_LIGHT,
  BRASS_RULE,
  CAPS,
  CardGravityField,
  CompassRose,
  Cornice,
  DECO,
  INK,
  INNER,
  LINE,
  OCHRE,
  PLATE,
  QUIET,
  READING,
  SHADOW,
  SMALL_CAPS,
} from '../factionMarks/ephemeristsPlate'
import { factionBodyVars } from '../../utils/factionBodyFace'
import LetterSheet from './LetterSheet'
import { MECHANIC_INDEX, type InvitationLetterProps } from './letterTypes'

/**
 * The Ephemerists' letter (#3294): THE VALLEY PLATE, as a letter. Plate ground
 * ruled in brass (1px border + a 1px outline at 3px, square corners), the real
 * gravity field bending toward its well, the card's own masthead band and
 * cornice, the compass rose above the headline, and the card's night CTA under
 * its 1px / 3px-double brass rule. Every ornament is the card's own export.
 *
 * Deviations: the masthead is the card band mounted `inert` (a link out of an
 * invitation would abandon it); the rose carries no figure (no points here).
 */

const ROSE = 96
// The gravity field's nominal width is the task card's design width (384); the
// letter is wider, and the field's own note says wider scales the rows up.
const FIELD_WIDTH = 384

export default function EphemeristsInvitationLetter({
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
  // The task card's one plate CTA: paint from `.eph-cta` (width changes between
  // cascades), geometry from the card's constant, stretched to the row.
  const enlistStyle: CSSProperties = { ...EPHEMERISTS_CARD_CTA, flex: 1, margin: 0 }
  const dismissStyle: CSSProperties = {
    ...SMALL_CAPS,
    minHeight: 44,
    boxSizing: 'border-box',
    fontSize: 'var(--text-md)',
    padding: 'var(--space-sm) var(--space-md)',
    border: 'none',
    background: 'transparent',
    color: QUIET,
    cursor: 'pointer',
  }
  const prose: CSSProperties = {
    fontFamily: READING,
    fontSize: 'var(--text-content)',
    lineHeight: 1.55,
    color: 'var(--faction-ephemerists-plate-muted)',
    margin: '0 0 var(--space-md)',
  }
  const skin: JoinControlSkin = {
    openStyle: enlistStyle,
    confirmStyle: enlistStyle,
    cancelStyle: dismissStyle,
    className: 'eph-cta',
    proseStyle: prose,
    // --color-danger is 3.54:1 on the vellum; the card's own notice ink clears it.
    errorStyle: { ...prose, color: 'var(--faction-ephemerists-card-notice)' },
  }

  return (
    <LetterSheet
      data-letter="ephemerists"
      ground={{
        ...factionBodyVars('ephemerists'),
        isolation: 'isolate',
        overflow: 'hidden',
        background: PLATE,
        color: INK,
      }}
      card={{
        border: `1px solid ${BRASS}`,
        outline: `1px solid ${BRASS_LIGHT}`,
        outlineOffset: 3,
        boxShadow: SHADOW,
      }}
    >
      <CardGravityField width={FIELD_WIDTH} />
      <EphemeristsBand inert />
      <Cornice flutes={40} />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--space-xl)',
        }}
      >
        <div style={{ position: 'relative', width: ROSE, height: ROSE, alignSelf: 'center', marginBottom: 'var(--space-lg)' }}>
          <CompassRose size={ROSE} />
        </div>

        <h2
          style={{
            fontFamily: DECO,
            fontWeight: 500,
            fontSize: 'var(--text-title)',
            letterSpacing: '0.02em',
            lineHeight: 1.24,
            color: INK,
            margin: '0 0 var(--space-md)',
            overflowWrap: 'anywhere',
          }}
        >
          {headline}
        </h2>

        <p style={{ ...prose, margin: '0 0 var(--space-lg)' }}>{pitch}</p>

        {perks.length > 0 && (
          <ul
            style={{
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)',
              border: `1px solid ${BRASS_RULE}`,
              padding: 'var(--space-md) var(--space-lg)',
              margin: '0 0 var(--space-xl)',
              background: INNER,
            }}
          >
            {perks.map((perk, idx) => {
              const mechanic = idx === MECHANIC_INDEX
              return (
                <li
                  key={idx}
                  data-perk={mechanic ? 'mechanic' : 'flavour'}
                  style={{
                    paddingTop: idx === 0 ? 0 : 'var(--space-md)',
                    borderTop: idx === 0 ? 'none' : `1px solid ${LINE}`,
                  }}
                >
                  {perk.name && (
                    <span
                      data-perk-name
                      style={{
                        ...SMALL_CAPS,
                        display: 'block',
                        fontFamily: CAPS,
                        fontSize: 'var(--text-md)',
                        lineHeight: 1.4,
                        color: OCHRE,
                      }}
                    >
                      {perk.name}
                    </span>
                  )}
                  <span
                    style={{
                      display: 'block',
                      fontFamily: READING,
                      fontSize: 'var(--text-content)',
                      lineHeight: 1.45,
                      color: INK,
                    }}
                  >
                    {perk.desc}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        {/* The card's CTA rule: a hairline above, a 3px double below. */}
        <div
          aria-hidden="true"
          style={{
            height: 3,
            borderTop: `1px solid ${BRASS_RULE}`,
            borderBottom: `3px double ${BRASS_RULE}`,
            margin: '0 0 var(--space-md)',
          }}
        />
        {!confirming ? (
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
            <button type="button" autoFocus className="eph-cta" onClick={onEnlist} style={skin.openStyle}>
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
