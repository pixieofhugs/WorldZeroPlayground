import type { } from "react";
import { pickVariant } from "../../utils/factionDispatch";
import { surfaceMap } from "../../factions";
import { factionCssVar } from "../../utils/factions";
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

/* Albescent has NO adapter row here any more, and no mark of its own anywhere
   (#1891). The surveyor's cross-hair added by #1626 was a distinct emblem worn
   by an otherwise-hidden faction: a mark nobody else wears is a tell, and it
   appeared on surfaces an unrevealed player reads — the filter facet, the
   players chip row, the requests tray, the credential footer. `albescent` now
   falls through to `DefaultSigilAdapter` like any unthemed slug, which is what
   `factions/albescent.ts` (registering no `sigil` row) always said it should.

   The owner accepts the two consequences knowingly: for a REVEALED player the
   Albescent and Unaffiliated filter rows now wear the same mark, and the
   invitation letter presents the unaffiliated spectrum ring. */

/**
 * The hoop a surface draws AROUND the mark, for the one slug whose mark has an
 * opinion about it — `undefined` everywhere else, meaning "no opinion, keep
 * your own accent" (#1658).
 *
 * It lives here for the reason the adapter above does: which ink belongs to
 * which slug is this module's question, and `CredentialCard` — the only caller
 * — must stay slug-blind. The design rings Albescent's cross-hair in `#60a5fa`,
 * which #1657 established is not a literal to transcribe but
 * --faction-default-stop-6's dark value; the token carries both halves of the
 * cascade, and it is the spectrum's own blue, so the hoop and the strokes it
 * encircles are cut from one ramp. NOT a second rainbow: a spectrum hoop around
 * spectrum strokes at 42px is two ramps fighting over one mark, and the
 * transcription asks for a gradient on the strokes only.
 */
export function factionSigilRing(slug: string | null | undefined): string | undefined {
  return slug === "albescent" ? "var(--faction-default-stop-6)" : undefined;
}

function DefaultSigilAdapter({ size }: SigilVariantProps) {
  // The default ring has no color prop — it draws
  // --faction-default-rainbow-conic.
  return <DefaultSigil size={size} />;
}

export default function FactionSigil({ slug, size, color }: FactionSigilProps) {
  const Variant = pickVariant(surfaceMap("sigil"), slug, DefaultSigilAdapter);
  return <Variant size={size} color={color} />;
}
