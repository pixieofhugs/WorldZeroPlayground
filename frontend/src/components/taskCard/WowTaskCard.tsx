import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { WowBand } from "../cardMasthead/factionBands";
import { CARD_CTA } from "./cardCta";
import { CardCtaControl } from "./CardCtaControl";
import { taskCardSignupCta } from "./signupAffordance";
import i18n from "../../i18n";
import { factionRoleVars } from "../../utils/factionRoles";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import { BalloonBunch, Bunting, Zig } from "../factionMarks/wowOrnament";

/**
 * Warriors of Whimsy — THE QUEST DECREE (task card v2, #1023).
 *
 * A gold-framed parchment decree under a gold/plum barber ribbon: the level and
 * a crowned points plaque lead, wavy gold→plum rules divide the sections, a
 * sword-and-shield marks the muster, and a bundle of googly balloons is tucked
 * into the bottom corner at a jaunty four degrees. MedievalSharp carries the
 * display; Lora italic carries the quiet register.
 *
 * This replaces "The Royal Decree" (ADR-0055 / ADR-0056) — the same instrument,
 * redrawn. The knobbed rod and the crest seal are gone; the checker band
 * survives as the ribbon, and the decree/chronicle split with `WowPraxisCard`
 * survives with it. A quest is ISSUED, proof is RECORDED; do not reconcile the
 * two chromes (ADR-0050, #899).
 *
 * NOT THE COVEN CARD. The vendored design's header reads "Warrior of Whimsy
 * (Cozy Coven)"; that parenthetical is a stale label of exactly the kind
 * ADR-0050 records, and following one once already gave the chronicle to Coven
 * and invented a yellow skin for WOW out of its spine hue. Gold, plum,
 * MedievalSharp, sword-and-shield and balloons are WOW's. Coven is wave A's
 * pink spell slip.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0056): `useFormFactor` picks the size set.
 * There is no mobile twin — this file serves both form factors. The balloons sit
 * in the sign-up row (#2032), which both form factors have, rather than in a
 * corner a 340px card does not have, so the size set does not fork over them.
 *
 * THE ORNAMENT PASS (#2032, task cards v3 phase 2). Four changes, all of them
 * dress on anatomy #2029 and #2030 already fixed:
 *
 *  - THE WORDMARK AND THE MARK GO GOLD, and it is one token for both — the
 *    issue's "the header sigil takes the gold of the wordmark". This also
 *    settles a live phase-1 defect: the mark shipped in
 *    `--faction-wow-stamp-total`, which is #8a5a16 in LIGHT against the
 *    theme-invariant plum band, i.e. **1.08:1** — invisible by day. The
 *    replacement `--faction-wow-gilt-mid` (#e7b94e) is itself theme-invariant
 *    and measures 3.47:1 on that plum, clearing both the AA-large floor the
 *    24px wordmark needs and the 1.4.11 floor the mark needs.
 *  - THE MARK SITS NEAR THE CARD'S EDGE. The band takes a horizontal inset well
 *    inside the kit's default, so the sigil reads as standing on the card's own
 *    gold frame rather than inside the band's type block. #2032 zeroed the inset
 *    outright and #2070 walked it back to `--space-sm`, because flush against a
 *    2px frame reads as touching it. What both agree on is that the inset is
 *    SYMMETRIC: #2029 centres the title on the band's content box, so clearance
 *    on the left alone shifts the wordmark half an inset off the CARD's
 *    centreline.
 *  - THE BAND REGAINS A BOTTOM RULE, in gold. Phase 1 dropped it because the
 *    design drew it in `--faction-wow-card-accent`, which in light IS the band's
 *    own ground to the hex; drawn in the gilt it is a real line, and it is the
 *    string the bunting hangs from.
 *  - BUNTING FOR THE BARBER RIBBON. The 6px gold/plum stripe is the ≤8px
 *    gradient strip the design hides in favour of the pennant run. `Bunting` is
 *    WOW's shipped pennant primitive (§6: one device, never redrawn per
 *    surface), so the swap adds no geometry and no CSS.
 *  - THE BALLOONS BECOME KNIGHTS FLANKING THE SIGN-UP. Flex SIBLINGS of the
 *    button, never absolute over it: the pair is decorative and carries no hit
 *    box, and siblings-with-gap cannot overlap the 44px target at any width.
 *
 * THE DESIGN'S `ctaGold` A/B PROP IS NOT SHIPPED. It is canvas experimentation
 * rather than part of {@link CardProps}, and the choice it offers is already
 * made: gold measures 2.24:1 on the cream, so nothing legible is ever painted on
 * it (§3). The CTA is plum, on the theme-invariant `--faction-wow-plum-surface`
 * (5.16:1 both themes) rather than the design's dark #8a5aae, which index.css
 * had already measured at 4.10:1 and rejected.
 *
 * The design's one remaining ternary — a four-colour `em` map for the emblem,
 * picked on `theme === 'dark'` — is what a ternary in a skin always is: a token
 * that had not been declared yet. Three of its four roles resolved onto shipped
 * tokens and the fourth became `--faction-wow-quest-blade`.
 */

