import type { } from "react";
import { pickVariant } from "../../utils/factionDispatch";
import { surfaceMap } from "../../factions";
import { factionCssVar } from "../../utils/factions";
import AlbescentSigil from "./AlbescentSigil";
import { SingularitySigil } from "./SingularitySigil";
import { UaSigil } from "./UaSigil";
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
  // The ensō draws --faction-ua-glow internally; it has no color prop.
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

/**
 * Albescent's surveyor's cross-hair (#1626). It is the faction's only mark and
 * it is drawn everywhere else it appears — the invitation, the faction-select
 * tile — but `factions/albescent.ts` registers no `sigil` row, so asking this
 * dispatcher for `albescent` handed back the unaffiliated spectrum ring while a
 * finished `AlbescentSigil` sat one directory over. Every caller that hit it
 * (the faction filter facet, the mobile players chip row, the requests-queue
 * tray, and now the credential footer) had to either live with the wrong mark
 * or branch on the slug itself — four copies of one gap.
 *
 * WHY THE ADAPTER AND NOT THE MANIFEST. `albescent.ts`'s contract is explicit:
 * anything added there must be "a flourish LAYERED OVER Default's structure",
 * because a surface that repaints Albescent in its own colours un-hides the
 * society (#783). A bespoke emblem drawn on the always-light
 * `--albescent-reveal-*` register is not Default-plus-a-flourish, so it is not a
 * manifest row. It resolves here instead, where the mark→slug question already
 * lives — and it sits BEFORE the spread, so the day albescent does declare a
 * `sigil` the manifest wins and this line quietly stops mattering.
 */
function AlbescentSigilAdapter({ size, color }: SigilVariantProps) {
  return <AlbescentSigil size={size ?? 22} color={color} />;
}

function DefaultSigilAdapter({ size }: SigilVariantProps) {
  // The default ring has no color prop — it draws
  // --faction-default-rainbow-conic.
  return <DefaultSigil size={size} />;
}

export default function FactionSigil({ slug, size, color }: FactionSigilProps) {
  const Variant = pickVariant(
    { albescent: AlbescentSigilAdapter, ...surfaceMap("sigil") },
    slug,
    DefaultSigilAdapter,
  );
  return <Variant size={size} color={color} />;
}
