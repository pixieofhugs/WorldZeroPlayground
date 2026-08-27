/**
 * Duel seal confirmation (#718) — the beat between "cast" and casting, for a
 * duel side only.
 *
 * A solo praxis goes live quietly and a collab reopens neutrally; a duel is the
 * one mode where the button in front of you has consequences you can't undo, so
 * it is the one mode that asks. What it says depends on where the duel is:
 *
 *  - `active` (they accepted): casting seals your side. Pulling back is STILL
 *    free until they cast too — a forfeit only exists once the duel is `settled`
 *    (ADR-0011 §Forfeit; `praxis.py` only forfeits on `status == settled`). The
 *    dialog says both halves: what sealing costs later, and what's still free now.
 *  - `pending` (unanswered): casting is ungated and nothing is at stake. If they
 *    decline, this scores as an ordinary solo praxis at 1.0×.
 *
 * Chrome mirrors `collab/CollabSuccess.tsx` exactly — fixed dim overlay,
 * role="dialog" + aria-modal, mobile full-screen / desktop centred panel,
 * primary action autofocuses, no focus trap. Mounted once from the EditPraxis
 * dispatcher, so all 16 composer surfaces inherit it. That form-factor branch is
 * no longer written here: it is `DuelSealSheet`, the one chassis every sheet
 * hangs in (#1313).
 *
 * The Default skin below is the only one this issue ships; the manifest seam
 * exists so per-faction skins (#720 for Coven, one issue per faction after) are a
 * `duelSeal` row and nothing else — ONE responsive component per faction. Skins
 * own the FRAME only — every figure and every branch lives in `duel/shared.tsx`.
 *
 * TWO MODES, ONE SURFACE (#751)
 * -----------------------------
 * The same dialog also confirms a FORFEIT — pulling back a settled duel side,
 * which was an inline text expand on the praxis-detail page until now. It is the
 * one duel moment with a genuinely irreversible consequence and was the only one
 * with no skinnable surface, while the *reversible* moment (this one) got a full
 * dialog in #718.
 *
 * It rides the `mode` prop rather than a `duelForfeit` / `mobileDuelForfeit`
 * pair of manifest keys, because the two dialogs are ~90% the same component:
 * same frame, same roster, same stakes tiles, same footer. Only the title, the
 * body, and the confirm label differ, and `useDuelSealCopy` owns all three. Each
 * faction therefore stays TWO files that each handle two modes, instead of four
 * files — which is the whole reason this landed before the six skin issues
 * (#721–#726).
 *
 * CONTRAST (#1168), measured with `utils/contrast.ts` in both themes against
 * this dialog's one ground, `--color-bg-page`. `--color-danger` reads 4.40:1
 * there in light, so the forfeit body takes `--faction-default-card-notice`
 * (6.46 / 11.14) — see the comment at the call site. Everything else on this
 * sheet clears as shipped and is deliberately untouched: the reopen note in
 * `--color-success` at 8.30 / 10.67, the stakes win figure and the roster's
 * "sealed" mark in the same green, and the Snide zero figure in
 * `--color-danger` at 4.40 / 6.72 (24px bold, so a 3:1 floor). The pairings are
 * rows in `utils/__tests__/factionContrast.test.ts`, not just in a PR body —
 * the nightly sweep walks read routes and can never reach a composer state.
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
  /** The task's base point value — every stakes figure is derived from it. */
  taskPointValue: number | null | undefined
  /** Fires the composer's existing `publish()`, untouched. */
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
  /**
   * Which beat this dialog is confirming (#751). Optional and defaulting to
   * `'submit'`, so every existing mount site is unchanged. See `DuelSealMode`.
   */
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

  // Tokens come from the OPPONENT's faction, matching the read-page rail: the
  // opponent is the foreign element and should look foreign (grilled #310).
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

        {/* The forfeit body is NOT painted in `--color-danger`: it measures
            4.40:1 on `--color-bg-page` in light, under the 4.5:1 this 18px copy
            owes (#1168). It takes the na kit's notice ink (6.46 / 11.14) and the
            red survives as the rule beside it, where it carries no text — the
            shape `UaDuelSealConfirm` established in #1167. */}
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
          viewerFactionSlug={me.faction_slug}
          opponentFactionSlug={foe.faction_slug}
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

/**
 * The dispatcher the composer mounts. Skinned by the TASK's faction (the
 * composer's own archetype is chosen the same way), not the opponent's — the
 * dialog is a piece of the composer, and only its tokens are foreign.
 *
 * ONE dispatch, both form factors: the form-factor branch is `DuelSealSheet`'s,
 * so the slug is the whole story here.
 */
export default function DuelSealConfirm({
  taskFactionSlug,
  ...props
}: DuelSealConfirmProps & { taskFactionSlug: string | null | undefined }) {
  const Skin = resolveVariant(surfaceMap('duelSeal'), taskFactionSlug)
  return <Skin {...props} />
}
