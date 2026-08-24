/**
 * Albescent's duel seal (#2531) — A PASS-THROUGH WRAPPER. It renders
 * `DefaultDuelSealConfirm` and changes not one pixel, in both modes and at both
 * widths; `renderToStaticMarkup` here is byte-identical to the Default and
 * `albescentWrapperKinds.test.tsx` asserts it.
 *
 * THERE IS NO na MARK ON THIS SURFACE TO RE-CUT, and that is the finding. The
 * seven other seals are frames of their own, but the Default one is not the na
 * SPECTRUM kit: it draws no rainbow anywhere. Its ground is `--color-bg-page`,
 * its one accent is `factionCssVar(foe.faction_slug, 'card-accent')` — the
 * OPPONENT's flat hue, which is the read-page rail's rule (grilled #310) — and
 * every figure below it comes out of `duel/shared.tsx`. Neither
 * `.spectrum-rule` nor `.spectrum-dial` is mounted, so `.alb-moves` has nothing
 * to reach and a wrapper has nothing to grab.
 *
 * DRESSING IT ANYWAY WOULD BE THE WRONG MOVE TWICE OVER. The dialog is skinned
 * by the TASK's faction rather than the viewer's, so this row is reached when
 * someone duels on an Albescent-owned task — a surface a NON-MEMBER is looking
 * at, where a tell would be an un-hiding rather than a reveal (ADR-0027). And
 * the seal's whole job is a decision with a consequence: the forfeit mode is the
 * one duel moment that cannot be undone. Motion behind that copy buys a tell and
 * spends legibility, which is the trade `AlbescentEditPraxis` already refused on
 * the composer for the same reason.
 *
 * So the registration exists for the manifest's sake, not the dress's: it is the
 * one place that answers "does Albescent dress this?", and an absent row leaves
 * the reader to guess whether na draws no mark here or whether nobody got to it.
 * It says the first.
 *
 * ONE responsive component, both form factors (#1313) — the shell is
 * `DuelSealSheet`'s and this wrapper does not touch it.
 */
import { DefaultDuelSealConfirm, type DuelSealConfirmProps } from './DuelSealConfirm'

export default function AlbescentDuelSealConfirm(props: DuelSealConfirmProps) {
  return <DefaultDuelSealConfirm {...props} />
}
