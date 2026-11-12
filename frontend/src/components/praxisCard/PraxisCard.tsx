import type { PraxisCardOut } from "../../api/praxis";
import { resolveVariant } from "../../utils/factionDispatch";
import { surfaceMap } from "../../factions";
import { useVotedPraxis } from "../vote/useVotedPraxis";
import { usePraxisCard } from "./usePraxisCard";

/**
 * Dispatches to the task faction's bespoke frame (`./desktop/`, #839), each
 * composing shared slots via `PraxisBody`.
 */
export type { ArchetypeProps } from "./desktop/shared";

interface Props {
  praxis: PraxisCardOut;
  onModerated?: () => void;
  /** Task Crown (ADR-0028). Faction-page bodies pass false: they stamp their own. */
  showCrown?: boolean;
}

export default function PraxisCard({ praxis, onModerated, showCrown = true }: Props) {
  const { localPraxis, adminProps } = usePraxisCard(praxis, onModerated);
  // Merge the viewer's just-cast vote (#626) so score, meta and tally move together.
  const voted = useVotedPraxis(localPraxis);
  const Card = resolveVariant(
    surfaceMap('praxisCard'),
    voted.task_faction_slug,
  );
  return <Card praxis={voted} adminProps={adminProps} showCrown={showCrown} />;
}
