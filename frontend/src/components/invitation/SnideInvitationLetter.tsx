import type { CSSProperties } from 'react'
import type { JoinControlSkin } from '../JoinControl'
import { SnideBand } from '../cardMasthead/factionBands'
import { SNIDE_CARD_CTA } from '../taskCard/cardCta'
import { CARD_CTA } from '../ctaTapFloor'
import { PenLoop, RANSOM_CUTS, WALL } from '../factionMarks/snideAtoms'
import { factionBodyVars } from '../../utils/factionBodyFace'
import LetterSheet from './LetterSheet'
import { MECHANIC_INDEX, type InvitationLetterProps } from './letterTypes'

/**
 * S.N.I.D.E.'s letter (#3294): the task card's flyposted clipping -- the WALL
 * ground, the ink band, the headline cut from the card's four ransom sources,
 * a `.snd-censor` rule, the mechanic as a black knockout label, and the sprayed
 * CTA inside the card's pink pen loop. Every ornament is the card's own atom.
 */

const INK = 'var(--faction-snide-note-ink)'
const MUTED = 'var(--faction-snide-note-muted)'
const BLACK = 'var(--faction-snide-font-black)'
const TYPE = 'var(--faction-snide-font-type)'

export default function SnideInvitationLetter({
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
  const dismissStyle: CSSProperties = {
    ...CARD_CTA,
    fontFamily: TYPE,
    fontSize: 'var(--text-base)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: 'var(--space-sm) var(--space-md)',
    border: 'none',
    background: 'transparent',
    color: MUTED,
    cursor: 'pointer',
  }
  const prose: CSSProperties = {
    fontFamily: TYPE,
    fontSize: 'var(--text-content)',
    lineHeight: 1.5,
    margin: '0 0 var(--space-md)',
  }
  const skin: JoinControlSkin = {
    openStyle: SNIDE_CARD_CTA,
    confirmStyle: SNIDE_CARD_CTA,
    cancelStyle: dismissStyle,
    proseStyle: { ...prose, color: MUTED },
    errorStyle: { ...prose, color: 'var(--faction-snide-wall-alarm)' },
  }

  return (
    <LetterSheet
      data-letter="snide"
      ground={{ ...factionBodyVars('snide'), background: WALL, color: INK, fontFamily: TYPE }}
      card={{
        border: '1px solid var(--faction-snide-note-wall-edge)',
        borderRadius: 0,
        boxShadow: 'var(--faction-snide-note-wall-shadow)',
        transform: 'rotate(-0.4deg)',
      }}
    >
      <SnideBand inert />

      <div style={{ padding: 'var(--space-lg) var(--space-xl) var(--space-xl)' }}>
        {/* The cuts split the words across spans; the label keeps the heading one string. */}
        <h2
          aria-label={headline}
          style={{ fontSize: 'var(--text-title)', lineHeight: 1.35, margin: '0 0 var(--space-md)' }}
        >
          {headline.split(/\s+/).map((word, index) => (
            <span key={`${index}-${word}`} aria-hidden="true">
              {index > 0 ? ' ' : ''}
              <span
                style={{
                  display: 'inline-block',
                  maxWidth: '100%',
                  overflowWrap: 'anywhere',
                  ...RANSOM_CUTS[index % RANSOM_CUTS.length],
                }}
              >
                {word}
              </span>
            </span>
          ))}
        </h2>

        <span aria-hidden="true" className="snd-censor" style={{ margin: '0 0 var(--space-md)' }} />

        <p style={{ ...prose, lineHeight: 1.55, color: MUTED, margin: '0 0 var(--space-lg)' }}>{pitch}</p>

        {perks.length > 0 && (
          <ul
            style={{
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)',
              padding: 0,
              margin: '0 0 var(--space-lg)',
            }}
          >
            {perks.map((perk, idx) => {
              const mechanic = idx === MECHANIC_INDEX
              return (
                <li
                  key={idx}
                  data-perk={mechanic ? 'mechanic' : 'flavour'}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-xs)' }}
                >
                  {perk.name && (
                    <span
                      data-perk-name
                      style={{
                        fontFamily: BLACK,
                        fontSize: 'var(--text-md)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        // The card's knockout cut: its own pair, because paper/ink swap under dark.
                        color: 'var(--faction-snide-note-knockout-ink)',
                        background: 'var(--faction-snide-note-knockout-bg)',
                        padding: 'var(--space-xs) var(--space-sm)',
                        transform: 'rotate(-1.2deg)',
                      }}
                    >
                      {perk.name}
                    </span>
                  )}
                  <span
                    style={{
                      fontFamily: TYPE,
                      fontSize: 'var(--text-content)',
                      lineHeight: 1.45,
                      color: mechanic ? INK : MUTED,
                    }}
                  >
                    {perk.desc}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        {!confirming ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)' }}>
            {/* The card's pink pen circle, stretched round the sprayed CTA. */}
            <div style={{ position: 'relative', padding: 'var(--space-lg) var(--space-xl)' }}>
              <span aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <PenLoop stretch />
              </span>
              <button
                type="button"
                autoFocus
                onClick={onEnlist}
                style={{ ...skin.openStyle, position: 'relative', cursor: 'pointer' }}
              >
                {joinLabel}
              </button>
            </div>
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
