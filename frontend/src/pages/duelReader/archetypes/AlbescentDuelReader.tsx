/**
 * Albescent's side-by-side duel reader (#1084) — A PASS-THROUGH WRAPPER. It
 * renders `DefaultDuelReader` and changes not one pixel, at either width and in
 * every one of the states this surface draws.
 *
 * IT EXISTS BECAUSE AN ABSENT ROW SAYS TWO THINGS AT ONCE. Albescent claims
 * every key in `SURFACE_KEYS` (#2531) precisely so the manifest stops answering
 * "does Albescent dress this?" by silence: a missing row reads as "na draws no
 * mark here to re-cut" and as "nobody got to it", and the 2026-08-23 audit
 * found four being read the wrong way. This one says the first.
 *
 * AND IT MAY NOT BE A RE-CUT, FOR A REASON THAT IS WRITTEN DOWN.
 * `.design-sync/BRIEF-duel-surfaces.md` §6 is explicit — *"No Albescent dress
 * on any duel surface without an owner ruling first"* — and this surface has no
 * such ruling. The reason is `AlbescentDuelSealConfirm`'s and it holds here
 * unchanged: the reader is dressed by the TASK's faction, so this row is
 * reached by ANYONE reading a duel fought on an Albescent-owned task, member or
 * not, where a tell is an un-hiding rather than a reveal (ADR-0027).
 *
 * The one na mark on this page — the sheet's `.spectrum-rule` band — is a BAND
 * and not a dial, and #1127 already ruled that a band keeps its linear ramp.
 * So there is nothing here for `.alb-moves` to set turning even if a ruling
 * arrived.
 *
 * ONE responsive component, both form factors (ADR-0092); this wrapper does not
 * touch the chassis's single breakpoint.
 */
import DefaultDuelReader from './DefaultDuelReader'
import type { DuelReaderState } from '../useDuelReader'

export default function AlbescentDuelReader({ state }: { state: DuelReaderState }) {
  return <DefaultDuelReader state={state} />
}
