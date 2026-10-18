import type { CSSProperties } from 'react'
import type { JoinControlSkin } from '../JoinControl'
import { EverymenBand } from '../cardMasthead/factionBands'
import { EverymenCog } from '../factionMarks/everymenCogs'
import { FistAndBolt } from '../factionMarks/everymenFistBolt'
import { CARD_CTA_ROW, EVERYMEN_CARD_CTA } from '../taskCard/cardCta'
import { CARD_CTA } from '../ctaTapFloor'
import { factionBodyVars } from '../../utils/factionBodyFace'
import LetterSheet from './LetterSheet'
import { MECHANIC_INDEX, type InvitationLetterProps } from './letterTypes'

/**
 * Everymen -- THE UNION BILL, as a letter (#3294).
 *
 * The task card's materials: a cream sheet in the double frame (2px outer, 1px
 * inner ink), the shared `.em-burst` rays inside it, the red band with its 3px
 * double rule (`EverymenBand`, inert -- a letter is not a place you leave from),
 * Bebas for every headline, Courier for everything read, a dashed red rule
 * struck by the cog, a numbered roll, and the ink CTA flanked by the card's own
 * fist-and-bolt. Dark is the `[data-theme="dark"]` cascade; the band is fixed.
 */

const PAPER = 'var(--everymen-paper)'
const INK = 'var(--everymen-paper-text)'
const MUTED = 'var(--everymen-muted)'
const QUIET = 'var(--everymen-quiet)'
const RED = 'var(--everymen-red)'
// The sheet-measured red ink for WORDS (#694): --everymen-red is 4.49 / 4.16 on paper.
const NOTICE = 'var(--faction-everymen-card-notice)'
const POSTER = 'var(--faction-everymen-card-font)' // Bebas Neue
const BODY = 'var(--faction-everymen-body-font)' // Courier Prime
const DASH = `2px dashed ${RED}`

export default function EverymenInvitationLetter({
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
  // The confirm pair sits two to a row: the CTA's 2xl side padding is for the
  // lone open button, so the pair trades it for xl (named deviation).
  const pairStyle: CSSProperties = { ...EVERYMEN_CARD_CTA, padding: 'var(--space-sm) var(--space-xl)' }
  const dismissStyle: CSSProperties = {
    ...CARD_CTA,
    fontFamily: POSTER,
    fontSize: 'var(--text-xl)',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    padding: 'var(--space-sm) var(--space-md)',
    border: 'none',
    background: 'transparent',
    color: QUIET,
    cursor: 'pointer',
  }
  const skin: JoinControlSkin = {
    openStyle: EVERYMEN_CARD_CTA,
    confirmStyle: pairStyle,
    cancelStyle: dismissStyle,
    proseStyle: {
      fontFamily: BODY,
      fontSize: 'var(--text-content)',
      lineHeight: 1.55,
      color: INK,
      margin: '0 0 var(--space-md)',
    },
    errorStyle: {
      fontFamily: BODY,
      fontSize: 'var(--text-content)',
      color: NOTICE,
      margin: '0 0 var(--space-md)',
    },
  }

  return (
    <LetterSheet
      data-letter="everymen"
      ground={{
        ...factionBodyVars('everymen'),
        background: PAPER,
        color: INK,
        fontFamily: BODY,
        padding: 'var(--space-xs)',
      }}
      card={{
        border: `2px solid ${INK}`,
        borderRadius: 2,
        boxShadow: 'var(--faction-everymen-bill-shadow)',
      }}
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${INK}`,
          borderRadius: 1,
        }}
      >
        <div aria-hidden="true" className="em-burst" />
        <EverymenBand inert />

        <div style={{ position: 'relative', zIndex: 2, flex: 1, padding: 'var(--space-lg) var(--space-xl) var(--space-xl)' }}>
          <h2
            style={{
              fontFamily: POSTER,
              fontSize: 'var(--text-heading)',
              lineHeight: 0.96,
              letterSpacing: '0.01em',
              textTransform: 'uppercase',
              color: INK,
              margin: '0 0 var(--space-md)',
              overflowWrap: 'anywhere',
            }}
          >
            {headline}
          </h2>

          <div
            aria-hidden="true"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', margin: '0 0 var(--space-md)' }}
          >
            <span style={{ flex: 1, height: 0, borderTop: DASH }} />
            <EverymenCog size={15} fill={RED} hub={PAPER} />
            <span style={{ flex: 1, height: 0, borderTop: DASH }} />
          </div>

          <p
            style={{
              fontFamily: BODY,
              fontSize: 'var(--text-content)',
              lineHeight: 1.55,
              color: MUTED,
              margin: '0 0 var(--space-lg)',
            }}
          >
            {pitch}
          </p>

          {perks.length > 0 && (
            <ol
              style={{
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-md)',
                padding: 0,
                margin: '0 0 var(--space-xl)',
              }}
            >
              {perks.map((perk, idx) => (
                <li
                  key={idx}
                  data-perk={idx === MECHANIC_INDEX ? 'mechanic' : 'flavour'}
                  style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}
                >
                  {/* The roll's numeral: a 24px glyph (3:1 floor; red clears it) beside a perk that carries the whole meaning. */}
                  <span
                    aria-hidden="true"
                    style={{ flex: 'none', minWidth: '2ch', fontFamily: POSTER, fontSize: 'var(--text-title)', lineHeight: 1, color: RED }}
                  >
                    {['I.', 'II.', 'III.', 'IV.', 'V.'][idx] ?? `${idx + 1}.`}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    {perk.name && (
                      <span
                        data-perk-name
                        style={{
                          display: 'block',
                          fontFamily: POSTER,
                          fontSize: 'var(--text-title)',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          lineHeight: 1,
                          color: NOTICE,
                          marginBottom: 'var(--space-xs)',
                        }}
                      >
                        {perk.name}
                      </span>
                    )}
                    <span
                      style={{
                        display: 'block',
                        fontFamily: BODY,
                        fontSize: 'var(--text-content)',
                        lineHeight: 1.5,
                        color: INK,
                      }}
                    >
                      {perk.desc}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}

          {!confirming ? (
            <>
              <div style={{ ...CARD_CTA_ROW, alignItems: 'center', gap: 'var(--space-sm)' }}>
                <FistAndBolt width={84} mirrored />
                <button type="button" autoFocus onClick={onEnlist} style={skin.openStyle}>
                  {joinLabel}
                </button>
                <FistAndBolt width={84} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
                <button type="button" onClick={onDismiss} style={dismissStyle}>
                  {dismissLabel}
                </button>
              </div>
            </>
          ) : (
            <div>{renderConfirm(skin)}</div>
          )}
        </div>
      </div>
    </LetterSheet>
  )
}
