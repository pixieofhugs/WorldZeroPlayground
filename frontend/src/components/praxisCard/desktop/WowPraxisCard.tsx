import type { CSSProperties } from "react";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * Warriors of Whimsy — THE CHRONICLE OF PROOF (#840, ADR-0050).
 *
 * Cream parchment bound in gold, written in plum. Rebuilt off the vendored
 * prototype; what came off the #821/#838 version, and why:
 *
 *  • the GRADIENT RUNNING-HEAD BAND with the masthead set in it. The design's
 *    running head is a 6px gold/plum STRIPE carrying no text at all, and the
 *    masthead is an eyebrow LINE inside the text column ("CHRONICLE OF PROOF ·
 *    № 663"), where it stops at the score stamp instead of running under it.
 *    That band is also what forced #838 to deepen four header stops for
 *    contrast — nothing needs protecting once no text sits on the gold;
 *  • the PLUM FRAME. `ChronicleTheme` carried a single `accent` doing duty as
 *    border AND rule AND ink tint, so the card bound itself in plum and the
 *    design's gold frame never shipped (#860 ask 2). The border is its own token
 *    now and the two colours can differ, which is the whole look: gold edge,
 *    plum ink;
 *  • the shared ChroniclePraxisCard itself. It existed only because Coven was
 *    wearing WOW's frame; with Coven on its own sticker, one indirection for one
 *    caller was just a place for the two palettes to meet again.
 *
 * THE ARCHAIC REGISTER IS GONE (#1909). Four strings fed the shared slots —
 * `card.masthead.wow` ("Chronicle of proof · № {{id}}"), `card.wow.forQuest`
 * ("for the quest —"), `card.wow.illumination` ("❦ here, an illumination ❦") and
 * `card.wow.sealed` ("Sealed by the Court") — and the copy audit CUT all four:
 * every one was a single-faction flourish on a surface it ruled generic. The
 * SLOTS survive; they are simply not filled here any more, and the shared card
 * draws its own. The footnote keeps the submission date, which is data.
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
        borderRadius: 9, // chronicle parchment
        position: "relative",
        overflow: "hidden",
        background: "var(--faction-wow-chronicle-bg)",
        color: "var(--faction-wow-card-text)",
        border: "2px solid var(--faction-wow-chronicle-border)",
        boxShadow: "0 6px 22px -10px var(--faction-wow-chronicle-shadow)",
        fontFamily: "var(--faction-wow-body-font)",
        transition: "background 150ms, color 150ms",
      } as CSSProperties}
    >
      {/* The running head: a woven gold/plum stripe. No text — see the note above. */}
      <div
        aria-hidden
        style={{
          height: 6,
          background:
            "repeating-linear-gradient(90deg, var(--faction-wow-chronicle-gold) 0 11px, var(--faction-wow-card-accent) 11px 22px)",
        }}
      />
      <div style={{ padding: "var(--space-xl)" }}>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint="var(--faction-wow-chronicle-gold)"
          muted="var(--faction-wow-card-muted)"
          paper="var(--faction-wow-chronicle-bg)"
          titleStyle={{
            fontFamily: "var(--faction-wow-card-font)",
            color: "var(--faction-wow-card-text)",
          }}
          showCrown={showCrown}
          // MedievalSharp illuminates, Lora reads — the chronicle's own pair,
          // matching the WOW mobile card (#888).
          fonts={{
            display: "var(--faction-wow-card-font)",
            body: "var(--faction-wow-body-font)",
          }}
          mediaEmptyStyle={{
            height: 150,
            borderRadius: 6,
            border: "2px dashed var(--faction-wow-chronicle-gold)",
            background: "transparent",
            color: "var(--faction-wow-card-muted)",
            textTransform: "none",
            letterSpacing: "0.06em",
            fontSize: "var(--text-content)",
            opacity: 1,
          }}
          footnote={
            submitted && (
              <div
                style={{
                  fontFamily: "var(--faction-wow-body-font)",
                  fontStyle: "italic",
                  fontSize: "var(--text-content)",
                  color: "var(--faction-wow-card-muted)",
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
