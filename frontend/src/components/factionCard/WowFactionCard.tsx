import type { FactionCardProps } from "./FactionCard";
import i18n from "../../i18n";
import { factionName, factionDescription } from "../../utils/factions";
import { BalloonBunch, Bunting, Zig } from "../factionMarks/wowOrnament";
import { WowSigil } from "../sigil/WowSigil";

/**
 * Warriors of Whimsy — THE MUSTER BILL, the faction PREVIEW card.
 *
 * The LAST of #951's four missing desktop surfaces, and the one that closes it.
 * Until this file WOW's directory card was `DefaultFactionCard`: a hairline box
 * in the house body face, with the faction's spine gold used as an INK for the
 * name — 1.96:1 on the page, which #1932 measured and which is the whole reason
 * a gold-clad faction may not be drawn in gold.
 *
 * DERIVED, not drawn — there is no sheet for this surface, and the owner ruled
 * (2026-08-16) to derive it rather than wait for one, exactly as #1611 derived
 * `WowFactionBody`. Three sources, all already in the repo:
 *
 *   • the ORNAMENTS from `components/factionMarks/wowOrnament.tsx` (§6/#849) —
 *     the bunting, the wavy gold→plum rule and the googly balloons, none of
 *     them redrawn here;
 *   • the CHROME from the decree task card (#899/#1023). The kit calls the
 *     decree "the archetype the others mirror" and the comment voice and the
 *     feed frame already follow it, so a fourth WOW card takes the same
 *     gold-framed parchment, MedievalSharp display and Lora quiet register
 *     rather than inventing a chrome ADR-0050 would then have to referee;
 *   • the CONTENT SLOTS from the six cards that already exist — standing,
 *     name, truncated description, invitation — because that is what this
 *     surface is for and `factionCardDispatch.test.tsx` pins two of the four.
 *
 * WHY BUNTING AND NOT THE BARBER RIBBON. Both are WOW's, and the difference is
 * what keeps three cards apart at a glance: the decree wears the gold/plum
 * ribbon, the select-card placard wears the gilt checker rail, and the bill is
 * strung with pennants — the Court posting a notice for a fête. Same three
 * devices, three heads, one faction. (ADR-0050's rule is that the decree and the
 * chronicle are DELIBERATELY unalike; the bill is neither, so it borrows the
 * decree's frame and takes its own head.)
 *
 * NOT ONE NEW COPY KEY. #1909's audit ruled this surface's words generic and
 * deleted every per-faction string on it — Everymen's kicker, motto and
 * checklist, Snide's subtitle, the Ephemerists' eyebrow, Singularity's protocol
 * line. The four slots left are shared: `factionCard.status.*`,
 * `factionCard.newInvitation`, and the name and description the catalog resolves
 * by slug (ADR-0038). WOW speaks here in dress alone (ADR-0057), which is also
 * the reason nothing on this card is in Pig Latin.
 *
 * NO NEW TOKENS AND NO NEW CSS. Every colour is a shipped `--faction-wow-*` from
 * #1023/#1037, and the two motion classes the ornaments carry
 * (`.wow-balloon-bunch`, `.wow-balloon-eye`) are already gated on
 * `prefers-reduced-motion: no-preference` in `index.css`.
 *
 * WHY ITS OWN FILE, when five of the six siblings live inside `FactionCard.tsx`:
 * that module is one chunk for all five, so putting WOW's ornament vocabulary
 * and its sigil in there would post those bytes to every reader of a Coven,
 * Snide, UA, Ephemerists or Singularity card. `EverymenFactionCard.tsx` is the
 * precedent and the same argument.
 *
 * THE TWO SHARED HELPERS ARE NOT REUSED, AND THE REASON IS THAT A SPINE HUE IS
 * A FILL, not that this one is unreadable. `StatusBadge` and `InvitationNote`
 * both paint text in `factionCssVar(slug)` — the faction's SPINE hue, which is a
 * fill and not an ink. When this card was built that hue was `#e0a800` and
 * measured **1.96:1** on the cream, a light-only defect (dark reached 11.19:1)
 * that the card would have inherited on two of its four states. #2068 made the
 * spine a plum, so the same call now reads 5.79:1 light / 5.23:1 dark and would
 * clear AA — the original arithmetic is gone, and the rule it was an instance of
 * is not. A spine hue answers to the rainbow, moves by owner ruling (it just
 * did), and no test pairs it against this cream: `factionContrast.test.ts` has
 * no `--faction-wow`-as-ink row, only `-card-accent`. Both helpers are therefore
 * still redrawn here on `--faction-wow-plum-surface` / `-on-plum` at
 * **5.16:1**, theme-invariant and measured, and both say the SAME shared words — the
 * `factionCard.status.*` set and `factionCard.newInvitation` — so nothing is
 * gained or lost but the paint. Everymen drew its own ribbon for the same
 * reason; the gap is noted in place on the branch it lives in.
 *
 * ONE PLATE FOR ALL FOUR STANDINGS, where the house badge inks each state
 * differently (success green, warning amber, muted, faction hue). The words are
 * already self-describing — MEMBER, INVITED, BURNED, WELCOME BACK — so the
 * colour was redundant reinforcement, and a bill endorses with one stamp. It
 * also means there is exactly one measured pair on this card instead of four
 * that each have to clear the parchment separately.
 *
 * ponytail: the card carries no member count, no charter and no join control.
 * That is the surface's contract, not a shortcut — every membership action
 * lives on the faction detail page (#347), and the muster page (#1611) is where
 * the charter and the enlist rail are. Upgrade path: if a sheet is ever drawn
 * for this card, restyle in place; the four slots are the final ones.
 */

