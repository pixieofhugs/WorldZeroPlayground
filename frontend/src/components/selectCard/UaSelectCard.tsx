import i18n from "../../i18n";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { UaSigil } from "../sigil/UaSigil";
import UaMandala from "../factionMarks/UaMandala";
import { UA_DISPLAY, UA_EYEBROW, UA_TEXT } from "../factionMarks/uaAtoms";
import { factionRoleVars } from "../../utils/factionRoles";

/**
 * UA join card — a quiet invitation, not a sales pitch (kit §4, #851).
 *
 * One file per faction, mirroring `components/taskCard/` (#2324, a child of
 * #2321, following the pattern #2322 set). `FactionSelectCard` keeps only the
 * dispatcher, the shared types and `LEGACY_SLUG`.
 *
 * THIS TILE IS CREAM, not dark. The dispatcher's old docstring asserted "the
 * tiles are dark" as a property of the grid; UA is the counter-example that
 * proves it false, and that premise is what let dark-only registers look
 * correct on a surface that flips. It is not carried into this file.
 *
 * The crest band carries the ensō over the mandala at TEXTURE strength — one of
 * the three surfaces the pattern is allowed on, and `UaMandala` names this card
 * in as many words ("page backdrop, faction hero, join card"). Everything below
 * is centred, sentence-case and hairline-ruled. The gilt double border, the gold
 * rule and the ghost-outline CTA went with the salon.
 *
 * ── THE REGISTER IS THE VELLUM LEAF'S, NOT A NEW ONE (#2321) ────────────────
 *
 * UA has NO forked family — unlike S.N.I.D.E. and the Ephemerists, every colour
 * this tile has ever named was already a `--faction-ua-*` token that flips. Its
 * defect was subtler and is worth naming, because a census cannot see it either:
 * the tile reached PAST the leaf's answers to lower-level pieces of the same
 * kit, and in one place hand-rolled a value the kit already names.
 *
 * What was gathered from `taskCard/UaTaskCard.tsx`, role for role:
 *
 *   ground   a hand-rolled `linear-gradient(160deg, -lift, -card-bg 60%)`
 *            -> `--faction-ua-parchment`, the kit's three-stop paper stock and
 *            byte-for-byte the `--faction-ua-card-parchment` the leaf paints on
 *            (`uaWearsTheLeafRegister.test.ts` asserts the two declarations are
 *            equal rather than taking it on trust). The public name, not the
 *            card's: index.css asks IN WRITING that the praxis-card exception
 *            block holding `-card-parchment` not be widened, and names
 *            `-parchment` for any UA surface. Two stops became three, so the
 *            ground now reaches `-panel` — the stop every UA ink is already
 *            measured against.
 *   edge     `1px solid --faction-ua-rule`, the NEUTRAL hairline -> the leaf is
 *            "bound in sienna": `2px solid --faction-ua-card-frame`. The radius
 *            stays `--radius-md`; the card's own 7 is a raw geometry literal and
 *            8px is not a register difference.
 *   band     `-panel` ground under a `-hair` rule -> `UaBand`'s own paint, a
 *            `-hair` ground under a `-card-accent` rule. The band COMPONENT is
 *            deliberately not mounted: it draws `factionName("ua")`, which #2332
 *            renamed to "Unwavering Artisans", and this tile already has a
 *            wordmark. Paint gathered, markup not.
 *   blurb    `--faction-ua-card-body` -> `-card-muted`, the ink the leaf sets
 *            its description in. `-card-body` is a legitimate UA prose ink with
 *            five other readers and it is NOT retired — it simply is not on this
 *            surface's twin. See the PR: this trades 6.73:1 for 5.13:1 on the
 *            ramp's tightest stop, both clear of the 4.5:1 an 18px line owes.
 *   CTA      the bare fill `--faction-ua` with `-on-fill` -> the leaf's chip:
 *            `-card-chip-bg`, `-card-chip-ink`, and the `1.5px` `-card-frame`
 *            ring the task card's button wears. A faction hue is a FILL and the
 *            card had already decided the button is a chip.
 *   CTA face UA_TEXT at 0.14em uppercase -> UA_DISPLAY at the leaf's own
 *            `--text-content` / 0.02em / 600. Faces are part of a register.
 *   lift     `uaShade(55)`, a color-mix off the body ink -> `--color-cast-shadow`.
 *            THE TASK CARD HAS NO ANSWER HERE: it casts nothing, because it sits
 *            in a feed rather than floating on the directory. `--color-cast-shadow`
 *            is the house token every tile lifts with and two siblings already
 *            use; it is not a UA family, so it invents no faction ink.
 *   ornament the mandala's `opacity={0.16}` is deleted, not repointed: the
 *            primitive's `texture` strength already carries the kit's own 0.14
 *            and the per-surface tune had no reason. (The leaf's ornament
 *            opacity IS a token, `-card-lotus-opacity`, but the prop takes a
 *            number and cannot hold a `var()`.)
 *
 * MEASURED IN BOTH CASCADES, at the position the ink occupies. The band covers
 * the ramp's top 44%, so every ink on this tile sits between the `-card-bg` and
 * `-panel` stops — never on `-lift`. Tightest reading either way is the muted
 * ink at 5.13:1 by day and 5.10:1 by night; the wordmark and subtitle run
 * 11.32/12.28:1 and the CTA 4.98/5.35:1. Every one of those was ALREADY PINNED
 * by the leaf's own rows in `utils/__tests__/factionContrast.test.ts` ("ua leaf
 * darkest stop, *" and "ua leaf CTA") — gathering a register inherits its
 * measurements. One row is new, and only because the hover names a ground the
 * card has no hover for.
 *
 * The wordmark is `feed:factionSelect.ua.wordmark` ("UA"), NOT `names.ua` —
 * #2332 renamed the faction to "Unwavering Artisans" and deliberately left this
 * key alone, because the letterspaced two-glyph mark is the tile's display type.
 * Do not repoint it.
 */
