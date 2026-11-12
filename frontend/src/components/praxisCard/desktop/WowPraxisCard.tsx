import type { CSSProperties } from "react";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";
import { WowBand } from "../../cardMasthead/factionBands";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * Warriors of Whimsy — the chronicle of proof (#840, ADR-0050): cream parchment
 * bound in gold, written in plum. Border and ink are separate tokens, which is
 * the whole look (gold edge, plum ink; #860). Wears `WowTaskCard`'s banner
 * (#2185) over the chronicle's own 6px text-free stripe. The footnote keeps the
 * submission date, which is data.
 */
export function WowPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const submitted = praxis.submitted_at
    ? new Date(praxis.submitted_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div
      style={{
        ...frameBase,
        // Surface-owned prefix (#2674); reads fall back to today's tokens, so
        // the shared `WowBand` and `PraxisBody` are untouched.
        ...factionBodyVars("wow"), ...factionRoleVars("wow", "wow-praxis-card"),
        // #2361/#2403.
        borderRadius: "var(--wow-praxis-card-radius)",
        position: "relative",
        overflow: "hidden",
        background: "var(--faction-wow-chronicle-bg)",
        color: "var(--wow-praxis-card-ink)",
        border: "2px solid var(--faction-wow-chronicle-border)",
        boxShadow: "0 6px 22px -10px var(--faction-wow-chronicle-shadow)",
        fontFamily: "var(--faction-wow-body-font)",
        transition: "background 150ms, color 150ms",
      } as CSSProperties}
    >
      <WowBand />

      {/* The woven gold/plum stripe: the chronicle's rule, not a masthead. */}
      <div
        aria-hidden
        style={{
          height: 6,
          background:
            "repeating-linear-gradient(90deg, var(--faction-wow-chronicle-gold) 0 11px, var(--wow-praxis-card-accent) 11px 22px)",
        }}
      />
      <div style={{ padding: "var(--space-xl)" }}>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint="var(--faction-wow-chronicle-gold)"
          muted="var(--wow-praxis-card-quiet)"
          paper="var(--faction-wow-chronicle-bg)"
          titleStyle={{
            fontFamily: "var(--wow-praxis-card-face)",
            color: "var(--wow-praxis-card-ink)",
          }}
          showCrown={showCrown}
          fonts={{
            display: "var(--wow-praxis-card-face)",
            body: "var(--faction-wow-body-font)",
          }}
          mediaEmptyStyle={{
            height: 150,
            borderRadius: 6,
            border: "2px dashed var(--faction-wow-chronicle-gold)",
            background: "transparent",
            color: "var(--wow-praxis-card-quiet)",
            textTransform: "none",
            letterSpacing: "0.06em",
            fontSize: "var(--text-content)",
          }}
          footnote={
            submitted && (
              <div
                style={{
                  fontFamily: "var(--faction-wow-body-font)",
                  fontStyle: "italic",
                  fontSize: "var(--text-content)",
                  color: "var(--wow-praxis-card-quiet)",
                  marginTop: "var(--space-sm)",
                }}
              >
                {submitted}
              </div>
            )
          }
        />
      </div>
    </div>
  );
}

export default WowPraxisCard;
