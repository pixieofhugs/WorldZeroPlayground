/**
 * Albescent's duel reader (#1084): a deliberate PASS-THROUGH. The row exists so
 * the manifest doesn't answer by silence (#2531). No re-cut without an owner
 * ruling (duel brief §6): the reader is dressed by the TASK's faction, so any
 * viewer reaches it and a tell would un-hide (ADR-0027).
 */
import DefaultDuelReader from './DefaultDuelReader'
import type { DuelReaderState } from '../useDuelReader'

export default function AlbescentDuelReader({ state }: { state: DuelReaderState }) {
  return <DefaultDuelReader state={state} />
}
