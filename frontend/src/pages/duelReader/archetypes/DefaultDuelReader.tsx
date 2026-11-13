/**
 * na's duel reader (#1084), and everybody's until a faction's design lands. It
 * passes no dress on purpose: the chassis's role map already wears the task
 * faction's ground (ADR-0089). `default.ts`'s row; may never be absent (#2530).
 */
import { DuelReaderFrame } from '../shared'
import { duelReaderTask, type DuelReaderState } from '../useDuelReader'

export default function DefaultDuelReader({ state }: { state: DuelReaderState }) {
  return (
    <DuelReaderFrame
      state={state}
      groundSlug={duelReaderTask(state.praxes)?.task_faction_slug ?? null}
    />
  )
}
