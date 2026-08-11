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
  /* #1658. A dispatched mount with no colour of its own gets the mark stroked
     in the unaffiliated spectrum — the design's credential treatment, and the
     same answer to #783 the adapter itself is: the spectrum is what na wears,
     so a member's mark reads as camouflage rather than as a livery. A caller
     that DID name an ink keeps it (the faction filter facet passes
     `factionCssVar`), and a direct mount on the reveal register — the
     invitation letter, the faction-select tile — never comes through here. */
  return <AlbescentSigil size={size ?? 22} color={color} spectrum={!color} />;
}

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
  const Variant = pickVariant(
    { albescent: AlbescentSigilAdapter, ...surfaceMap("sigil") },
    slug,
    DefaultSigilAdapter,
  );
  return <Variant size={size} color={color} />;
}
