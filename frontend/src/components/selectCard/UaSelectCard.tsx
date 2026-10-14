import i18n from "../../i18n";
import { redactableText } from "../../utils/factions";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { UaSigil } from "../sigil/UaSigil";
import UaMandala from "../factionMarks/UaMandala";
import {
  SelectCardBand,
  SelectCardBody,
  SelectCardCall,
  SelectCardFooter,
  SelectCardFrame,
  SelectCardMotto,
  SelectCardOrnament,
  SelectCardPitch,
  SelectCardStanding,
} from "./selectCardBlocks";
import { UA_DISPLAY, UA_TEXT } from "../factionMarks/uaAtoms";
import { CTA_SELECT_SIZE, UA_CARD_CTA } from "../taskCard/cardCta";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionBodyVars } from "../../utils/factionBodyFace";

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
 *            deliberately not mounted: it draws `factionName("ua")`, and this
 *            tile already sets that name under the crest. Paint gathered,
 *            markup not.
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
 * ink at 5.13:1 by day and 5.10:1 by night; the name runs
 * 11.32/12.28:1 and the CTA 4.98/5.35:1. Every one of those was ALREADY PINNED
 * by the leaf's own rows in `utils/__tests__/factionContrast.test.ts` ("ua leaf
 * darkest stop, *" and "ua leaf CTA") — gathering a register inherits its
 * measurements. One row was new when this tile was gathered, and only because
 * the hover named a ground the card has no hover for; #2818 deleted the hover
 * and the row with it, so the tile now sits entirely inside the leaf's rows.
 *
 * ── THE SEVEN SLOTS (#3130, #3140) ─────────────────────────────────────────
 *
 * Built from `selectCardBlocks`; the paint above is unchanged. The band is a
 * CREST: the mandala field with the canonical name on it and nothing else (the
 * block has no backdrop slot, so the field is a sibling drawn behind it). The
 * ensō left the band — on the mandala it read as off-centre — and is now the
 * ORNAMENT, between pitch and footer, where a rule stood. The tagline is the
 * motto in the display face, italic. The "UA" wordmark is retired; the seal is
 * a reduced mandala in the manner of the five-vote mark (`vote/UaVote`),
 * members only. All three standings read from the catalog.
 */
const SEAL_SIZE = 34;

export default function UaSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  return (
    <SelectCardFrame
      style={{
        /* The nine roles under this surface's prefix (#2659/#2673): the `leaf`
           stem, then this surface's own manifest key. */
        ...factionBodyVars("ua"), ...factionRoleVars("ua", "leaf-faction-select-card"),
        background: "var(--faction-ua-parchment)",
        color: "var(--leaf-faction-select-card-ink)", fontFamily: UA_TEXT,
        border: "2px solid var(--faction-ua-card-frame)", borderRadius: "var(--radius-md)",
        boxShadow: "0 12px 34px -20px var(--color-cast-shadow)",
        textAlign: "center",
      }}
    >
      {/* crest band — the leaf masthead's paint, the pattern behind the name */}
      <div style={{
        position: "relative", display: "flex", flexDirection: "column", overflow: "hidden",
        background: "var(--faction-ua-hair)", borderBottom: "1px solid var(--leaf-faction-select-card-accent)",
      }}>
        <UaMandala
          size={300}
          strength="texture"
          rings={4}
          petalsPerRing={14}
          style={{ position: "absolute", left: "50%", top: "52%", transform: "translate(-50%, -50%)" }}
        />
        <SelectCardBand
          form="crest"
          state={state}
          seal={<UaMandala size={SEAL_SIZE} strength="full" rings={2} petalsPerRing={8} color="var(--leaf-faction-select-card-accent)" />}
          sealSize={SEAL_SIZE}
          style={{ minHeight: 132, justifyContent: "center", padding: "var(--space-lg) var(--space-xl)" }}
          nameStyle={{ fontFamily: UA_DISPLAY, fontWeight: 600, fontSize: "var(--text-title)", lineHeight: 1.1 }}
        >
          {redactableText("factions:names.ua")}
        </SelectCardBand>
      </div>

      <SelectCardBody style={{ padding: "var(--space-xl) var(--space-xl) 0" }}>
        <SelectCardMotto style={{ fontFamily: UA_DISPLAY, fontStyle: "italic", fontWeight: 500, fontSize: "var(--text-display)", lineHeight: 1.05 }}>
          {i18n.t("feed:factionSelect.ua.tagline")}
        </SelectCardMotto>
        <SelectCardPitch className="content-text" style={{ marginTop: "var(--space-md)", lineHeight: 1.55, color: "var(--leaf-faction-select-card-quiet)" }}>
          {i18n.t("feed:factionSelect.ua.blurb")}
        </SelectCardPitch>
        {/* The ensō, moved down from the band to replace the rule (#3140). */}
        <SelectCardOrnament style={{ display: "flex", justifyContent: "center", marginTop: "var(--space-lg)" }}>
          <UaSigil width={56} height={56} />
        </SelectCardOrnament>
      </SelectCardBody>

      <SelectCardFooter style={{ padding: "var(--space-md) var(--space-xl) var(--space-xl)" }}>
        <SelectCardStanding
          members={members}
          headcount={(count) => `${count} ${i18n.t("feed:factionHero.ua.stats.members", { count })}`}
          separator=" · "
          style={{ fontFamily: UA_TEXT, fontSize: "var(--text-content)", color: "var(--leaf-faction-select-card-quiet)", marginBottom: "var(--space-md)" }}
        >
          {i18n.t(`feed:factionSelect.ua.status.${state}` as const)}
        </SelectCardStanding>
        {/* The chip the mandalas flank on the card, at one setting (#2818):
            `UA_CARD_CTA` spells the pair once; geometry is `CTA_SELECT_SIZE`. */}
        <SelectCardCall onClick={onVisit} style={{ ...UA_CARD_CTA, ...CTA_SELECT_SIZE }}>
          {i18n.t("feed:factionSelect.ua.cta")}
        </SelectCardCall>
      </SelectCardFooter>
    </SelectCardFrame>
  );
}
