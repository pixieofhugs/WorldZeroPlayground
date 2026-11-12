/**
 * Duel shared slots (#718). Skins own the frame; these own the logic (stakes,
 * cast status, mode copy). A skin may rearrange slots, never drop or
 * re-implement one. Consumers: the seal/forfeit skins, and `duelSides` for the
 * composer (#1090).
 *
 * Rules: multipliers are server-resolved per side (#2865; Snide loses at 0.0×,
 * so never say "half"). A declined duel scores as plain solo. Figures are BASE
 * points before crowd votes, so label them as a floor. Copy is neutral (#718).
 *
 * Type size (#769): each slot sets its own `.content-*` size; skins never set
 * `fontSize` on a wrapper (a wrapper's `var(--text-sm)` once sank these to 9px)
 * and `DuelSlotTheme` has no size field (WORLD_ZERO_STYLE §4a). Seal buttons take
 * the class's size (#1783); an inline size would silently pin them.
 */
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { DuelDetailOut, DuelSideOut, DuelStatus } from '../../api/duel'
import { formatPoints } from '../../utils/points'

/**
 * Per-faction slot paint; every value a CSS var. `credit` / `alarm` (#1168) let
 * an always-dark skin repoint the theme-flipping functional inks to a measured
 * `--faction-{slug}-card-credit` / `-card-notice`; never mint a new token.
 */
export interface DuelSlotTheme {
  accent: string
  muted?: string
  bodyFont?: string
  /** Win figure and "sealed" mark. Default `--color-success`. */
  credit?: string
  /** A zero lose figure. Default `--color-danger`. */
  alarm?: string
}

const DEFAULT_THEME: Required<Pick<DuelSlotTheme, 'muted' | 'bodyFont' | 'credit' | 'alarm'>> = {
  muted: 'var(--color-text-secondary)',
  bodyFont: 'var(--font-body)',
  credit: 'var(--color-success)',
  alarm: 'var(--color-danger)',
}

/** Not a spread: an explicit `undefined` must not erase a default (Everymen). */
function slotInk(theme: DuelSlotTheme): { credit: string; alarm: string } {
  return {
    credit: theme.credit ?? DEFAULT_THEME.credit,
    alarm: theme.alarm ?? DEFAULT_THEME.alarm,
  }
}

/** Split into me/foe by character id; a spectator gets the challenger's view. */
export function duelSides(
  duel: DuelDetailOut,
  viewerCharacterId: number | null | undefined,
): { me: DuelSideOut; foe: DuelSideOut } {
  const iAmOpponent = viewerCharacterId != null && duel.opponent.character_id === viewerCharacterId
  return iAmOpponent
    ? { me: duel.opponent, foe: duel.challenger }
    : { me: duel.challenger, foe: duel.opponent }
}

interface DuelStakes {
  win: number
  /** `0` for Snide, by construction, not by branch. */
  lose: number
  tie: number
  /** Duel never happens (declined): plain solo. */
  solo: number
}

/** Base points for one side: server-resolved multipliers (#2865) × task points. */
export function duelStakes(
  me: DuelSideOut,
  taskPointValue: number | null | undefined,
): DuelStakes | null {
  if (taskPointValue == null) return null
  return {
    win: taskPointValue * me.win_multiplier,
    lose: taskPointValue * me.loss_multiplier,
    tie: taskPointValue * me.tie_multiplier,
    solo: taskPointValue,
  }
}


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
      className="flex flex-col gap-1 px-3 py-2"
      style={{
        border: `1px solid ${theme.accent}`,
        fontFamily: theme.bodyFont ?? DEFAULT_THEME.bodyFont,
        flex: '1 1 0',
        minWidth: 0,
      }}
    >
      <span className="label-caption" style={{ color: theme.muted ?? DEFAULT_THEME.muted }}>
        {label}
      </span>
      {/* A score: content tier (WORLD_ZERO_STYLE §4). */}
      <span className="content-title" style={{ fontWeight: 700, color }}>
        {value}
      </span>
    </div>
  )
}

/**
 * Win/lose tiles plus the tie as a line (not a third tile: a tie is an edge).
 * `pending` shows only the solo fallback: nothing is at stake until accepted.
 */
export function StakesTiles({
  me,
  opponentName,
  taskPointValue,
  status,
  theme,
}: {
  me: DuelSideOut
  opponentName: string
  taskPointValue: number | null | undefined
  status: DuelStatus
  theme: DuelSlotTheme
}) {
  const { t } = useTranslation('praxis')
  const stakes = duelStakes(me, taskPointValue)
  if (!stakes) return null

  const font = theme.bodyFont ?? DEFAULT_THEME.bodyFont
  const muted = theme.muted ?? DEFAULT_THEME.muted
  const { credit, alarm } = slotInk(theme)

  if (status === 'pending') {
    return (
      <p
        className="mt-2 content-text"
        style={{ fontFamily: font, color: muted }}
      >
        {t('duelStakes.soloFallback', {
          name: opponentName,
          points: formatPoints(stakes.solo),
        })}
      </p>
    )
  }

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <Tile
          label={t('duelStakes.winLabel')}
          value={formatPoints(stakes.win)}
          color={credit}
          theme={theme}
        />
        <Tile
          label={t('duelStakes.loseLabel')}
          value={formatPoints(stakes.lose)}
          color={stakes.lose === 0 ? alarm : muted}
          theme={theme}
        />
      </div>
      <p
        className="mt-2 content-text"
        style={{ fontFamily: font, color: muted }}
      >
        {t('duelStakes.tieLine', { points: formatPoints(stakes.tie) })}{' '}
        {t('duelStakes.beforeVotes')}
      </p>
    </div>
  )
}

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
      className="flex items-center justify-between gap-2 content-text"
      style={{
        fontFamily: theme.bodyFont ?? DEFAULT_THEME.bodyFont,
      }}
    >
      <span style={{ fontWeight: 700 }}>{name}</span>
      <span
        style={{
          // 18px regular: the tightest `credit` consumer, owes 4.5:1 (#1168).
          color: cast ? slotInk(theme).credit : theme.muted ?? DEFAULT_THEME.muted,
        }}
      >
        {cast ? t('duelRoster.sealed') : t('duelRoster.walking')}
      </span>
    </li>
  )
}

