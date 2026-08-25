import type { } from "react";
import { resolveVariant } from "../../utils/factionDispatch";
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

export function UaSigilAdapter({ size, color }: SigilVariantProps) {
  const dim = size ?? 22;
  /* THE INK IS FORWARDED (#2635). This dropped `color` on the floor under a
     comment saying "the ensō draws --faction-ua-glow internally; it has no color
     prop" — which stopped being true at #908, when the two-arc approximation
     became the vendored mask and `UaSigil` grew a `color` that DEFAULTS to that
     glow. So the prop type-checked, the mark ignored it, and no guard could see
     it: `factionSigil.test.tsx`'s paint test compares the dispatcher against the
     adapter, and both dropped it identically.

     #2635 is where it stopped being harmless: UA's masthead band is the
     faction's own orange now, `--faction-ua-glow` is 1.30:1 on it, and
     `CardMasthead`'s `markColor` — the prop that exists for exactly this — was
     reaching nothing. Undefined still falls through to the glow, so every mount
     that passes no ink is unmoved; the filter facet's `factionCssVar('ua')` now
     lands, which is what that call site was already asking for. */
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
 * Albescent's labyrinth (#1626's row, deleted by #1891 and REINSTATED by owner
 * ruling on Sigil Studies v2).
 *
 * #1891's objection was to the mark it deleted, not to the existence of one: a
 * surveyor's cross-hair, inked on the vellum reveal register (always-light then,
 * and deleted outright by #2632), was a distinct emblem in a distinct PALETTE
 * worn by an otherwise-hidden faction. The labyrinth answers that half — it carries no hue of its
 * own, it is filled with the unaffiliated conic, so what a stranger meets is a
 * shape and never a livery. The owner has accepted the remaining consequence
 * knowingly: an unrevealed viewer sees a mark they do not recognise on the
 * filter facet, the players roster, the requests tray, the credential footer
 * and the sidebar's activity rail. Everything about the NAME stays masked —
 * that is #1891/#1926's other half and it is untouched.
 *
 * IT IS A MANIFEST ROW NOW (#2529), and the note this replaces named its own
 * retirement: the adapter used to be spread into the map at the call site,
 * *ahead* of `surfaceMap('sigil')`, "so the day albescent does declare a `sigil`
 * the manifest wins and this line quietly stops mattering." That day is #2529.
 * The old reasoning was that `albescent.ts` takes only "a flourish LAYERED OVER
 * Default's structure" and a bespoke emblem is not one — true of the SHAPE and
 * not of the risk it was guarding, which is livery (#783): the labyrinth is
 * painted from `--faction-default-rainbow-conic`, the same spectrum na wears,
 * so registering it repaints nothing. What the bypass did cost was real. It made
 * every census of who skins what report `sigil: 7/8, albescent absent`, and it
 * put the mark outside the one map a refactor of this surface would carry — the
 * way it was already dropped once (`Sidebar.tsx:40`).
 *
 * Exported, not local, for the reason `UaSigilAdapter` and
 * `SingularitySigilAdapter` above are: a manifest names it through
 * `lazyArchetype`, which defers the read past module evaluation and keeps the
 * dispatcher↔archetype cycle harmless. See the thunk note in `factions/manifest.ts`.
 */
export function AlbescentSigilAdapter({ size, color }: SigilVariantProps) {
  return <AlbescentSigil size={size ?? 22} color={color} />;
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

/**
 * The na ring — a `Default*` archetype co-located with its dispatcher, which
 * `manifest.ts` names as the normal shape for three surfaces already. Exported
 * so a test can resolve the surface the way this component does (`resolveVariant`
 * over `surfaceMap('sigil')`, with the na fallback named) rather than
 * re-deriving the fallback and proving its own copy instead.
 */
export function DefaultSigilAdapter({ size }: SigilVariantProps) {
  // The default ring has no color prop — it draws
  // --faction-default-rainbow-conic.
  return <DefaultSigil size={size} />;
}

export default function FactionSigil({ slug, size, color }: FactionSigilProps) {
  const Variant = resolveVariant(surfaceMap("sigil"), slug);
  return <Variant size={size} color={color} />;
}
