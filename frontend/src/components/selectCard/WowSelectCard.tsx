import i18n from "../../i18n";
import { factionRoleVars } from "../../utils/factionRoles";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { WowSigil } from "../sigil/WowSigil";

/**
 * WOW pledge card — the Court's recruiting placard (kit §13, #900).
 *
 * A gold-framed cream card under a checker rail of gold and plum: the crest, the
 * name in MedievalSharp, the Pig-Latin tagline in Lora italic, and the plum
 * call. The three tag chips retired with their copy.
 *
 * One file per faction, mirroring `components/taskCard/` (#2328, a child of
 * #2321, following the pattern #2322 set). `FactionSelectCard` keeps only the
 * dispatcher, the shared types and `LEGACY_SLUG`.
 *
 * THIS TILE IS CREAM, not dark. The dispatcher's old docstring asserted "the
 * tiles are dark" as a property of the grid; it is false, and it is what let
 * dark-only registers look correct on a surface that flips. It is not carried
 * into this file.
 *
 * THE `CHOSEN` BANNER + GOLD RING are bound to `state === "member"`, not to a
 * click. The kit's card owns a local `selDone` toggle and flips itself when you
 * press Pledge; on this tile joining is not available at all — the CTA VISITS
 * the faction page, which owns the Join block and its eligibility flags. So the
 * selected dress renders when the viewer already IS one, which is the same
 * information the kit's toggle was standing in for.
 *
 * NO MUSTER FIGURES. The kit's three-up tally (Knights / in Rainbow / Modifier)
 * has no data behind it here — `members` is the only count the tile is handed,
 * and the other two are mock. The member count keeps its social-proof slot on
 * the status line, where every other tile in the directory puts it.
 *
 * ── THE REGISTER IS THE QUEST DECREE'S (#2328) ──────────────────────────────
 *
 * WOW has no forked family — unlike S.N.I.D.E. and the Ephemerists, the ground,
 * the inks and both faces were already the decree's. The defect was eight
 * TOKENS, not a family: a synonym for the frame, a hand-rolled lift, and two
 * plates borrowed from the FACTION PAGE's kit (`--faction-wow-chip-*`,
 * `--faction-wow-gilt-*`, `--faction-wow-avatar-pill-*`) for roles
 * `taskCard/WowTaskCard.tsx` already answers. Every one of those is a live,
 * declared, measured token, so no lint, census or contrast sweep could see it;
 * only "does the tile name a token its task card does not?" can, and
 * `__tests__/wowWearsTheDecreeRegister.test.ts` is that question.
 *
 * What was gathered, role for role:
 *
 *   frame    `--faction-wow-chronicle-border` -> `--faction-wow-chronicle-gold`,
 *            the name the decree spells. The border token is declared
 *            `var(--faction-wow-chronicle-gold)`, so this repaints zero pixels;
 *            it removes a synonym rather than needing one proved. The alias
 *            keeps four other readers and is NOT retired.
 *   lift     a hand-rolled `0 20px 46px -22px --faction-wow-chronicle-shadow`
 *            -> `--faction-wow-quest-shadow`, which is the whole box-shadow the
 *            decree declares (and which the `chosen` gold ring still composes in
 *            front of — `var()` substitutes textually, so a token holding a
 *            shadow LIST is a legal tail of a longer one).
 *   chips    RETIRED with the tag copy; the plaque tokens keep their own
 *            readers.
 *   CTA      a three-stop gilt lozenge (`--faction-wow-avatar-pill-from` /
 *            `-gilt-mid` / `-avatar-pill-to`, ink `-avatar-pill-text`, ring
 *            `-gilt-border`) -> the decree's plum call:
 *            `--faction-wow-on-plum` on `--faction-wow-plum-surface`, framed in
 *            the same plum. The card does not merely decline the gilt button, it
 *            RULES on it: "the design's `ctaGold` A/B prop is not shipped … the
 *            choice it offers is already made" (WowTaskCard). Nothing was
 *            illegible before — 8.98:1 on the gradient's mid stop — which is the
 *            epic's point exactly: a source sweep, never a ratio. The trade is
 *            8.98 -> 5.16:1, theme-invariant, clear of the 4.5:1 an 18px line
 *            owes in both cascades. `-gilt-border`'s only reader was this
 *            button, so it goes too; `-gilt-mid` stays, because `WowBand` letters
 *            the masthead in it.
 *   CTA face raw `16` at 0.05em -> the decree button's own `--text-content` and
 *            0.04em. Faces and tracking are part of a register, and the token is
 *            the card's answer rather than house chrome, so the raw-value
 *            exemption that stood here goes with it (one off the ratchet).
 *
 * WHAT THE TASK CARD HAS NO ANSWER FOR, said rather than invented:
 *
 *   · THE CHECKER RAIL STAYS. #2032 swapped the decree's 6px gold/plum barber
 *     ribbon for `Bunting`, so the card's top note is now the plum `WowBand`
 *     with pennants strung under it. The band is not mounted here for the reason
 *     UA's tile does not mount `UaBand`: it draws `factionName("wow")` and this
 *     tile already carries that wordmark under the crest. Paint gathered, markup
 *     not — and the rail's two colours, `-chronicle-gold` and `-plum-surface`,
 *     are register paint either way.
 *   · NO ORNAMENT IS ADDED. `Zig`, `Bunting` and the balloon knights are the
 *     decree's markup, hung off anatomy (a rule between sections, a sign-up row)
 *     this pitch does not have. None of them is a token this tile names wrongly.
 *   · THE PLATE / SHEET RELATIONSHIP IS TAKEN AS IT SHIPS (#2042 owner ruling,
 *     2026-08-18). The plaque does not sit on the panel, it sits on the
 *     chronicle's cream sheet: plate on sheet is 1.12:1 and the 2px gold frame
 *     2.24:1, and that is the accepted card pairing. Deepening the parchment
 *     CLOSES the frame's gap rather than opening it, and a plate dark enough to
 *     give the gold a real 3:1 needs relative luminance <= 0.091 — even the plum
 *     (L 0.117) only reaches 2.54:1. The chips inherit that relationship; they
 *     do not reopen it. They also gain edge rather than lose it: `-chip-border`
 *     read 1.55:1 on the cream, the gold reads 2.24:1.
 *
 * MEASURED IN BOTH CASCADES, at the site each ink occupies. Name 14.02/14.72:1,
 * tagline 5.79/7.94:1, status 4.76/6.85:1, CTA and the CHOSEN
 * sash 5.16:1 theme-invariant. Every one of those was ALREADY PINNED in
 * `utils/__tests__/factionContrast.test.ts` — three by the generic `wow card *`
 * rows, two by the decree's own "wow decree CTA / modifier chip" and "wow decree
 * plaque, unit". Gathering a register inherits its measurements, and that no new
 * row was needed is the evidence the register was gathered rather than invented.
 *
 * The wordmark is `feed:factionSelect.wow.name`. #2332 set `descriptions.wow`
 * and `factionHero.wow.motto` to the literal PLACEHOLDER deliberately; this tile
 * renders neither, so no copy here is touched by that.
 */
