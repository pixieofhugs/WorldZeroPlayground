/**
 * Duel seal confirmation (#718): a duel is the one mode whose cast asks first.
 *  - `active`: casting seals your side; pulling back stays free until they cast
 *    too — a forfeit only exists once `settled` (ADR-0011 §Forfeit).
 *  - `pending`: nothing at stake; if declined it scores as solo at 1.0×.
 * `mode` also confirms a FORFEIT (#751): ~90% the same dialog, so one prop rather
 * than extra manifest keys; `useDuelSealCopy` owns the differing words.
 * Skins (`duelSeal` manifest row) own the FRAME only — figures and branches live in
 * `duel/shared.tsx`; the form-factor shell is `DuelSealSheet` (#1313).
 *
 * Contrast (#1168): `--color-danger` is 4.40:1 on `--color-bg-page`, so the forfeit
 * body uses `--faction-default-card-notice`. Rows in `factionContrast.test.ts`
 * (the nightly can't reach a composer state).
 */
import type { } from 'react'
import type { DuelDetailOut } from '../../api/duel'
import { factionCssVar } from '../../utils/factions'
import { resolveVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'
import DuelSealSheet from './DuelSealSheet'
import {
  duelSides,
  RaceRoster,
  SealActions,
  StakesTiles,
  useDuelSealCopy,
  type DuelSealMode,
  type DuelSlotTheme,
} from './shared'

export interface DuelSealConfirmProps {
  duel: DuelDetailOut
  viewerCharacterId: number | null | undefined
  taskPointValue: number | null | undefined
  /** The composer's `publish()`. */
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
  /** Which beat this confirms (#751); defaults to `'submit'`. */
  mode?: DuelSealMode
}

export function DefaultDuelSealConfirm({
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

  // The OPPONENT's tokens, matching the read-page rail (#310).
  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const theme: DuelSlotTheme = { accent }

  return (
    <DuelSealSheet
      label={copy.heading}
      ground={{ background: 'var(--color-bg-page)' }}
      card={{ border: `2px solid ${accent}`, borderRadius: 8 }}
    >
      <div className="flex flex-col gap-3 p-6">
        <h2
          className="font-display"
          style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-primary)' }}
        >
          {copy.heading}
        </h2>

        {/* Not `--color-danger` (4.40:1 here, #1168): notice ink, red as textless rule. */}
        <p
          className="font-body content-text"
          style={{
            color: copy.danger ? 'var(--faction-default-card-notice)' : 'var(--color-text-secondary)',
            ...(copy.danger
              ? {
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
            className="font-body content-text"
            style={{ color: 'var(--color-success)' }}
          >
            {copy.note}
          </p>
        )}

        <StakesTiles
          me={me}
          opponentName={foe.display_name}
          taskPointValue={taskPointValue}
          status={duel.status}
          theme={theme}
        />

        <RaceRoster me={me} foe={foe} theme={theme} />

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

/** The dispatcher, skinned by the TASK's faction (like the composer); only tokens are the foe's. */
export default function DuelSealConfirm({
  taskFactionSlug,
  ...props
}: DuelSealConfirmProps & { taskFactionSlug: string | null | undefined }) {
  const Skin = resolveVariant(surfaceMap('duelSeal'), taskFactionSlug)
  return <Skin {...props} />
}
