import type { } from "react";
import { resolveVariant } from "../../utils/factionDispatch";
import { surfaceMap } from "../../factions";
import { factionCssVar } from "../../utils/factions";
import AlbescentSigil from "./AlbescentSigil";
import { SingularitySigil } from "./SingularitySigil";
import { UaSigil } from "./UaSigil";
import DefaultSigil from "./DefaultSigil";

/**
 * FactionSigil — one `{ slug, size, color }` dispatcher over the faction sigils
 * (ADR-0040, #659); unknown/null falls back to `DefaultSigil`.
 */
export interface FactionSigilProps {
  slug: string | null | undefined;
  size?: number;
  color?: string;
}

export type SigilVariantProps = { size?: number; color?: string };

export function UaSigilAdapter({ size, color }: SigilVariantProps) {
  const dim = size ?? 22;
  /* Forward the ink (#2635): `markColor` on UA's orange band needs it;
     undefined still falls through to `--faction-ua-glow`. */
  return <UaSigil width={dim} height={dim} color={color} />;
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
 * Albescent's labyrinth (reinstated by owner ruling, Sigil Studies v2). Safe
 * because it carries no hue: painted from `--faction-default-rainbow-conic`, so
 * a stranger meets a shape, never a livery (#783); the NAME stays masked.
 * A manifest row (#2529), exported for `lazyArchetype` (see `factions/manifest.ts`).
 */
export function AlbescentSigilAdapter({ size, color }: SigilVariantProps) {
  return <AlbescentSigil size={size ?? 22} color={color} />;
}

/**
 * The hoop around the mark, for the one slug with an opinion (#1658);
 * `undefined` = keep your own accent. Lives here so `CredentialCard` stays
 * slug-blind. `--faction-default-stop-6` is the design's `#60a5fa` (#1657); not
 * a second rainbow — two ramps would fight over one mark.
 */
export function factionSigilRing(slug: string | null | undefined): string | undefined {
  return slug === "albescent" ? "var(--faction-default-stop-6)" : undefined;
}

/** The na ring; exported so a test can resolve the surface as this component does. */
export function DefaultSigilAdapter({ size }: SigilVariantProps) {
  /* Deliberately NOT forwarding `color` (#2528): na owns the spectrum
     (ADR-0039) and must not be repainted a solid. The sidebar rail reaches
     `DefaultSigil` directly. */
  return <DefaultSigil size={size} />;
}

export default function FactionSigil({ slug, size, color }: FactionSigilProps) {
  const Variant = resolveVariant(surfaceMap("sigil"), slug);
  return <Variant size={size} color={color} />;
}
