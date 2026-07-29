/**
 * University of Asthmatics MOBILE duel seal-confirm (#725) — the same breath,
 * on a phone.
 *
 * The desktop sheet unfolded to the full screen: UA's mesa-sand ground, a
 * masthead band carrying the ensō and the foe, the practice sheet as one plate
 * in a scrolling middle, and the actions pinned to the bottom so the thumb lands
 * on them. Single-column throughout — SPEC-faction-ui-profile §1a forbids a
 * fixed-px grid on the mobile path, and there is no grid here at all.
 *
 * Everything the desktop skin's docblock states holds verbatim and is not
 * repeated: both modes through `useDuelSealCopy` (#751), faction-neutral copy
 * through `t()` with no new catalog keys (#718), the shared slots owning every
 * figure, and the opponent's hue held as a RING, an EDGE and a BAR — never as
 * ink, never behind text (#310, #1115) — drawn as fills through `factionFill`
 * so an unaffiliated opponent keeps the spectrum (ADR-0039).
 *
 * The contrast readings are the desktop skin's too, with one addition: the
 * masthead band is `--faction-ua-lift`, where UA's body ink reads 12.99:1 light
 * and 10.95:1 dark. Body copy and the reopen note stay on the `card-bg` plate,
 * because `--faction-ua-card-notice` / `-card-credit` are measured against that
 * sheet and nothing else (#694).
 */
import { useTranslation } from 'react-i18next'
import { factionCssVar, factionFill } from '../../utils/factions'
import { UaSigil } from '../cards/UaSigil'
import { UA_DISPLAY, UA_EYEBROW, UA_TEXT } from '../cards/uaAtoms'
import {
  duelSides,
  RaceRoster,
  SealActions,
  StakesTiles,
  useDuelSealCopy,
  type DuelSlotTheme,
} from './shared'
import type { DuelSealConfirmProps } from './DuelSealConfirm'

const GROUND = 'var(--faction-ua-page)'
const SHEET = 'var(--faction-ua-card-bg)'
const PANEL = 'var(--faction-ua-panel)'
const LIFT = 'var(--faction-ua-lift)'
const INK = 'var(--faction-ua-card-text)'
const MUTED = 'var(--faction-ua-card-muted)'
const RULE = 'var(--faction-ua-rule)'
const HAIR = 'var(--faction-ua-hair)'
const NOTICE = 'var(--faction-ua-card-notice)'
const CREDIT = 'var(--faction-ua-card-credit)'

export default function UaMobileDuelSealConfirm({
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

  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const theme: DuelSlotTheme = { accent, muted: MUTED, bodyFont: UA_TEXT }

  const relinquishing = copy.danger

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.heading}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: GROUND, color: INK, fontFamily: UA_TEXT }}
    >
      {/* ── Masthead band ── */}
      <div
        style={{
          flexShrink: 0,
          padding: 'var(--space-lg)',
          background: LIFT,
          borderBottom: `1px solid ${HAIR}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', minWidth: 0 }}>
          <span style={{ display: 'flex', opacity: relinquishing ? 0.35 : 1 }}>
            <UaSigil width={32} height={32} />
          </span>
          <h2
            style={{
              margin: 0,
              minWidth: 0,
              fontFamily: UA_DISPLAY,
              fontWeight: 600,
              fontSize: relinquishing ? 'var(--text-title)' : 'var(--text-heading)',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              color: INK,
            }}
          >
            {copy.heading}
          </h2>
        </div>

        {/* ── OPPONENT RING ── outer drawn fill, inner UA disc under the letter. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            marginTop: 'var(--space-md)',
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
              width: 32,
              height: 32,
              borderRadius: '50%',
              ...factionFill(foe.faction_slug, 'dot'),
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
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

      {/* ── OPPONENT BAR ── across the full width, under the band. */}
      <span
        aria-hidden
        style={{ flexShrink: 0, height: 3, ...factionFill(foe.faction_slug, 'bar') }}
      />

      {/* ── Scrolling middle: one practice sheet on the ground ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-lg)' }}>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: 'var(--space-lg)',
            paddingLeft: 'var(--space-xl)',
            background: SHEET,
            border: `1px solid ${RULE}`,
            borderRadius: 'var(--radius-md)',
          }}
        >
          {/* ── OPPONENT EDGE ── down the plate's spine. */}
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
              marginTop: 'var(--space-lg)',
            }}
          >
            <span style={{ ...UA_EYEBROW, whiteSpace: 'nowrap' }}>{t('duelStakes.heading')}</span>
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
              viewerFactionSlug={me.faction_slug}
              opponentFactionSlug={foe.faction_slug}
              opponentName={foe.display_name}
              taskPointValue={taskPointValue}
              status={duel.status}
              theme={theme}
            />
            <RaceRoster me={me} foe={foe} theme={theme} />
          </div>
        </div>
      </div>

      {/* ── Pinned footer band ── */}
      <div
        style={{
          flexShrink: 0,
          padding: 'var(--space-md) var(--space-lg)',
          background: LIFT,
          borderTop: `1px solid ${HAIR}`,
        }}
      >
        {/* ponytail: the shared SealActions pair again — thumb-sized styling
            would need a skin slot on the shared component, which is foundation
            work rather than a skin change. */}
        <SealActions
          onConfirm={onConfirm}
          onCancel={onCancel}
          busy={busy}
          confirmLabel={copy.confirmLabel}
          danger={copy.danger}
          theme={theme}
        />
      </div>
    </div>
  )
}