const MED = "var(--faction-wow-card-font)"; /* MedievalSharp */
const LORA = "var(--faction-wow-body-font)"; /* Lora */

const CARD = "var(--faction-wow-card-bg)";
const INK = "var(--faction-wow-card-text)";
const MUTED = "var(--faction-wow-card-muted)";
/** Frame + rule gold. Theme-invariant, and never an ink: 2.24:1 on the cream. */
const GOLD = "var(--faction-wow-chronicle-gold)";
const PLUM_SURFACE = "var(--faction-wow-plum-surface)";
const ON_PLUM = "var(--faction-wow-on-plum)";

/** Where the blurb stops. The five siblings that truncate stop at 100–110; this
 *  is the low end because `.card-description` clamps to three lines anyway and
 *  a bill that overflows its own paper is a worse joke than a short one. */
const BLURB_LIMIT = 100;

/**
 * The reader's standing with the Court, struck on a plum plate.
 *
 * The status→word mapping is the shared one, aliases and all: `defected` reads
 * as burned and `can_return` as welcome-back, because those are the same two
 * states the API spells two ways. Keys are written out in full rather than
 * built from `status`, so an i18n sweep can still find them.
 */
function Standing({ status }: { status: string }) {
  let label: string | null = null;
  if (status === "member") label = i18n.t("feed:factionCard.status.member");
  else if (status === "invited") label = i18n.t("feed:factionCard.status.invited");
  else if (status === "burned" || status === "defected") label = i18n.t("feed:factionCard.status.burned");
  else if (status === "welcome_back" || status === "can_return") label = i18n.t("feed:factionCard.status.welcomeBack");
  if (!label) return null;

  return (
    <span
      className="label-caption"
      style={{
        flex: "0 0 auto",
        background: PLUM_SURFACE,
        color: ON_PLUM,
        fontFamily: MED,
        letterSpacing: "0.08em",
        border: `1px solid ${GOLD}`,
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-xs) var(--space-sm)",
      }}
    >
      {label}
    </span>
  );
}

export default function WowCard({ faction, status, invitationNote }: FactionCardProps) {
  const full = factionDescription(faction.slug);
  const blurb = full.slice(0, BLURB_LIMIT) + (full.length > BLURB_LIMIT ? "…" : "");

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        background: CARD,
        color: INK,
        fontFamily: LORA,
        border: `2px solid ${GOLD}`,
        borderRadius: "var(--radius-xl)",
        boxShadow: "0 18px 40px -22px var(--faction-wow-chronicle-shadow)",
        transition: "background 150ms, color 150ms",
      }}
    >
      {/* The pennants, strung across the head of the bill. */}
      <Bunting />

      {/* The struck summons strip. Drawn ONLY for an invitation — with none
          there is nothing for it to say, so nothing is posted (Everymen's
          ribbon makes the same choice). The generic key takes no variable, so
          the note is appended rather than interpolated. */}
      {invitationNote && (
        <div
          className="label-caption"
          style={{
            background: PLUM_SURFACE,
            color: ON_PLUM,
            fontFamily: MED,
            letterSpacing: "0.14em",
            textAlign: "center",
            padding: "var(--space-xs) var(--space-sm)",
          }}
        >
          {i18n.t("feed:factionCard.newInvitation")} · {invitationNote}
        </div>
      )}

      <div style={{ padding: "var(--space-lg) var(--space-lg) var(--space-md)" }}>
        {/* Letterhead: the Court's mark on the left, the reader's standing on
            the right. The name gets its own line below — at a directory
            column's width three things do not share a row. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-sm)",
            marginBottom: "var(--space-sm)",
          }}
        >
          {/* The googly crown, plum on the parchment — the mark every WOW
              surface mounts, at the size the letterhead of a card wants. */}
          <WowSigil size={30} />
          <Standing status={status} />
        </div>

        <div
          style={{
            fontFamily: MED,
            fontSize: "var(--text-title)",
            lineHeight: 1.15,
            color: INK,
          }}
        >
          {factionName(faction.slug)}
        </div>

        <Zig id="faction-card" style={{ margin: "var(--space-sm) 0 var(--space-md)" }} />

        {/* The blurb and the bunch share a row rather than the bunch floating
            over the corner: a 300px column has no corner to spare, and a flex
            row cannot drop balloons on top of a word. */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-sm)" }}>
          {blurb && (
            <div
              className="card-description"
              style={{ flex: 1, minWidth: 0, fontStyle: "italic", color: MUTED, marginBottom: 0 }}
            >
              {blurb}
            </div>
          )}
          {/* Still, not bobbing: the ornament module's own rule for a bunch
              tucked into a card that may be one of forty in a grid. */}
          <BalloonBunch size={34} bob={false} style={{ transform: "rotate(-6deg)" }} />
        </div>
      </div>
    </div>
  );
}
