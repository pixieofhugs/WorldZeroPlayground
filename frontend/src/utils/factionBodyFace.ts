import type { CSSProperties } from "react";

// Apart from `factionRoles.ts` (app-shell reachable): these faces ship in the
// deferred faction font sheet, so only faction chunks import this (`factionFaceSplit.test.ts`).

/** One line per faction; the value is a `--faction-*` token, never a family name. */
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
 * Scopes `--font-body` to a surface. Every slug answers (others reset to
 * `--font-body-base`) so a face cannot leak into a nested card of another
 * faction. Not part of {@link factionRoleVars}; spread beside it.
 */
export function factionBodyVars(slug: string | null | undefined): CSSProperties {
  return {
    "--font-body": OWN_BODY_FACE[slug ?? ""] ?? "var(--font-body-base)",
  } as CSSProperties;
}
