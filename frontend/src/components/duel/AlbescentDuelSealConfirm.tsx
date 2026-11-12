/**
 * Albescent's duel seal (#2531): a pass-through, byte-identical to the Default
 * (`albescentWrapperKinds.test.tsx`). The Default seal draws no spectrum to re-cut,
 * it is skinned by the TASK's faction (a non-member may see it, ADR-0027), and the
 * forfeit is irreversible, so no motion. The row answers "does Albescent dress
 * this?" in the manifest: no.
 */
import { DefaultDuelSealConfirm, type DuelSealConfirmProps } from './DuelSealConfirm'

export default function AlbescentDuelSealConfirm(props: DuelSealConfirmProps) {
  return <DefaultDuelSealConfirm {...props} />
}