/**
 * THE FOUR CORE ROLES ARE ASKED FOR BY NAME (#2674). The `<article>` below
 * spreads `factionRoleVars('wow', 'wow-task-card')`, so these four are declared
 * on the decree's own sheet and read nowhere else — the prefix belongs to this
 * SURFACE, not to the app, because a shared namespace on a page wrapper would
 * repaint every descendant including a card of another faction.
 *
 * Every read carries today's token as its fallback, so a decree renders
 * byte-identically whether or not the vars are declared. That is what keeps
 * `WowBand` — the shared cross-faction masthead, carved out of every lane —
 * unaffected while it sits inside this root.
 */
const MED = "var(--wow-task-card-face)"; /* MedievalSharp */
const LORA = "var(--faction-wow-body-font)"; /* Lora */

const INK = "var(--wow-task-card-ink)";
const MUTED = "var(--wow-task-card-quiet)";
const PLUM = "var(--wow-task-card-accent)";
const GOLD = "var(--faction-wow-chronicle-gold)";
const PLUM_SURFACE = "var(--faction-wow-plum-surface)";
const GILT = "var(--faction-wow-stamp-total)";

interface SizeSet {
  /** Card width. Geometry, so a raw px number (WORLD_ZERO_STYLE §4a). */
  cardWidth: number;
  pad: string;
  titleSize: string;
  levelSize: string;
  pointsSize: string;
  /** Minimum width of the crowned plaque. Geometry. */
  plaque: number;
}

/**
 * A balloon knight's drawn width; the bunch is 1.25x as tall, so 32 stands 40
 * high against a 44px button. Geometry (§4a), and ONE number for both form
 * factors — the narrower card's sign-up row still has ~180px of slack with the
 * pair in it, so there is nothing for a size fork to fix.
 */
const KNIGHT = 32;

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    pad: "var(--space-lg) var(--space-xl) var(--space-xl)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-heading)",
    pointsSize: "var(--text-heading)",
    plaque: 112,
  },
  mobile: {
    cardWidth: 340,
    pad: "var(--space-lg)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-title)",
    pointsSize: "var(--text-title)",
    plaque: 100,
  },
};

/* The decree's label voice (MedievalSharp small caps in plum) lived here. Its one
   reader was the eyebrow carrying the uniform "Task {id}" ordinal, which #1124
   retired, so the voice went with it. */

