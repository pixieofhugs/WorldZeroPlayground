/**
 * Duel shared slots (#718) — bespoke-frame + shared-slots, the split
 * `praxisCard/mobile/shared.tsx` uses.
 *
 * Skins own the FRAME (chrome, fonts, ornament). These slots own the LOGIC —
 * the stakes arithmetic, the per-side cast status, and the per-`DuelStatus`
 * branching — so it is written once and every faction inherits the same
 * (correct) rules. A skin may rearrange these slots; it must never drop one and
 * must never re-implement one.
 *
 * The rules these encode, all verified against the backend:
 *  - Stakes are per-faction, not a fixed 1.5×/0.5×: `duel_win_modifier` /
 *    `duel_loss_modifier` come off `FactionConfigOut`. Snide is 2.0× / **0.0×**
 *    (`eras/era_1.py`), so a losing Snide duelist earns literally nothing — any
 *    hardcoded ratio or "half your points" phrasing is a lie for 1 faction in 7.
 *  - A tie pays both sides 1.0×, *unless* exactly one side is Snide, in which
 *    case Snide takes the win rate and the other the loss rate
 *    (`compute_duel_multiplier`, `services/scoring.py`).
 *  - Casting while the duel is still `pending` is allowed and ungated. If the
 *    opponent declines, `praxis_scoring.py` never picks the duel up and the
 *    praxis scores as a plain solo praxis at 1.0×.
 *  - Numbers are BASE points before crowd votes. `total_stars` adds flat, after
 *    all multipliers, and is unknowable at cast time — so every figure here is
 *    labelled as a floor, never a total.
 *
 * ponytail: the faction multiplier (`own_task_modifier` / `other_task_modifier`)
 * is deliberately LEFT OUT of these figures. It multiplies both the win and the
 * lose branch identically, so it changes no decision the player makes here; it
 * is already broken out on the praxis-detail score breakdown; and including it
 * would mean porting `compute_faction_multiplier` to TS for zero added signal.
 *
 * Copy is faction-neutral by decision (#718) — plain typed `t()` keys, not a
 * `collabCopy`-style dynamic resolver. Per-faction identity lives in the skins.
 */
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { DuelDetailOut, DuelSideOut, DuelStatus } from '../../api/duel'
import { useGameConfig } from '../../hooks/useGameConfig'

/** The per-faction voice each slot dresses itself in. Every value is a CSS var. */
export interface DuelSlotTheme {
  /** Faction accent — figures, emphasis, rules. */
  accent: string
  /** Secondary / muted text. */
  muted?: string
  /** Body font for the prose. */
  bodyFont?: string
}

const DEFAULT_THEME: Required<Pick<DuelSlotTheme, 'muted' | 'bodyFont'>> = {
  muted: 'var(--color-text-secondary)',
  bodyFont: 'var(--font-body)',
}

/* -------------------------------------------------------------------------- */
/* Stakes arithmetic                                                          */
/* -------------------------------------------------------------------------- */

export interface DuelStakes {
  /** Base points if this side wins the head-to-head. */
  win: number
  /** Base points if it loses. `0` for Snide — by construction, not by branch. */
  lose: number
  /** Base points on a tie (1.0×, or the win/loss rate when exactly one side is Snide). */
  tie: number
  /** Base points if the duel never happens (declined / no opponent): plain solo. */
  solo: number
}

const SNIDE_FACTION_SLUG = 'snide'

/**
 * Win / lose / tie / solo-fallback base points for ONE side of a duel.
 *
 * Uses the VIEWER's own faction config — the modifier that applies to you is
 * yours (the rail's *tokens* come from the opponent instead; each for its own
 * reason, see #718).
 *
 * Returns `null` until the app-wide game config has loaded, so callers render
 * nothing rather than a wrong number.
 */
