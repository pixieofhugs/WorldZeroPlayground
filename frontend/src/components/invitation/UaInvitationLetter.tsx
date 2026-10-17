import type { CSSProperties } from 'react'
import type { JoinControlSkin } from '../JoinControl'
import LetterSheet from './LetterSheet'
import { MECHANIC_INDEX, type InvitationLetterProps } from './letterTypes'
import { Lotus } from '../factionMarks'
import { UA_DISPLAY, UA_TEXT, UaCtaFlank } from '../factionMarks/uaAtoms'
import { UaBand } from '../cardMasthead/factionBands'
import { UA_CARD_CTA } from '../taskCard/cardCta'
import { CARD_CTA } from '../ctaTapFloor'
import { factionRoleVars } from '../../utils/factionRoles'
import { factionBodyVars } from '../../utils/factionBodyFace'

/**
 * UA's invitation letter (#3294): the vellum leaf of `UaTaskCard`, written to
 * a stranger. Same parchment, 2px sienna frame, Lotus wash behind the head,
 * the sienna band, the card's CTA flanked by the real mandalas.
 */

const INK = 'var(--leaf-letter-ink)'
const QUIET = 'var(--leaf-letter-quiet)'
const ACCENT = 'var(--leaf-letter-accent)'
const HAIR = 'var(--faction-ua-hair)'

export default function UaInvitationLetter({
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
  const open: CSSProperties = { ...UA_CARD_CTA, flex: '1 1 auto', maxWidth: 280 }
  const skin: JoinControlSkin = {
    openStyle: open,
    confirmStyle: open,
    cancelStyle: { ...CARD_CTA, fontFamily: UA_TEXT, fontSize: 'var(--text-content)', background: 'transparent', color: QUIET, border: 'none', cursor: 'pointer' },
    proseStyle: { fontFamily: UA_TEXT, fontSize: 'var(--text-content)', lineHeight: 1.5, color: QUIET, margin: '0 0 var(--space-md)' },
    errorStyle: { fontFamily: UA_TEXT, fontSize: 'var(--text-content)', color: 'var(--color-danger)', margin: '0 0 var(--space-md)' },
  }

  return (
    <LetterSheet
      data-letter="ua"
      ground={{
        ...factionBodyVars('ua'),
        ...factionRoleVars('ua', 'leaf-letter'),
        overflow: 'hidden',
        background: 'var(--faction-ua-card-parchment)',
        color: INK,
        fontFamily: UA_TEXT,
      }}
      card={{
        border: '2px solid var(--faction-ua-card-frame)',
        borderRadius: 8,
        boxShadow: '0 18px 46px -14px var(--color-cast-shadow)',
      }}
    >
      {/* The wash hangs off the top-left corner, as on the task card. */}
      <Lotus
        size={360}
        color="var(--faction-ua-card-lotus)"
        style={{ position: 'absolute', left: -150, top: -104, opacity: 'var(--faction-ua-card-lotus-opacity)', pointerEvents: 'none' }}
      />
      <UaBand inert />

      <div style={{ position: 'relative', padding: 'var(--space-lg) var(--space-xl) var(--space-xl)' }}>
        <h2
          style={{
            fontFamily: UA_DISPLAY,
            fontWeight: 600,
            fontSize: 'var(--text-title)',
            lineHeight: 1.08,
            letterSpacing: '-0.01em',
            color: INK,
            margin: '0 0 var(--space-md)',
          }}
        >
          {headline}
        </h2>
        <p style={{ fontFamily: UA_TEXT, fontSize: 'var(--text-content)', lineHeight: 1.55, color: QUIET, margin: '0 0 var(--space-lg)' }}>
          {pitch}
        </p>

        {perks.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--space-lg)', borderTop: `1px solid ${HAIR}` }}>
            {perks.map((perk, idx) => {
              const mechanic = idx === MECHANIC_INDEX
              return (
                <li
                  key={idx}
                  data-perk={mechanic ? 'mechanic' : 'flavour'}
                  style={{ padding: 'var(--space-md) 0', borderBottom: `1px solid ${HAIR}` }}
                >
                  {perk.name && (
                    <span
                      data-perk-name
                      style={{ display: 'block', fontFamily: UA_DISPLAY, fontWeight: 700, fontSize: 'var(--text-lg)', lineHeight: 1.2, color: ACCENT }}
                    >
                      {perk.name}
                    </span>
                  )}
                  <span style={{ display: 'block', fontFamily: UA_TEXT, fontSize: 'var(--text-content)', lineHeight: 1.5, color: INK }}>
                    {perk.desc}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        {!confirming ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-md)' }}>
              <UaCtaFlank side="start" size={46} />
              <button type="button" autoFocus onClick={onEnlist} style={open}>
                {joinLabel}
              </button>
              <UaCtaFlank side="end" size={46} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-sm)' }}>
              <button type="button" onClick={onDismiss} style={skin.cancelStyle}>
                {dismissLabel}
              </button>
            </div>
          </>
        ) : (
          <div>{renderConfirm(skin)}</div>
        )}
      </div>
    </LetterSheet>
  )
}