export default function WowSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.wow.status.${state}` as const);
  const chosen = state === "member";
  return (
    <div style={{
      // THE ROLE MAP (#2674), declared on the placard's own root. The prefix
      // belongs to this SURFACE: a select card sits in a grid beside eight
      // other factions' cards, which is precisely the leak a shared namespace
      // would cause.
      ...factionRoleVars("wow", "wow-select-card"),
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--wow-select-card-paper)", color: "var(--wow-select-card-ink)", fontFamily: "var(--faction-wow-body-font)",
      border: "2px solid var(--faction-wow-chronicle-gold)", borderRadius: "var(--radius-xl)",
      boxShadow: chosen
        ? "0 0 0 3px var(--faction-wow-chronicle-gold), var(--faction-wow-quest-shadow)"
        : "var(--faction-wow-quest-shadow)",
      display: "flex", flexDirection: "column",
    }}>
      {chosen && (
        <div style={{
          position: "absolute", zIndex: 2, top: 14, right: -32, transform: "rotate(38deg)",
          background: "var(--faction-wow-plum-surface)", color: "var(--faction-wow-on-plum)",
          fontFamily: "var(--wow-select-card-face)", letterSpacing: "0.1em",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the CHOSEN sash is a drawn banner; its lettering is struck to the ribbon, and its inset IS the ribbon's width (rounding reflows the sash off the corner).
          fontSize: 11, padding: "3px 36px",
          boxShadow: "0 2px 5px var(--faction-wow-stamp-shadow)",
        }}>{i18n.t("feed:factionSelect.wow.chosen")}</div>
      )}
      {/* The checker rail — the tile's own top note. The decree's masthead is
          `WowBand` + `Bunting`, which is markup this pitch has no anatomy for
          (see the register note above); the rail's gold and plum are the same
          two register tokens either way. */}
      <div aria-hidden="true" style={{
        height: 9,
        background: "repeating-linear-gradient(90deg, var(--faction-wow-chronicle-gold) 0 11px, var(--faction-wow-plum-surface) 11px 22px)",
      }} />
      <div style={{ flex: 1, padding: "var(--space-xl) var(--space-xl) 0", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--wow-select-card-face)", fontSize: "var(--text-content)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--wow-select-card-quiet)", marginBottom: "var(--space-sm)" }}>{i18n.t("feed:factionSelect.wow.banner")}</div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-sm)", filter: "drop-shadow(0 5px 6px var(--faction-wow-stamp-shadow))" }}>
          {/* above the 56px motto floor, so the seal keeps its Pig-Latin band */}
          <WowSigil size={88} />
        </div>
        <div style={{ fontFamily: "var(--wow-select-card-face)", fontSize: "var(--text-title)", lineHeight: 1.1, color: "var(--wow-select-card-ink)" }}>
          {i18n.t("feed:factionSelect.wow.name")}
        </div>
        <p className="content-text" style={{ fontStyle: "italic", color: "var(--wow-select-card-accent)", margin: "var(--space-xs) 0 var(--space-md)", lineHeight: 1.4 }}>
          {i18n.t("feed:factionSelect.wow.tagline")}
        </p>
      </div>
      <div style={{ padding: "var(--space-lg) var(--space-xl)", textAlign: "center" }}>
        <div style={{ fontSize: "var(--text-content)", color: "var(--wow-select-card-quiet)", marginBottom: "var(--space-md)" }}>
          {status}{members != null && <> · {i18n.t("feed:factionSelect.wow.members", { count: members })}</>}
        </div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer",
          fontFamily: "var(--wow-select-card-face)", fontSize: "var(--text-content)", letterSpacing: "0.04em",
          color: "var(--faction-wow-on-plum)",
          background: "var(--faction-wow-plum-surface)",
          border: "2px solid var(--faction-wow-plum-surface)", borderRadius: "var(--radius-md)",
          padding: "var(--space-md) var(--space-lg)",
        }}>{i18n.t("feed:factionSelect.wow.cta")}</button>
      </div>
    </div>
  );
}