export function useDuelStakes(
  viewerFactionSlug: string | null | undefined,
  opponentFactionSlug: string | null | undefined,
  taskPointValue: number | null | undefined,
): DuelStakes | null {
  const config = useGameConfig()
  if (!config || taskPointValue == null) return null
  const faction = config.factions.find((entry) => entry.slug === viewerFactionSlug)
  if (!faction) return null

  // Tie: 1.0× for both sides, unless exactly one side is Snide — then Snide
  // takes the win rate and the other side the loss rate.
  const exactlyOneSnide =
    (viewerFactionSlug === SNIDE_FACTION_SLUG) !== (opponentFactionSlug === SNIDE_FACTION_SLUG)
  const tieModifier = !exactlyOneSnide
    ? 1.0
    : viewerFactionSlug === SNIDE_FACTION_SLUG
      ? faction.duel_win_modifier
      : faction.duel_loss_modifier

  return {
    win: taskPointValue * faction.duel_win_modifier,
    lose: taskPointValue * faction.duel_loss_modifier,
    tie: taskPointValue * tieModifier,
    solo: taskPointValue,
  }
}

/** Points render as integers where they are whole, one decimal otherwise. */
export function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/* -------------------------------------------------------------------------- */
/* StakesTiles — what winning and losing are worth                            */
/* -------------------------------------------------------------------------- */

function Tile({
  label,
  value,
  color,
  theme,
}: {
  label: string
  value: string
  color: string
  theme: DuelSlotTheme
}) {
  return (
    <div
      className="flex flex-col gap-[2px] px-[10px] py-[6px]"
      style={{
        border: `1px solid ${theme.accent}`,
        fontFamily: theme.bodyFont ?? DEFAULT_THEME.bodyFont,
        flex: '1 1 0',
        minWidth: 0,
      }}
    >
      <span className="eyebrow" style={{ color: theme.muted ?? DEFAULT_THEME.muted }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color }}>{value}</span>
    </div>
  )
}

/**
 * The win / lose pair, plus the tie rule as a line of copy (not a third tile —
 * a tie is an edge, and three equal tiles reads like three equal outcomes).
 *
 * While the duel is still `pending` the pair is replaced outright by the
 * solo-fallback line: nothing is at stake until the opponent accepts, and
 * showing a lose figure they might never be exposed to would be false.
 */
