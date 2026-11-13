import type { CSSProperties } from 'react'
import { factionBodyVars } from '../../utils/factionBodyFace'
import { factionRoleVars } from '../../utils/factionRoles'
import type { JoinControlSkin } from '../JoinControl'
import { WowBand } from '../cardMasthead/factionBands'
import { BalloonBunch, Bunting, Plaque, Zig } from '../factionMarks/wowOrnament'
import { WOW_CARD_CTA } from '../taskCard/cardCta'
import LetterSheet from './LetterSheet'
import { MECHANIC_INDEX, type InvitationLetterProps } from './letterTypes'

/**
 * Warriors of Whimsy's letter (#3294): THE CHRONICLE. The praxis card's cream
 * parchment in its gold frame, the task card's plum band + bunting on top, the
 * task card's points plaque around the mechanic, its balloon knights flanking
 * the plum call. Every ornament is the card's own (`wowOrnament`, `WowBand`,
 * `WOW_CARD_CTA`). Plum and gold are fixed across themes; the cream flips.
 */

const MED = 'var(--wow-letter-face)' // MedievalSharp
const LORA = 'var(--faction-wow-body-font)'
const INK = 'var(--wow-letter-ink)'
const QUIET = 'var(--wow-letter-quiet)'
const PLUM = 'var(--wow-letter-accent)'
const PAPER = 'var(--faction-wow-chronicle-bg)'
const GOLD = 'var(--faction-wow-chronicle-gold)'
// The card's balloon-knight width (WowTaskCard `KNIGHT`): geometry, a raw number.
const KNIGHT = 32

export default function WowInvitationLetter({
  slug,
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
    minHeight: 44,
    fontFamily: LORA,
    fontStyle: 'italic',
    fontSize: 'var(--text-base)',
    padding: 'var(--space-sm) var(--space-md)',
    border: 'none',
    background: 'transparent',
    color: QUIET,
    cursor: 'pointer',
  }
  const skin: JoinControlSkin = {
    openStyle: WOW_CARD_CTA,
    confirmStyle: WOW_CARD_CTA,
    cancelStyle: dismissStyle,
    proseStyle: {
      fontFamily: LORA,
      fontStyle: 'italic',
      fontSize: 'var(--text-content)',
      lineHeight: 1.5,
      color: QUIET,
      margin: '0 0 var(--space-md)',
    },
    errorStyle: {
      fontFamily: LORA,
      fontSize: 'var(--text-content)',
      color: 'var(--faction-wow-card-alarm)',
      margin: '0 0 var(--space-md)',
    },
  }

  return (
    <LetterSheet
      data-letter="wow"
      ground={{
        ...factionBodyVars(slug),
        ...factionRoleVars(slug, 'wow-letter'),
        background: PAPER,
        color: INK,
        fontFamily: LORA,
        overflow: 'hidden',
      }}
      card={{
        border: '2px solid var(--faction-wow-chronicle-border)',
        borderRadius: 'var(--wow-letter-radius)',
        boxShadow: '0 6px 22px -10px var(--faction-wow-chronicle-shadow)',
      }}
    >
      {/* inert: the band is a link to the faction page on a card; a letter must not navigate away. */}
      <WowBand inert />
      <Bunting />

      <div style={{ padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column' }}>
        <h2
          style={{
            fontFamily: MED,
            fontSize: 'var(--text-title)',
            lineHeight: 1.1,
            color: INK,
            margin: '0 0 var(--space-sm)',
            overflowWrap: 'anywhere',
          }}
        >
          {headline}
        </h2>
        <Zig id="letter" style={{ margin: '0 0 var(--space-md)' }} />

        <p
          style={{
            fontFamily: LORA,
            fontStyle: 'italic',
            fontSize: 'var(--text-content)',
            lineHeight: 1.5,
            color: QUIET,
            margin: '0 0 var(--space-lg)',
          }}
        >
          {pitch}
        </p>

        {perks.length > 0 && (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)',
              margin: '0 0 var(--space-xl)',
            }}
          >
            {perks.map((perk, idx) => {
              const mechanic = idx === MECHANIC_INDEX
              const body = (
                <>
                  {perk.name && (
                    <span
                      data-perk-name
                      style={{ display: 'block', fontFamily: MED, fontSize: 'var(--text-md)', color: PLUM, marginBottom: 'var(--space-xs)' }}
                    >
                      {perk.name}
                    </span>
                  )}
                  <span style={{ display: 'block', fontFamily: LORA, fontStyle: 'italic', fontSize: 'var(--text-content)', lineHeight: 1.4, color: INK }}>
                    {perk.desc}
                  </span>
                </>
              )
              return (
                <li key={idx} data-perk={mechanic ? 'mechanic' : 'flavour'}>
                  {mechanic ? (
                    <Plaque style={{ textAlign: 'left' }}>{body}</Plaque>
                  ) : (
                    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
                      {/* eslint-disable-next-line local/no-raw-style-values -- ornament: a four-pointed-star bullet, not type; `aria-hidden` because the perk beside it carries the meaning. */}
                      <span aria-hidden="true" style={{ color: GOLD, fontSize: 12, lineHeight: 1.6, flex: 'none' }}>
                        &#x2726;
                      </span>
                      <span>{body}</span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {!confirming ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 'var(--space-md)' }}>
              <BalloonBunch size={KNIGHT} bob={false} style={{ transform: 'rotate(-6deg)' }} />
              <button type="button" autoFocus onClick={onEnlist} style={WOW_CARD_CTA}>
                {joinLabel}
              </button>
              <BalloonBunch size={KNIGHT} bob={false} style={{ transform: 'rotate(-6deg) scaleX(-1)' }} />
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
