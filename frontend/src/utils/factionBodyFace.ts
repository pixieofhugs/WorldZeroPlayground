import type { CSSProperties } from "react";

// Lives apart from `factionRoles.ts` on purpose: that module is statically
// reachable from the app shell, and the faction body tokens named here resolve
// to faces that ship in the deferred faction font sheet. This one is imported
// only by faction surfaces, which load in faction chunks (`factionFaceSplit.test.ts`).

/**
 * Factions whose OWN body face replaces the app's under their surfaces. One line
 * per faction: the value is a `--faction-*` token, never a family name.
 */
const OWN_BODY_FACE: Readonly<Record<string, string>> = {
  everymen: "var(--faction-everymen-body-font)",
  wow: "var(--faction-wow-body-font)",
  ua: "var(--faction-ua-body-font)",
  snide: "var(--faction-snide-body-font)",
  coven: "var(--faction-coven-body-font)",
  ephemerists: "var(--faction-ephemerists-body-font)",
  singularity: "var(--faction-singularity-body-font)",
};

/**
 * Scopes `--font-body` to a surface, so the `font-body` utility, `.label-*` and
 * every direct read inside it - shared children included - follow that
 * faction's face. EVERY slug answers: a faction without its own face resets to
 * the app's (`--font-body-base`), which is what stops an Everymen page's
 * Courier Prime reaching a neutral or other-faction card nested inside it.
 * {@link factionRoleVars} does NOT include this; spread it beside the roles.
 */
export function factionBodyVars(slug: string | null | undefined): CSSProperties {
  return {
    "--font-body": OWN_BODY_FACE[slug ?? ""] ?? "var(--font-body-base)",
  } as CSSProperties;
}