/** The sword-and-shield that marks the muster. */
function SwordAndShield({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
      <path
        d="M4,5 H16 V11 Q16,16 10,18.5 Q4,16 4,11 Z"
        fill={PLUM_SURFACE}
        stroke={GILT}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <g stroke="var(--faction-wow-quest-blade)" strokeWidth="1.8" strokeLinecap="round">
        <line x1="3.5" y1="16.8" x2="16.5" y2="3.6" />
        <line x1="16.5" y1="16.8" x2="3.5" y2="3.6" />
      </g>
      <g stroke={GILT} strokeWidth="1.4" strokeLinecap="round">
        <line x1="2.5" y1="13.5" x2="6.5" y2="16.5" />
        <line x1="17.5" y1="13.5" x2="13.5" y2="16.5" />
      </g>
      <g fill={GILT}>
        <circle cx="3.2" cy="17.3" r="1.1" />
        <circle cx="16.8" cy="17.3" r="1.1" />
      </g>
    </svg>
  );
}

export default function WowTaskCard({
  task,
  basePoints,
  multiplier,
  inProgressCount,
  onSignup,
}: CardProps) {
  const formFactor = useFormFactor();
  const size = SIZES[formFactor];
  const cta = taskCardSignupCta(task, onSignup);
  const showMultiplier = !isNeutralMultiplier(multiplier);

  return (
    <div
      data-form-factor={formFactor}
      style={{ width: size.cardWidth, maxWidth: "100%", boxSizing: "border-box" }}
    >
      <article
        style={{
          ...factionRoleVars("wow", "wow-task-card"),
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          width: "100%",
          background: "var(--wow-task-card-paper)",
          border: `2px solid ${GOLD}`,
          // The decree's shape, said once (#2361/#2403).
          borderRadius: "var(--wow-task-card-radius)",
          boxShadow: "var(--faction-wow-quest-shadow)",
          color: INK,
        }}
      >
        {/* THE DECREE'S MASTHEAD — the plum banner, mounted from the shared
            band (#2185) so the WOW praxis card wears the identical one. Its
            paint, and the #2032/#2070 inset rulings behind it, live at
            `cardMasthead/factionBands`. */}
        <WowBand />

        {/* The pennants, strung under the band (#2032) where the 6px barber
            ribbon used to run — the design's own swap. `Bunting` is WOW's one
            pennant device (§6), already strung across the muster bill and the
            chronicle entry, so this is the same run at the same density and
            costs no new geometry. */}
        <Bunting />

        <div style={{ padding: size.pad }}>
          {/* Everything but the CTA reads the full call — a card-sized target
              that stays valid HTML (no <button> nested in an <a>). */}
          <Link to={`/tasks/${task.id}`} data-card-link="" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            {/* The decree-lettered eyebrow held the uniform "Task {id}" ordinal and
              nothing else, so #1124's retirement of the id takes the line with
              it. The masthead and its ribbon are the card's top note now. */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
              <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
                <span
                  style={{
                    fontFamily: LORA,
                    fontStyle: "italic",
                    fontSize: "var(--text-md)",
                    color: MUTED,
                    marginBottom: "var(--space-xs)",
                  }}
                >
                  {i18n.t("feed:taskCard.levelCaption")}
                </span>
                <span style={{ fontFamily: MED, fontSize: size.levelSize, lineHeight: 0.85 }}>
                  {task.level_required}
                </span>
              </div>

              <Zig id="hero" style={{ flex: 1, minWidth: 0 }} />

              {/* The faction modifier — hidden at ×1.00, so invisible under
                  era_1's neutralized modifiers and automatic the day one moves
                  (ADR-0055). */}
              {showMultiplier && (
                <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                  <span
                    style={{
                      fontFamily: MED,
                      fontSize: "var(--text-lg)",
                      color: "var(--faction-wow-on-plum)",
                      background: PLUM_SURFACE,
                      borderRadius: 4,
                      padding: "var(--space-xs) var(--space-sm)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                  </span>
                  <span style={{ fontFamily: LORA, fontStyle: "italic", fontSize: "var(--text-lg)", color: MUTED }}>
                    {i18n.t("feed:taskCard.modifierCaption")}
                  </span>
                </div>
              )}

              {/* The crowned points plaque, struck two degrees off true. */}
              <div
                style={{
                  position: "relative",
                  flex: "0 0 auto",
                  minWidth: size.plaque,
                  transform: "rotate(-2deg)",
                  background: "var(--faction-wow-chronicle-panel)",
                  border: `2px solid ${GOLD}`,
                  borderRadius: 6,
                  boxShadow: "0 2px 3px var(--faction-wow-stamp-shadow)",
                  padding: "var(--space-sm) var(--space-md)",
                  textAlign: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "var(--space-xs)" }}>
                  <span
                    style={{
                      fontFamily: MED,
                      fontSize: size.pointsSize,
                      lineHeight: 0.8,
                      color: GILT,
                      display: "inline-block",
                    }}
                  >
                    {basePoints}
                  </span>
                  {/* The gold ✦ that trailed the numeral is gone (#2070): it is
                      not in the design and the owner ruled it out. The row stays
                      a baseline flex line with one child — in block flow the
                      parent's line-height strut would add height the plaque was
                      not drawn with. */}
                </div>
                <div style={{ fontFamily: LORA, fontStyle: "italic", fontSize: "var(--text-md)", color: PLUM, marginTop: "var(--space-xs)" }}>
                  {i18n.t("feed:taskCard.pointsUnit", { count: basePoints })}
                </div>
              </div>
            </div>

            <h2
              style={{
                fontFamily: MED,
                fontWeight: 400,
                fontSize: size.titleSize,
                lineHeight: 1.1,
                margin: "0 0 var(--space-sm)",
                overflowWrap: "anywhere",
              }}
            >
              {task.title}
            </h2>

            {task.description && (
              <p
                className="card-description"
                style={{
                  fontFamily: LORA,
                  fontStyle: "italic",
                  lineHeight: 1.5,
                  color: MUTED,
                  margin: "0 0 var(--space-md)",
                }}
              >
                {task.description}
              </p>
            )}

            <Zig id="mid" style={{ margin: "0 0 var(--space-md)" }} />

            {inProgressCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <SwordAndShield size={18} />
                <span style={{ fontFamily: LORA, fontStyle: "italic", fontSize: "var(--text-xl)", color: MUTED }}>
                  {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
                </span>
              </div>
            )}
          </Link>

          {cta && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                gap: "var(--space-md)",
                marginTop: "var(--space-lg)",
              }}
            >
              {/* THE BALLOON KNIGHTS (#2032). Two bunches keeping the muster,
                  one either side of the call. FLEX SIBLINGS with a gap, never
                  absolutely positioned over the button: they are `aria-hidden`
                  ornament with no hit box of their own, and a sibling cannot
                  land on the 44px target at any card width — which is the
                  overlap `docs/agents/design-fidelity.md` records going wrong
                  on a plate drawn for smaller marks.

                  Still, not bobbing, for the same reason the corner bunch was:
                  a flex-wrap grid of forty cards is not a place to run eighty
                  infinite animations. The googly eyes still wiggle, on the
                  faction's reduced-motion-gated `.wow-balloon-eye`. */}
              <BalloonBunch size={KNIGHT} bob={false} style={{ transform: "rotate(-6deg)" }} />
              <CardCtaControl
                cta={cta}
                style={{
                  ...CARD_CTA,
                  cursor: cta.denied ? "not-allowed" : "pointer",
                  fontFamily: MED,
                  fontSize: "var(--text-content)",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  padding: "var(--space-sm) var(--space-xl)",
                  borderRadius: 7,
                  color: "var(--faction-wow-on-plum)",
                  background: PLUM_SURFACE,
                  border: `2px solid ${PLUM_SURFACE}`,
                }}
              >
                {cta.label}
              </CardCtaControl>
              {/* The second knight, mirrored so the pair faces the call. */}
              <BalloonBunch size={KNIGHT} bob={false} style={{ transform: "rotate(-6deg) scaleX(-1)" }} />
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
