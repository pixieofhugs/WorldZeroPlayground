import type { ScoredPraxis } from "./scoreBreakdown";
import { resolveVariant } from "../../../utils/factionDispatch";
import { surfaceMap } from "../../../factions";
import {
  UNSCORED_MODERATION_STATUSES,
  type ModerationStatus,
} from "../../../api/praxis";

/**
 * The `scoreStamp` surface dispatcher (ADR-0049): a per-faction total MARK,
 * dispatched on the task's faction slug with `Default*` fall-through (ADR-0039).
 * Size-agnostic: mobile renders the same component.
 *
 * NO SKIN DECLARES `flex-shrink: 0` — that is the contract (#2114). A frozen stamp
 * starves its neighbour; `min-width: auto` already floors each skin at its own
 * min-content. If a skin truly must not yield, give it a `min-width` and say why.
 */
/**
 * Everything any stamp reads off a praxis; structural, so both `PraxisCardOut`
 * and `PraxisOut` satisfy it (#1079). The extras over `ScoredPraxis` are
 * presentation inputs, kept out of the arithmetic contract.
 */
export interface StampablePraxis extends ScoredPraxis {
  /** Task Crown — top-scoring submitted praxis for its task (ADR-0028). */
  is_top_for_task: boolean;
  /** The task's faction: what the stamp surface dispatches on (ADR-0039). */
  task_faction_slug: string | null;
  /** Whether the total was banked at all — see the gate below (#1444). */
  moderation_status: ModerationStatus;
}

export interface ScoreStampProps {
  praxis: StampablePraxis;
  /** False when the surface draws its own TaskCrown. */
  showCrown?: boolean;
}

export default function ScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  /**
   * No stamp on a praxis that banked nothing (#1444): `failed` scores 0 (#1373)
   * and `hidden` never counted; `flagged` still counts. Gated here because this
   * is the single mount for every total (ADR-0049).
   */
  if (UNSCORED_MODERATION_STATUSES.has(praxis.moderation_status)) return null;
  const Stamp = resolveVariant(
    surfaceMap("scoreStamp"),
    praxis.task_faction_slug,
  );
  return <Stamp praxis={praxis} showCrown={showCrown} />;
}
