/**
 * University of Asthmatics duel seal-confirm (#725). One sheet (no inner plate),
 * card on laptop, full-bleed on phone. The mock's gilt frame is unbuildable (gold
 * went to WOW, ADR-0050), so: cream sheet, one ensō, hairlines. Forfeit dims the
 * ensō, drops the title a tier and adds a vermilion rule. Copy is neutral (#718)
 * and comes from `./shared`, which also owns figures, roster and button order.
 *
 * The opponent's hue is only a ring, an edge and a bar, never ink or behind text
 * (#310, #1115), all via `factionFill` so `na` keeps its spectrum (ADR-0039).
 * Nothing guards this automatically.
 *
 * Contrast (#1155): `--color-danger` is 3.98:1 on the sheet, so the forfeit body
 * takes `card-notice` and red is only the rule; the note takes `card-credit`.
 */
import { useTranslation } from 'react-i18next'
import { factionCssVar, factionFill } from '../../utils/factions'
import { factionRoleVars } from '../../utils/factionRoles'
import { factionBodyVars } from '../../utils/factionBodyFace'
import { UaSigil } from '../sigil/UaSigil'
import { UA_DISPLAY, UA_EYEBROW, UA_TEXT, uaShade } from '../factionMarks/uaAtoms'
import {
  duelSides,
  RaceRoster,
  SealActions,
  StakesTiles,
  useDuelSealCopy,
  type DuelSlotTheme,
} from './shared'
import type { DuelSealConfirmProps } from './DuelSealConfirm'
import DuelSealSheet from './DuelSealSheet'

const SHEET = 'var(--leaf-duel-seal-paper)'
const PANEL = 'var(--faction-ua-panel)'
const LIFT = 'var(--faction-ua-lift)'
const INK = 'var(--leaf-duel-seal-ink)'
const MUTED = 'var(--leaf-duel-seal-quiet)'
const RULE = 'var(--faction-ua-rule)'
const HAIR = 'var(--faction-ua-hair)'
const NOTICE = 'var(--faction-ua-card-notice)'
const CREDIT = 'var(--faction-ua-card-credit)'

export default function UaDuelSealConfirm({
  duel,
  viewerCharacterId,
  taskPointValue,
  onConfirm,
  onCancel,
  busy,
  mode = 'submit',
}: DuelSealConfirmProps) {
  const { t } = useTranslation('praxis')
  const { me, foe } = duelSides(duel, viewerCharacterId)
  const copy = useDuelSealCopy(mode, duel, viewerCharacterId, taskPointValue)

  // For the shared slots only; this file's own marks use `factionFill`.
  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const theme: DuelSlotTheme = { accent, muted: MUTED, bodyFont: UA_TEXT }

  const relinquishing = copy.danger

  return (
    <DuelSealSheet
      label={copy.heading}
      ground={{
        /* Role map on the outermost element (#2673). */
        ...factionBodyVars("ua"), ...factionRoleVars('ua', 'leaf-duel-seal'),
        position: 'relative',
        background: SHEET,
        color: INK,
        fontFamily: UA_TEXT,
      }}
      card={{
        overflow: 'hidden',
        border: `1px solid ${RULE}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: `0 22px 54px -26px ${uaShade(60)}`,
      }}
    >
      {/* Opponent edge. */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 4,
          ...factionFill(foe.faction_slug, 'rule'),
        }}
      />

      <div
        style={{
          flexShrink: 0,
          padding: 'var(--space-lg) var(--space-xl)',
          background: LIFT,
          borderBottom: `1px solid ${HAIR}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            minWidth: 0,
          }}
        >
          <span style={{ display: 'flex', opacity: relinquishing ? 0.35 : 1 }}>
            <UaSigil width={38} height={38} />
          </span>
          <h2
            style={{
              margin: 0,
              minWidth: 0,
              fontFamily: UA_DISPLAY,
              fontWeight: 600,
              // Forfeit is a tier quieter; both are Content tier (§4a).
              fontSize: relinquishing ? 'var(--text-title)' : 'var(--text-heading)',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              color: INK,
            }}
          >
            {copy.heading}
          </h2>
        </div>

        {/* Opponent ring: the monogram sits on UA's disc, not the hue. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            marginTop: 'var(--space-lg)',
            minWidth: 0,
          }}
        >
          <span
            aria-hidden
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: '50%',
              ...factionFill(foe.faction_slug, 'dot'),
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: LIFT,
                color: INK,
                fontFamily: UA_DISPLAY,
                fontWeight: 600,
                fontSize: 'var(--text-content)',
                lineHeight: 1,
              }}
            >
              {foe.display_name.slice(0, 1)}
            </span>
          </span>
          <span
            className="content-text"
            style={{ fontFamily: UA_DISPLAY, fontWeight: 600, color: INK, minWidth: 0 }}
          >
            {foe.display_name}
          </span>
        </div>
      </div>

      {/* Opponent bar. */}
      <span
        aria-hidden
        style={{ flexShrink: 0, display: 'block', height: 3, ...factionFill(foe.faction_slug, 'bar') }}
      />

      {/* Own scroll pins masthead + footer when the sheet is the screen. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-xl)' }}>
        <p
          className="content-text"
          style={{
            lineHeight: 1.6,
            color: relinquishing ? NOTICE : INK,
            ...(relinquishing
              ? {
                  fontWeight: 600,
                  paddingLeft: 'var(--space-md)',
                  borderLeft: '3px solid var(--color-danger)',
                }
              : {}),
          }}
        >
          {copy.body}
        </p>

        {copy.note && (
          <p
            className="content-text"
            style={{ marginTop: 'var(--space-sm)', lineHeight: 1.6, color: CREDIT }}
          >
            {copy.note}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            marginTop: 'var(--space-xl)',
          }}
        >
          <span style={{ ...UA_EYEBROW, whiteSpace: 'nowrap' }}>
            {t('duelStakes.heading')}
          </span>
          <span aria-hidden style={{ height: 1, flex: 1, background: HAIR }} />
        </div>

        <div
          style={{
            marginTop: 'var(--space-md)',
            padding: 'var(--space-md)',
            background: PANEL,
            color: INK,
            border: `1px solid ${RULE}`,
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <StakesTiles
            me={me}
            opponentName={foe.display_name}
            taskPointValue={taskPointValue}
            status={duel.status}
            theme={theme}
          />
          <RaceRoster me={me} foe={foe} theme={theme} />
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: 'var(--space-md) var(--space-xl)',
          background: LIFT,
          borderTop: `1px solid ${HAIR}`,
        }}
      >
        {/* ponytail: shared button pair, no UA seal-button slot; add a skin
            prop on SealActions if a sienna button is wanted (#646). */}
        <SealActions
          onConfirm={onConfirm}
          onCancel={onCancel}
          busy={busy}
          confirmLabel={copy.confirmLabel}
          danger={copy.danger}
          theme={theme}
        />
      </div>
    </DuelSealSheet>
  )
}
