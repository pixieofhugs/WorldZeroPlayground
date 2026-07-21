import { Link } from "react-router-dom";
import type { TaskOut } from "../../api/tasks";
import i18n from "../../i18n";
import LevelGem from "../ui/LevelGem";
import { WowSigil } from "./WowSigil";

/**
 * Warriors of Whimsy — THE ROYAL DECREE (kit §04, #899).
 *
 * A quest is ISSUED by decree; proof is RECORDED in the chronicle. That split is
 * deliberate (ADR-0050 / #899): this card and `WowPraxisCard` share one palette —
 * cream parchment, gold frame, plum ink, MedievalSharp — and nothing else. #785's
 * "the praxis card mirrors the task card" clause is retired for WOW, so do not
 * reconcile the two chromes.
 *
 * The decree hangs from a knobbed rod, is headed by a gold/plum checker band, is
 * sealed with the crest (`WowSigil`, #897 — drawn once, imported everywhere) and
 * is signed off with the gilt "Take Up the Quest" button whose glisten travels
 * behind `.wow-btn`.
 *
 * WHAT THE KIT DRAWS THAT THIS DOES NOT, and why:
 *
 *  • the DECKLED SIDES, the TORN RAGGED HEM and the three RULING LINES. All
 *    three live in the expanded reference's single 360x540 `<path>`, keyed to a
 *    fixed card height. A task card's height is set by its title and blurb, so
 *    stretching that path distorts the rag into a wobble and slides the rules
 *    off the text they rule. The kit's own compact task card — the canonical
 *    one — is a plain bordered sheet for exactly this reason, and UX principle 1
 *    (responsive over pixel-perfect) settles it;
 *  • the SECOND SEAL swinging from a ribbon below the hem. The crest is already
 *    the header's wax seal; drawing it twice on one card spends the mark twice
 *    (§6, "a mark spent as decoration stops meaning anything"). It is set at
 *    62px so the Pig-Latin motto still renders — `WowSigil` drops its lettering
 *    below 56px, which is where the ribbon seal's 48px would have landed;
 *  • the "⚔ Rank III · solo · lvl 3" meta line. The level is the one game-wide
 *    fact that never takes a faction shape (§6), so it renders as the shared
 *    `LevelGem`, tinted; the ⚔ survives beside it as ornament.
 *
 * Both themes come from the `[data-theme="dark"]` cascade — the rod tarnishes,
 * the parchment darkens, the struck-metal seal does not repaint.
 */

interface Props {
  task: TaskOut;
  displayPoints: number;
  onSignup?: (id: number) => void;
}

/** The gold/plum checker band that heads every decree. 11px per square. */
const CHECKER =
  "repeating-linear-gradient(90deg, var(--faction-wow-chronicle-gold) 0 11px, var(--faction-wow-card-accent) 11px 22px)";

/** The rod's turned-wood/gilt barrel, shared by the bar and both end knobs. */
const ROD_FILL =
  "linear-gradient(180deg, var(--faction-wow-rod-lit), var(--faction-wow-rod-deep))";

/**
 * The knobbed rod the decree hangs from. Built in CSS rather than lifted from
 * the reference SVG: the rod must span whatever width the card lands on, and a
 * `preserveAspectRatio="none"` stretch would fatten the knobs with it.
 */
function DecreeRod() {
  const knob = {
    position: "absolute" as const,
    top: 0,
    width: 24,
    height: 30,
    borderRadius: "50%",
    background: ROD_FILL,
    border: "2px solid var(--faction-wow-rod-edge)",
    boxSizing: "border-box" as const,
  };
  return (
    <div aria-hidden style={{ position: "relative", height: 30 }}>
      <div
        style={{
          position: "absolute",
          insetBlock: 0,
          left: 12,
          right: 12,
          borderRadius: 15,
          background: ROD_FILL,
          border: "2px solid var(--faction-wow-rod-edge)",
          boxSizing: "border-box",
        }}
      />
      <div style={{ ...knob, left: 0 }} />
      <div style={{ ...knob, right: 0 }} />
    </div>
  );
}

