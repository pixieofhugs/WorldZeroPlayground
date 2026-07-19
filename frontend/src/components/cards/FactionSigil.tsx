import type { } from "react";
import { pickVariant } from "../../utils/factionDispatch";
import { surfaceMap } from "../../factions";
import { factionCssVar } from "../../utils/factions";
import { SingularitySigil } from "./SingularitySigil";
import { UaSigil } from "./UaSigil";
import AlbescentSigil from "./AlbescentSigil";
import DefaultSigil from "./DefaultSigil";

/**
 * FactionSigil — the dispatcher that makes the seven faction sigils (each
 * previously its own inline/scattered component with its own prop shape)
 * reachable as one `{ slug, size, color }` component (ADR-0040, #659). Falls
 * back to the unaffiliated seven-segment `DefaultSigil` ring for an
 * unknown/null slug, mirroring `FactionAvatar`'s dispatch pattern.
 */
export interface FactionSigilProps {
  slug: string | null | undefined;
  size?: number;
  color?: string;
}

export type SigilVariantProps = { size?: number; color?: string };

export function UaSigilAdapter({ size }: SigilVariantProps) {
  const dim = size ?? 22;
  // UA draws its own --ua-* tokens internally; it has no color prop.
  return <UaSigil width={dim} height={dim} />;
}

export function SingularitySigilAdapter({ size, color }: SigilVariantProps) {
  return (
    <SingularitySigil
      size={size ?? 22}
      color={color ?? factionCssVar("singularity")}
    />
  );
}

export function AlbescentSigilAdapter({ size, color }: SigilVariantProps) {
  return <AlbescentSigil size={size} color={color} />;
}

function DefaultSigilAdapter({ size }: SigilVariantProps) {
  // The default ring has no color prop — it draws --faction-default-ring.
  return <DefaultSigil size={size} />;
}

export default function FactionSigil({ slug, size, color }: FactionSigilProps) {
  const Variant = pickVariant(surfaceMap('sigil'), slug, DefaultSigilAdapter);
  return <Variant size={size} color={color} />;
}