export default function UaSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.ua.status.${state}` as const);
  return (
    <div style={{
      /* The nine roles under this surface's prefix (#2659/#2673): the `leaf`
         stem, then this surface's own manifest key. */
      ...factionRoleVars("ua", "leaf-faction-select-card"),
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--faction-ua-parchment)",
      color: "var(--leaf-faction-select-card-ink)", fontFamily: UA_TEXT,
      border: "2px solid var(--faction-ua-card-frame)", borderRadius: "var(--radius-md)",
      boxShadow: "0 12px 34px -20px var(--color-cast-shadow)",
      display: "flex", flexDirection: "column",
    }}>
      {/* crest band — the mark over the pattern, on the leaf masthead's paint */}
      <div style={{
        position: "relative", height: 132, display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--faction-ua-hair)", borderBottom: "1px solid var(--leaf-faction-select-card-accent)", overflow: "hidden",
      }}>
        <UaMandala
          size={300}
          strength="texture"
          rings={4}
          petalsPerRing={14}
          style={{ position: "absolute", left: "50%", top: "52%", transform: "translate(-50%, -50%)" }}
        />
        <span style={{ position: "relative" }}><UaSigil width={96} height={96} /></span>
      </div>

      <div style={{ position: "relative", flex: 1, padding: "var(--space-xl) var(--space-xl) 0", textAlign: "center" }}>
        <div style={{ ...UA_EYEBROW, textTransform: "none", letterSpacing: "0.06em" }}>{i18n.t("feed:factionSelect.ua.banner")}</div>
        <div style={{ ...UA_EYEBROW, letterSpacing: "0.24em" }}>{i18n.t("feed:factionSelect.ua.masthead")}</div>
        <div style={{ fontFamily: UA_DISPLAY, fontWeight: 600, fontSize: "var(--text-display)", lineHeight: 1, letterSpacing: "-0.01em", marginTop: "var(--space-sm)" }}>{i18n.t("feed:factionSelect.ua.wordmark")}</div>
        <div style={{ fontFamily: UA_DISPLAY, fontWeight: 600, fontSize: "var(--text-title)", lineHeight: 1.1, marginTop: "var(--space-sm)" }}>{i18n.t("feed:factionSelect.ua.name")}</div>
        <p className="content-text" style={{ margin: "var(--space-xs) 0 0", fontStyle: "italic", lineHeight: 1.4, color: "var(--leaf-faction-select-card-quiet)" }}>{i18n.t("feed:factionSelect.ua.tagline")}</p>
        {/* #850 made the subtitle a full sentence. A sentence cannot be set in
            0.24em all-caps, so it takes the display cut here rather than the
            kicker treatment it inherited. */}
        <div style={{ fontFamily: UA_DISPLAY, fontWeight: 600, fontSize: "var(--text-title)", lineHeight: 1.1, marginTop: "var(--space-sm)" }}>{i18n.t("feed:factionSelect.ua.subtitle")}</div>
        <p className="content-text" style={{ margin: "var(--space-md) 0 0", fontFamily: UA_TEXT, lineHeight: 1.55, color: "var(--leaf-faction-select-card-quiet)" }}>
          {i18n.t("feed:factionSelect.ua.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "var(--space-lg) var(--space-xl)", textAlign: "center" }}>
        <div style={{ fontFamily: UA_TEXT, fontSize: "var(--text-content)", color: "var(--leaf-faction-select-card-quiet)", marginBottom: "var(--space-md)" }}>
          {status}{members != null && <> · <span>{i18n.t("feed:factionSelect.ua.members", { count: members })}</span></>}
        </div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer", borderRadius: "var(--radius-sm)",
          border: "1.5px solid var(--faction-ua-card-frame)",
          background: "var(--faction-ua-card-chip-bg)", color: "var(--faction-ua-card-chip-ink)",
          fontFamily: UA_DISPLAY, fontWeight: 600, fontSize: "var(--text-content)", letterSpacing: "0.02em",
          padding: "var(--space-md)", transition: "background 140ms",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--leaf-faction-select-card-accent)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--faction-ua-card-chip-bg)"; }}
        >{i18n.t("feed:factionSelect.ua.cta")}</button>
      </div>
    </div>
  );
}
