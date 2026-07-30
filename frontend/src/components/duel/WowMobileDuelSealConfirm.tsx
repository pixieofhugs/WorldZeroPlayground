/**
 * Warriors of Whimsy MOBILE duel seal-confirm (#895) — the Lists Seal, thumbed.
 *
 * The kit's own phone twin of `16-duel-seal.html`: single column throughout, the
 * barrier band across the top of the sheet instead of round a floating panel
 * (there is nothing for it to float above at 375px), the roster and stakes
 * stacked, and the action pair pinned to the bottom at **46px** targets — above
 * the 44 minimum, which is what the kit specifies and #895 asks be kept.
 *
 * The 46px comes from `.wow-seal-actions--mobile` in index.css rather than from
 * a size prop on `SealActions`: the shared component owns its markup and the
 * global [Cancel] … [Submit] order (#646), and growing it a skin slot would be
 * foundation work. The wrapper class also stretches both buttons to equal width,
 * which is the kit's full-width stack — but it keeps them in the house order
 * rather than the kit's confirm-above-cancel column.
 *
 * Everything else is the desktop skin's reasoning, unchanged: two faces not
 * three, a derived forfeit face, every figure and every branch owned by the
 * shared slots. See `WowDuelSealConfirm.tsx` for the full deviation list.
 * Single-column only — SPEC-faction-ui-profile §1a forbids a fixed-px grid here.
 */
import { factionCssVar } from '../../utils/factions'
import { WowSigil } from '../cards/WowSigil'
import {
  duelSides,
  RaceRoster,
  SealActions,
  StakesTiles,
  useDuelSealCopy,
  type DuelSlotTheme,
} from './shared'
import type { DuelSealConfirmProps } from './DuelSealConfirm'
import {
  BODY_FONT,
  CHAMPION,
  DISPLAY_FONT,
  HOLD,
  INK,
  LISTS_BG,
  ListsBand,
  ListsRibbonMark,
  ListsSpark,
  listsEyebrow,
  MUTED,
  NOTICE,
  ON_RIBBON,
  PANEL,
  PANEL_BORDER,
  PANEL_QUIET,
  RIBBON,
  Rosette,
  useWowSealVoice,
} from './wowLists'

export default function WowMobileDuelSealConfirm({
  duel,
  viewerCharacterId,
  taskPointValue,
  onConfirm,
  onCancel,
  busy,
  mode = 'submit',
}: DuelSealConfirmProps) {
  const { me, foe } = duelSides(duel, viewerCharacterId)
  const copy = useDuelSealCopy(mode, duel, viewerCharacterId, taskPointValue)
  const voice = useWowSealVoice(mode)

  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const soft = factionCssVar(foe.faction_slug, 'light')
  // PANEL_QUIET, not MUTED — the slots stack on the parchment plates below, the
  // same second sheet the desktop skin mounts them on (#1173).
  const theme: DuelSlotTheme = { accent: CHAMPION, muted: PANEL_QUIET, bodyFont: BODY_FONT }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.heading}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: LISTS_BG, color: INK, fontFamily: BODY_FONT }}
    >
      <ListsBand height={8} />

      {/* ── crest + title ── */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          padding: 'var(--space-lg) var(--space-lg) var(--space-md)',
          borderBottom: `1px solid ${PANEL_BORDER}`,
        }}
      >
        <WowSigil size={44} />
        <div style={{ minWidth: 0 }}>
          {/* WOW's kicker over the shared heading — see the desktop skin. */}
          <span
            style={{
              display: 'block',
              fontFamily: BODY_FONT,
              fontStyle: 'italic',
              fontSize: 'var(--text-lg)',
              color: MUTED,
            }}
          >
            {voice.sub}
          </span>
          <h2
            className="content-title"
            style={{ fontFamily: DISPLAY_FONT, color: INK, lineHeight: 1.15 }}
          >
            {copy.heading} <ListsSpark />
          </h2>
        </div>
      </div>

      {/* ── the scrolling middle ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-lg)' }}>
        {/* NOTICE ink on the forfeit face, the red as a rule — #1168, and the
            desktop skin's docblock carries the measurements. */}
        <p
          className="content-text"
          style={{
            fontFamily: BODY_FONT,
            lineHeight: 1.55,
            ...(copy.danger
              ? {
                  color: NOTICE,
                  fontWeight: 700,
                  paddingLeft: 'var(--space-md)',
                  borderLeft: `3px solid var(--color-danger)`,
                }
              : {}),
          }}
        >
          {copy.body}
        </p>

        {copy.note && (
          <p
            className="content-text"
            style={{
              marginTop: 'var(--space-sm)',
              fontFamily: BODY_FONT,
              color: 'var(--color-success)',
            }}
          >
            {copy.note}
          </p>
        )}

        <span
          style={{
            ...listsEyebrow,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            marginTop: 'var(--space-lg)',
            marginBottom: 'var(--space-sm)',
          }}
        >
          {voice.rosterLabel}
          <Rosette accent={accent} soft={soft} size={18} />
        </span>
        <div
          style={{
            background: PANEL,
            border: `1.5px solid ${PANEL_BORDER}`,
            borderRadius: 12,
            padding: 'var(--space-md) var(--space-lg)',
          }}
        >
          <RaceRoster me={me} foe={foe} theme={theme} />
        </div>

        <span
          style={{
            ...listsEyebrow,
            marginTop: 'var(--space-lg)',
            marginBottom: 'var(--space-sm)',
          }}
        >
          {voice.stakesLabel}
        </span>
        <div
          style={{
            background: PANEL,
            border: `1.5px solid ${HOLD}`,
            borderRadius: 12,
            padding: 'var(--space-md) var(--space-lg)',
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
        </div>

        {!copy.danger && (
          <p
            className="content-text"
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 'var(--space-sm)',
              marginTop: 'var(--space-sm)',
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 11,
              background: RIBBON,
              color: ON_RIBBON,
              fontFamily: BODY_FONT,
              fontStyle: 'italic',
            }}
          >
            <ListsRibbonMark color={ON_RIBBON} />
            <span>{voice.ribbonLine}</span>
          </p>
        )}
      </div>

      {/* ── the pinned action bar, 46px targets ── */}
      <div
        className="wow-seal-actions--mobile"
        style={{
          flexShrink: 0,
          padding: 'var(--space-md) var(--space-lg)',
          background: PANEL,
          borderTop: `2px solid ${HOLD}`,
        }}
      >
        <SealActions
          onConfirm={onConfirm}
          onCancel={onCancel}
          busy={busy}
          confirmLabel={voice.confirm}
          cancelLabel={voice.cancel}
          danger={copy.danger}
          theme={theme}
        />
      </div>
    </div>
  )
}
