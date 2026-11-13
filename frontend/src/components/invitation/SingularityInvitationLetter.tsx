import type { CSSProperties } from 'react'
import { factionRoleVars } from '../../utils/factionRoles'
import { factionBodyVars } from '../../utils/factionBodyFace'
import type { JoinControlSkin } from '../JoinControl'
import { SingularityBand } from '../cardMasthead/factionBands'
import { SINGULARITY_BOT, SingularityBrackets, SingularitySweep } from '../factionMarks/singularityAtoms'
import { SINGULARITY_CARD_CTA } from '../taskCard/cardCta'
import { CARD_CTA } from '../ctaTapFloor'
import LetterSheet from './LetterSheet'
import { MECHANIC_INDEX, type InvitationLetterProps } from './letterTypes'

/**
 * Singularity's letter (#3294): the task card's terminal and the praxis slab's
 * brackets as one sheet. ALWAYS DARK -- the `--faction-singularity-term-*`
 * family holds a near-black chassis in both themes and only the phosphor flips
 * with the cascade, so nothing here branches on the theme.
 *
 * Glyphs (`> `, the block cursor, `[ok]`/`[!!]`, the bot) are aria-hidden
 * decoration; the headline and perks are the catalog strings, verbatim.
 */

const BG = 'var(--faction-singularity-term-bg)'
const BRIGHT = 'var(--faction-singularity-term-bright)'
const INK = 'var(--faction-singularity-term-ink)'
const DIM = 'var(--faction-singularity-term-dim)'
const HAIR = 'var(--faction-singularity-term-hair)'
const PANEL = 'var(--faction-singularity-term-panel)'
const BLUE = 'var(--faction-singularity-term-blue)'
// The amber that flags a box: invariant like the chassis (see the duel seal).
const NOTICE = 'var(--faction-singularity-card-notice)'
const MONO = 'var(--sg-letter-face)'

const RASTER = 'repeating-linear-gradient(0deg, var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)'

export default function SingularityInvitationLetter({
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
  const openStyle: CSSProperties = { ...SINGULARITY_CARD_CTA, gridColumn: 'auto', flex: 1, cursor: 'pointer' }
  const dismissStyle: CSSProperties = {
    ...CARD_CTA,
    fontFamily: MONO,
    fontSize: 'var(--text-base)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: 'var(--space-sm) var(--space-sm)',
    border: 'none',
    background: 'transparent',
    color: DIM,
    cursor: 'pointer',
  }
  const skin: JoinControlSkin = {
    openStyle,
    confirmStyle: openStyle,
    cancelStyle: dismissStyle,
    proseStyle: {
      fontFamily: MONO,
      fontSize: 'var(--text-content)',
      lineHeight: 1.5,
      color: INK,
      margin: '0 0 var(--space-md)',
    },
    errorStyle: {
      fontFamily: MONO,
      fontSize: 'var(--text-content)',
      color: NOTICE,
      margin: '0 0 var(--space-md)',
    },
  }

  return (
    <LetterSheet
      data-letter="singularity"
      ground={{
        ...factionBodyVars('singularity'),
        ...factionRoleVars('singularity', 'sg-letter'),
        background: BG,
        color: INK,
        fontFamily: MONO,
        overflow: 'hidden',
      }}
      card={{
        border: '1px solid var(--faction-singularity-term-border)',
        borderRadius: 8,
        boxShadow: 'var(--faction-singularity-term-shadow)',
      }}
    >
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, background: RASTER }}
      />
      <SingularitySweep />
      <SingularityBrackets />

      <SingularityBand inert />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--space-xl) var(--space-lg)',
        }}
      >
        <h2
          style={{
            fontFamily: MONO,
            fontSize: 'var(--text-title)',
            lineHeight: 1.22,
            color: BRIGHT,
            margin: '0 0 var(--space-md)',
            overflowWrap: 'anywhere',
          }}
        >
          <span aria-hidden="true" style={{ color: BLUE }}>{'> '}</span>
          {headline}
          <span
            aria-hidden="true"
            className="sg-cursor"
            style={{
              display: 'inline-block',
              width: 8,
              height: 16,
              background: BRIGHT,
              marginLeft: 'var(--space-xs)',
              verticalAlign: 'text-bottom',
            }}
          />
        </h2>

        <p
          style={{
            fontFamily: MONO,
            fontSize: 'var(--text-content)',
            lineHeight: 1.55,
            color: INK,
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
              border: `1px dashed ${HAIR}`,
              borderRadius: 4,
              padding: 'var(--space-md) var(--space-lg)',
              margin: '0 0 var(--space-xl)',
              background: PANEL,
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
                  {/* The log level: [!!] flags the one row that states a real mechanic, [ok] the rest. Glyphs, not words. */}
                  <span
                    aria-hidden="true"
                    style={{ flex: 'none', fontFamily: MONO, fontSize: 'var(--text-content)', lineHeight: 1.4, color: mechanic ? NOTICE : INK }}
                  >
                    {mechanic ? '[!!]' : '[ok]'}
                  </span>
                  <span>
                    {perk.name && (
                      <span
                        data-perk-name
                        style={{
                          display: 'block',
                          fontFamily: MONO,
                          fontSize: 'var(--text-md)',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          lineHeight: 1.4,
                          color: BRIGHT,
                        }}
                      >
                        {perk.name}
                      </span>
                    )}
                    <span
                      style={{ display: 'block', fontFamily: MONO, fontSize: 'var(--text-content)', lineHeight: 1.4, color: INK }}
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'center' }}>
            <button type="button" autoFocus onClick={onEnlist} style={openStyle}>
              {joinLabel}
              <span
                aria-hidden="true"
                className="sg-cursor"
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 13,
                  marginLeft: 'var(--space-xs)',
                  background: 'currentColor',
                  verticalAlign: '-0.12em',
                }}
              />
            </button>
            <pre
              aria-hidden="true"
              className="sg-ascii"
              style={{ margin: 0, fontFamily: MONO, fontSize: 'var(--text-lg)', lineHeight: 1.2, color: DIM }}
            >
              {SINGULARITY_BOT}
            </pre>
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