export default function WowTaskCard({ task, displayPoints, onSignup }: Props) {
  return (
    <div
      style={{
        minWidth: 264,
        maxWidth: 348,
        flex: "0 1 320px",
        fontFamily: "var(--faction-wow-body-font)",
      }}
    >
      <DecreeRod />

      <article
        style={{
          borderRadius: 10,
          overflow: "hidden",
          background: "var(--faction-wow-chronicle-bg)",
          color: "var(--faction-wow-card-text)",
          border: "2px solid var(--faction-wow-chronicle-border)",
          boxShadow: "0 12px 30px -16px var(--faction-wow-chronicle-shadow)",
          transition: "background 150ms, color 150ms",
        }}
      >
        {/* the checker band — the decree's running head, carrying no text */}
        <div aria-hidden style={{ height: 9, background: CHECKER }} />

        <div style={{ padding: "var(--space-lg) var(--space-xl) var(--space-xl)" }}>
          {/* seal · issuing authority · the reward */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-md)",
              marginBottom: "var(--space-md)",
            }}
          >
            <span aria-hidden style={{ flex: "0 0 auto" }}>
              <WowSigil size={62} />
            </span>

            <div style={{ minWidth: 0 }}>
              <div
                className="eyebrow"
                style={{
                  fontFamily: "var(--faction-wow-card-font)",
                  letterSpacing: "0.14em",
                  color: "var(--faction-wow-card-accent)",
                }}
              >
                {i18n.t("feed:taskCard.wow.decree")}
              </div>
              <div
                style={{
                  fontStyle: "italic",
                  fontSize: "var(--text-lg)",
                  lineHeight: 1.35,
                  color: "var(--faction-wow-card-muted)",
                }}
              >
                {i18n.t("feed:taskCard.wow.byOrder")}{" "}
                <span
                  className="wow-tw"
                  aria-hidden
                  style={{ color: "var(--faction-wow-stamp-total)" }}
                >
                  ✦
                </span>
              </div>
            </div>

            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div
                className="content-title"
                style={{
                  fontFamily: "var(--faction-wow-card-font)",
                  lineHeight: 0.95,
                  color: "var(--faction-wow-stamp-total)",
                }}
              >
                {displayPoints}
              </div>
              <div
                className="eyebrow"
                style={{
                  letterSpacing: "0.16em",
                  color: "var(--faction-wow-card-muted)",
                }}
              >
                {i18n.t("feed:taskCard.wow.pointsUnit")}
              </div>
            </div>
          </div>

          <Link to={`/tasks/${task.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <h3
              className="content-title"
              style={{
                fontFamily: "var(--faction-wow-card-font)",
                lineHeight: 1.12,
                margin: "0 0 var(--space-sm)",
                color: "var(--faction-wow-card-text)",
                overflowWrap: "anywhere",
              }}
            >
              {task.title}
            </h3>
          </Link>

          {task.description && (
            <p
              className="card-description"
              style={{
                fontStyle: "italic",
                lineHeight: 1.55,
                color: "var(--faction-wow-card-muted)",
                margin: "0 0 var(--space-lg)",
              }}
            >
              {task.description}
            </p>
          )}

          {/* the illuminated rule: gold, through plum, back to gold */}
          <div
            aria-hidden
            style={{
              height: 2,
              opacity: 0.85,
              background:
                "linear-gradient(90deg, transparent, var(--faction-wow-chronicle-gold) 20%, var(--faction-wow-card-accent) 50%, var(--faction-wow-chronicle-gold) 80%, transparent)",
            }}
          />

          <div
            className="card-footer"
            style={{ border: "none", paddingTop: "var(--space-md)" }}
          >
            <LevelGem level={task.level_required} factionSlug="wow" />
            <span
              aria-hidden
              style={{
                fontFamily: "var(--faction-wow-card-font)",
                fontSize: "var(--text-xl)",
                color: "var(--faction-wow-card-accent)",
              }}
            >
              ⚔
            </span>
          </div>

          {onSignup && (
            <button
              className="wow-btn"
              onClick={() => onSignup(task.id)}
              style={{
                width: "100%",
                marginTop: "var(--space-lg)",
                cursor: "pointer",
                fontFamily: "var(--faction-wow-card-font)",
                fontSize: "var(--text-xl)",
                letterSpacing: "0.06em",
                color: "var(--faction-wow-quest-text)",
                background:
                  "linear-gradient(180deg, var(--faction-wow-quest-from) 0%, var(--faction-wow-quest-mid) 45%, var(--faction-wow-quest-to) 100%)",
                border: "2px solid var(--faction-wow-quest-border)",
                borderRadius: 7,
                padding: "var(--space-md) var(--space-lg)",
                boxShadow:
                  "inset 0 1px 0 var(--faction-wow-quest-sheen), 0 2px 4px var(--faction-wow-stamp-shadow)",
              }}
            >
              {i18n.t("feed:taskCard.wow.signup")}
            </button>
          )}
        </div>
      </article>
    </div>
  );
}