/**
 * Per-side cast status from `is_submitted`. `spectator` (#999) names both sides,
 * never "You"; seal skins render for a party and leave it false.
 */
export function RaceRoster({
  me,
  foe,
  theme,
  spectator = false,
}: {
  me: DuelSideOut
  foe: DuelSideOut
  theme: DuelSlotTheme
  spectator?: boolean
}) {
  const { t } = useTranslation('praxis')
  return (
    <ul className="flex flex-col gap-1 mt-2">
      <RosterRow
        name={spectator ? me.display_name : t('duelRoster.you')}
        cast={me.is_submitted}
        theme={theme}
      />
      <RosterRow name={foe.display_name} cast={foe.is_submitted} theme={theme} />
    </ul>
  )
}

/**
 * `submit` casts your side; `forfeit` pulls back a SETTLED side, handing the win
 * over permanently (#751). Same dialog, different words: not a second surface key.
 */
export type DuelSealMode = 'submit' | 'forfeit'

interface DuelSealCopy {
  /** Also the dialog's `aria-label`. */
  heading: string
  body: string
  /** Free-reopen note; `null` in forfeit, by design. */
  note: string | null
  confirmLabel: string
  danger: boolean
}

/** The mode branch, once for every skin; a hook because the cost needs stakes. */
export function useDuelSealCopy(
  mode: DuelSealMode,
  duel: DuelDetailOut,
  viewerCharacterId: number | null | undefined,
  taskPointValue: number | null | undefined,
): DuelSealCopy {
  const { t } = useTranslation('praxis')
  const { me, foe } = duelSides(duel, viewerCharacterId)
  // Unconditional: hooks may not sit behind the mode branch.
  const stakes = duelStakes(me, taskPointValue)

  if (mode === 'forfeit') {
    const cost = stakes
      ? t('duelForfeit.cost', {
          name: foe.display_name,
          points: formatPoints(stakes.lose),
          win: formatPoints(stakes.win),
        })
      : null
    return {
      heading: t('duelForfeit.action'),
      // Prompt alone until stakes resolve, never a sentence with a hole.
      body: cost ? `${t('duelForfeit.confirmPrompt')} ${cost}` : t('duelForfeit.confirmPrompt'),
      note: null,
      confirmLabel: t('duelForfeit.action'),
      danger: true,
    }
  }

  return {
    heading: t('duelSeal.heading'),
    body:
      duel.status === 'pending'
        ? t('duelSeal.bodyPending', { name: foe.display_name })
        : t('duelSeal.bodyActive', { name: foe.display_name }),
    // Until the foe casts nothing is stuck; only once live.
    note:
      duel.status === 'active' && !foe.is_submitted
        ? t('duelSeal.reopenNote', { name: foe.display_name })
        : null,
    confirmLabel: t('duelSeal.confirm'),
    danger: false,
  }
}

/**
 * [Cancel] … [Submit] (#646). `danger` lives here, not in skins: a forfeit is
 * red in every voice (#751).
 */
export function SealActions({
  onConfirm,
  onCancel,
  busy,
  confirmLabel,
  cancelLabel,
  danger,
  theme,
  confirmClassName,
}: {
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
  danger?: boolean
  theme: DuelSlotTheme
  /**
   * Rides alongside `.control-off`, never replacing it (#3011), for
   * theme-invariant skins (Singularity, S.N.I.D.E. #3090). Not on
   * `DuelSlotTheme`: a class is not a colour/font value.
   */
  confirmClassName?: string
}) {
  const { t } = useTranslation('praxis')
  return (
    <div className="flex items-center justify-end gap-2 w-full">
      <button
        type="button"
        onClick={onCancel}
        className="btn-outline px-4 py-2"
        style={{ fontFamily: theme.bodyFont ?? DEFAULT_THEME.bodyFont }}
      >
        {cancelLabel ?? t('duelSeal.cancel')}
      </button>
      <button
        type="button"
        // The commit, seal or forfeit (#2453).
        data-testid="duel-seal-confirm"
        autoFocus
        disabled={busy}
        onClick={onConfirm}
        // `.control-off`, not an opacity fade (#2486): opacity loses contrast
        // twice. Busy forfeit keeps its danger border on a neutral slab.
        className={
          confirmClassName
            ? `btn-primary px-4 py-2 control-off ${confirmClassName}`
            : 'btn-primary px-4 py-2 control-off'
        }
        style={{
          fontFamily: theme.bodyFont ?? DEFAULT_THEME.bodyFont,
          ...(danger
            ? {
                background: 'var(--color-danger)',
                borderColor: 'var(--color-danger)',
                // Not --color-text-on-accent: 2.77:1 on dark red (#1169).
                color: 'var(--color-on-danger)',
              }
            : {}),
        }}
      >
        {confirmLabel ?? t('duelSeal.confirm')}
      </button>
    </div>
  )
}