export function StakesTiles({
  viewerFactionSlug,
  opponentFactionSlug,
  opponentName,
  taskPointValue,
  status,
  theme,
}: {
  viewerFactionSlug: string | null | undefined
  opponentFactionSlug: string | null | undefined
  opponentName: string
  taskPointValue: number | null | undefined
  status: DuelStatus
  theme: DuelSlotTheme
}) {
  const { t } = useTranslation('praxis')
  const stakes = useDuelStakes(viewerFactionSlug, opponentFactionSlug, taskPointValue)
  if (!stakes) return null

  const font = theme.bodyFont ?? DEFAULT_THEME.bodyFont
  const muted = theme.muted ?? DEFAULT_THEME.muted

  // pending: the challenge is unanswered, so there is no head-to-head yet.
  if (status === 'pending') {
    return (
      <p
        className="mt-[6px]"
        style={{ fontFamily: font, fontSize: 'var(--text-sm)', color: muted }}
      >
        {t('duelStakes.soloFallback', {
          name: opponentName,
          points: formatPoints(stakes.solo),
        })}
      </p>
    )
  }

  return (
    <div className="mt-[8px]">
      <div className="flex gap-[8px]">
        <Tile
          label={t('duelStakes.winLabel')}
          value={formatPoints(stakes.win)}
          color="var(--color-success)"
          theme={theme}
        />
        <Tile
          label={t('duelStakes.loseLabel')}
          value={formatPoints(stakes.lose)}
          color={stakes.lose === 0 ? 'var(--color-danger)' : muted}
          theme={theme}
        />
      </div>
      <p
        className="mt-[6px]"
        style={{ fontFamily: font, fontSize: 'var(--text-xs)', color: muted }}
      >
        {t('duelStakes.tieLine', { points: formatPoints(stakes.tie) })}{' '}
        {t('duelStakes.beforeVotes')}
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* RaceRoster — who has cast                                                  */
/* -------------------------------------------------------------------------- */

function RosterRow({
  name,
  cast,
  theme,
}: {
  name: string
  cast: boolean
  theme: DuelSlotTheme
}) {
  const { t } = useTranslation('praxis')
  return (
    <li
      className="flex items-center justify-between gap-[8px]"
      style={{
        fontFamily: theme.bodyFont ?? DEFAULT_THEME.bodyFont,
        fontSize: 'var(--text-sm)',
      }}
    >
      <span style={{ fontWeight: 700 }}>{name}</span>
      <span
        style={{
          color: cast ? 'var(--color-success)' : theme.muted ?? DEFAULT_THEME.muted,
        }}
      >
        {cast ? t('duelRoster.sealed') : t('duelRoster.walking')}
      </span>
    </li>
  )
}

/**
 * Per-side cast status, straight off `DuelSideOut.is_submitted` — the field that
 * has been on the wire since #313 and, until now, was never rendered anywhere.
 */
export function RaceRoster({
  me,
  foe,
  theme,
}: {
  me: DuelSideOut
  foe: DuelSideOut
  theme: DuelSlotTheme
}) {
  const { t } = useTranslation('praxis')
  return (
    <ul className="flex flex-col gap-[3px] mt-[8px]">
      <RosterRow name={t('duelRoster.you')} cast={me.is_submitted} theme={theme} />
      <RosterRow name={foe.display_name} cast={foe.is_submitted} theme={theme} />
    </ul>
  )
}

/* -------------------------------------------------------------------------- */
/* NextStepLine — what you are waiting for                                    */
/* -------------------------------------------------------------------------- */

/**
 * One line per `DuelStatus`, explicit — never a fallthrough (#717 shipped a
 * settled tally to `pending` and `declined` precisely because the old component
 * had one). The forfeited case pre-empts the status, since a forfeit can land
 * on any live duel.
 */
export function NextStepLine({
  duel,
  me,
  foe,
  theme,
}: {
  duel: DuelDetailOut
  me: DuelSideOut
  foe: DuelSideOut
  theme: DuelSlotTheme
}) {
  const { t } = useTranslation('praxis')
  const style: CSSProperties = {
    fontFamily: theme.bodyFont ?? DEFAULT_THEME.bodyFont,
    fontSize: 'var(--text-sm)',
    color: theme.muted ?? DEFAULT_THEME.muted,
  }

  if (duel.forfeited_by_character_id != null) {
    const iForfeited = duel.forfeited_by_character_id === me.character_id
    return (
      <p style={style} className="mt-[6px]">
        {iForfeited
          ? t('duelNextStep.youForfeited')
          : t('duelNextStep.wonByDefault', { name: foe.display_name })}
      </p>
    )
  }

  let line: string
  switch (duel.status) {
    case 'pending':
      line = t('duelNextStep.pending', { name: foe.display_name })
      break
    case 'declined':
      line = t('duelNextStep.declined', { name: foe.display_name })
      break
    case 'active':
      // Both sides having cast is what SETTLES a duel, so inside `active` at
      // most one side is submitted. Either they owe a cast, or you do.
      line = me.is_submitted
        ? t('duelNextStep.activeWaitingOnThem', { name: foe.display_name })
        : t('duelNextStep.activeWaitingOnYou', { name: foe.display_name })
      break
    case 'settled':
      line = t('duelNextStep.settled')
      break
  }

  return (
    <p style={style} className="mt-[6px]">
      {line}
    </p>
  )
}

/* -------------------------------------------------------------------------- */
/* SealActions — the confirm / cancel pair                                    */
/* -------------------------------------------------------------------------- */

/**
 * The dialog's action pair. Global order is [Cancel] … [Submit] (#646), so the
 * affirmative sits on the right on every surface.
 */
export function SealActions({
  onConfirm,
  onCancel,
  busy,
  confirmLabel,
  cancelLabel,
  theme,
}: {
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
  theme: DuelSlotTheme
}) {
  const { t } = useTranslation('praxis')
  return (
    <div className="flex items-center justify-end gap-[8px] w-full">
      <button
        type="button"
        onClick={onCancel}
        className="btn-outline px-[14px] py-[6px]"
        style={{ fontSize: 'var(--text-sm)', fontFamily: theme.bodyFont ?? DEFAULT_THEME.bodyFont }}
      >
        {cancelLabel ?? t('duelSeal.cancel')}
      </button>
      <button
        type="button"
        autoFocus
        disabled={busy}
        onClick={onConfirm}
        className="btn-primary px-[18px] py-[6px]"
        style={{
          fontSize: 'var(--text-sm)',
          fontFamily: theme.bodyFont ?? DEFAULT_THEME.bodyFont,
          opacity: busy ? 0.5 : 1,
        }}
      >
        {confirmLabel ?? t('duelSeal.confirm')}
      </button>
    </div>
  )
}
