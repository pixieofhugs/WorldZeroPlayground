import type { PraxisCardOut } from "../../api/praxis";
import { resolveVariant } from "../../utils/factionDispatch";
import { surfaceMap } from "../../factions";
import { useVotedPraxis } from "../vote/useVotedPraxis";
import { usePraxisCard } from "./usePraxisCard";

/**
 * Each faction's praxis card owns a bespoke frame. The nine archetypes live one
 * per module under `./praxisCard/desktop/` (#839) — mirroring the mobile split —
 * so a faction slice touches only its own file. The content inside is composed
 * from the shared structural slots in `./praxisCard/shared` via `PraxisBody`
 * (an archetype may rearrange the slots). Admin moderation + the optimistic
 * local praxis come from usePraxisCard; the frame is selected by task faction
 * via resolveVariant.
 */
export type { ArchetypeProps } from "./desktop/shared";

interface Props {
  praxis: PraxisCardOut;
  onModerated?: () => void;
  /**
   * Task Crown display (ADR-0028) — on by default. The six faction-page bodies
   * pass false because they stamp their own larger corner medallion over the
   * card; every other surface keeps the built-in stamp.
   */
  showCrown?: boolean;
}

export default function PraxisCard({ praxis, onModerated, showCrown = true }: Props) {
  const { localPraxis, adminProps } = usePraxisCard(praxis, onModerated);
  // Merge the viewer's own just-cast vote (#626) before the skin sees it, so the
  // score hero, footer meta and vote tally all move together on one object.
  const voted = useVotedPraxis(localPraxis);
  const Card = resolveVariant(
    surfaceMap('praxisCard'),
    voted.task_faction_slug,
  );
  return <Card praxis={voted} adminProps={adminProps} showCrown={showCrown} />;
}
