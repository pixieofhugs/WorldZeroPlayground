import type { CSSProperties } from "react";
import { factionRoleVars } from "../../../utils/factionRoles";
import { WowBand } from "../../cardMasthead/factionBands";
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
 *    eyebrow LINE it replaced sat inside the text column ("CHRONICLE OF PROOF ·
 *    № 663"). The stripe stays; what sits above it now is the faction's own
 *    band (see below), which is a different thing in the same place.
 *  • the PLUM FRAME. `ChronicleTheme` carried a single `accent` doing duty as
 *    border AND rule AND ink tint, so the card bound itself in plum and the
 *    design's gold frame never shipped (#860 ask 2). The border is its own token
 *    now and the two colours can differ, which is the whole look: gold edge,
 *    plum ink;
 *  • the shared ChroniclePraxisCard itself. It existed only because Coven was
 *    wearing WOW's frame; with Coven on its own sticker, one indirection for one
 *    caller was just a place for the two palettes to meet again.
 *
 * IT WEARS THE DECREE'S BANNER NOW (#2185). The praxis card had no masthead at
 * all: #1909 removed the praxis-card masthead on the judgement that a card
 * answering a task does not need a band. THE OWNER HAS SINCE DECIDED IT DOES,
 * and this card wears the same plum-and-gilt banner `WowTaskCard` wears. Nothing
 * about #1909 was wrong at the time — the decision changed, and #2185 is the
 * record. Do not restore the old rationale beside the band it argues against.
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
        // THE ROLE MAP (#2674). `--wow-praxis-card-*` is declared here, on the
        // chronicle's own sheet, and read nowhere else: the prefix belongs to
        // this SURFACE, not to the app. Every read below carries today's token
        // as its fallback, which is what leaves `WowBand` — the shared
        // cross-faction masthead, carved out of every lane — untouched inside
        // this root, and the shared `PraxisBody` it hands values to unaware
        // that anything moved.
        ...factionRoleVars("wow", "wow-praxis-card"),
        // The chronicle parchment's shape, said once (#2361/#2403).
        borderRadius: "var(--wow-praxis-card-radius, var(--faction-wow-card-radius))",
        position: "relative",
        overflow: "hidden",
        background: "var(--faction-wow-chronicle-bg)",
        color: "var(--wow-praxis-card-ink, var(--faction-wow-card-text))",
        border: "2px solid var(--faction-wow-chronicle-border)",
        boxShadow: "0 6px 22px -10px var(--faction-wow-chronicle-shadow)",
        fontFamily: "var(--faction-wow-body-font)",
        transition: "background 150ms, color 150ms",
      } as CSSProperties}
    >
      {/* THE BANNER (#2185) — the same band `WowTaskCard` wears, mounted from
          `cardMasthead/factionBands` rather than restated, so the chronicle
          and the decree cannot drift apart. */}
      <WowBand />

      {/* The running head: a woven gold/plum stripe. No text — see the note
          above. It survives the band because it is not a masthead: it is the
          chronicle's own woven rule, and on the task card the same place under
          the band is where `Bunting` hangs. */}
      <div
        aria-hidden
        style={{
          height: 6,
          background:
            "repeating-linear-gradient(90deg, var(--faction-wow-chronicle-gold) 0 11px, var(--wow-praxis-card-accent, var(--faction-wow-card-accent)) 11px 22px)",
        }}
      />
      <div style={{ padding: "var(--space-xl)" }}>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint="var(--faction-wow-chronicle-gold)"
          muted="var(--wow-praxis-card-quiet, var(--faction-wow-card-muted))"
          paper="var(--faction-wow-chronicle-bg)"
          titleStyle={{
            fontFamily: "var(--wow-praxis-card-face, var(--faction-wow-card-font))",
            color: "var(--wow-praxis-card-ink, var(--faction-wow-card-text))",
          }}
          showCrown={showCrown}
          // MedievalSharp illuminates, Lora reads — the chronicle's own pair,
          // matching the WOW mobile card (#888).
          fonts={{
            display: "var(--wow-praxis-card-face, var(--faction-wow-card-font))",
            body: "var(--faction-wow-body-font)",
          }}
          mediaEmptyStyle={{
            height: 150,
            borderRadius: 6,
            border: "2px dashed var(--faction-wow-chronicle-gold)",
            background: "transparent",
            color: "var(--wow-praxis-card-quiet, var(--faction-wow-card-muted))",
            textTransform: "none",
            letterSpacing: "0.06em",
            fontSize: "var(--text-content)",
            // The `opacity: 1` that used to sit here cancelled a shared 0.7 the
            // slot no longer carries (#2248) — nothing to cancel, so it goes.
          }}
          footnote={
            submitted && (
              <div
                style={{
                  fontFamily: "var(--faction-wow-body-font)",
                  fontStyle: "italic",
                  fontSize: "var(--text-content)",
                  color: "var(--wow-praxis-card-quiet, var(--faction-wow-card-muted))",
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
