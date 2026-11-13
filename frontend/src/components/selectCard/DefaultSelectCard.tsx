import {
  factionSpectrumSheet,
  isFactionRedacted,
  redactableText,
  UNAFFILIATED_FACTION_SLUG,
} from "../../utils/factions";
import { factionRoleVars } from "../../utils/factionRoles";
import { CTA_SELECT_SIZE, DEFAULT_CARD_CTA } from "../taskCard/cardCta";
// Type-only: no runtime cycle with the dispatcher that falls back to this.
import type { FactionSelectCardProps } from "./FactionSelectCard";
import FactionSigil from "../sigil/FactionSigil";
import { membersNounKey } from "../factionHero/membersNounKey";
import DefaultSelectSeal from "./DefaultSelectSeal";
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

/**
 * DefaultSelectCard — the open sheet: the `na` directory tile, and the
 * fallback for every unregistered slug (#796; never UA's costume, #418/#636).
 * Restraint is the skin: a cream sheet, Lora name, Courier Prime body.
 *
 * The rainbow appears in exactly four places, all FILLS, never a scalar
 * (ADR-0039): the edge (`factionSpectrumSheet()`), the sigil's ring, the
 * member seal, and the one `.spectrum-rule` hairline. Each is a seam a
 * stylesheet can dress (#2497). The tree is the select-card chassis
 * (`selectCardBlocks.tsx`, #3130).
 *
 * Albescent's tile too (#2632), without naming it:
 *  1. `slug` picks the copy stem and the mark, never a colour — fills stay
 *     pinned to `na` so an unregistered slug still gets the spectrum.
 *  2. Copy goes through `redactableText`; the CTA's `disabled` reads the same
 *     predicate (#2409, ADR-0082).
 *  3. The sheet triple and `.spectrum-rule` let `.alb-prism`/`.alb-moves`
 *     dress them; for `na` the paint is byte-identical.
 */

const MONO = "var(--font-body)";
/** Lora, the unaffiliated display face. */
const DISPLAY = "var(--na-select-card-face)";
/** Seal size; the band reserves a slot this wide. */
const SEAL_SIZE = 22;

interface DefaultSelectCardProps
  extends Omit<FactionSelectCardProps, "faction"> {
  /** Whose words and mark; defaults to the unaffiliated sheet. */
  slug?: string;
}

export default function DefaultSelectCard({
  state = "locked",
  members,
  onVisit,
  slug = UNAFFILIATED_FACTION_SLUG,
}: DefaultSelectCardProps) {
  const say = (key: string, options?: Record<string, unknown>) =>
    redactableText(`feed:factionSelect.${slug}.${key}`, options);
  // ONE predicate for the words and the door (#2409).
  const redacted = isFactionRedacted(slug);
  return (
    <SelectCardFrame
      className={redacted ? "redacted" : undefined}
      data-redacted={redacted ? "true" : undefined}
      style={{
        // Role map PINNED to `na`, not `slug` (see point 1): the ground can't
        // follow a slug and an ink may not leave its ground (#2361). The
        // prefix lets a host dress this surface alone.
        ...factionRoleVars("na", "na-select-card"),
        // Rainbow 1 of 4: the edge. The sheet TRIPLE so a dresser can repaint
        // the ground with one token (#2497).
        border: "2px solid transparent",
        ...factionSpectrumSheet(),
        borderRadius: 14,
        color: "var(--na-select-card-ink)",
        fontFamily: MONO,
        boxShadow: "0 12px 32px -14px var(--color-cast-shadow)",
      }}
    >
      {/* A row, name against the mark. */}
      <SelectCardBand
        form="row"
        align="start"
        state={state}
        /* Rainbow 2 of 4: the mark, via the dispatcher (ADR-0083 §1). */
        mark={<FactionSigil slug={slug} size={40} />}
        /* Rainbow 3 of 4, members only. */
        seal={<DefaultSelectSeal size={SEAL_SIZE} />}
        sealSize={SEAL_SIZE}
        style={{ padding: "var(--space-xl) var(--space-xl) 0" }}
        nameStyle={{
          fontFamily: DISPLAY,
          fontSize: "var(--text-display)",
          lineHeight: 1,
          letterSpacing: "0.02em",
        }}
      >
        {/* The canonical name (ADR-0038, #2806) through the redaction gate.
            Not `factionName()`, which masks instead (ADR-0082 §2). */}
        {redactableText(`factions:names.${slug}`)}
      </SelectCardBand>

      <SelectCardBody style={{ padding: "0 var(--space-xl)" }}>
        {/* The display line (#3130), at the 18px content floor (no 19px rung). */}
        <SelectCardMotto
          className="content-text"
          style={{ fontStyle: "italic", lineHeight: 1.4, marginTop: "var(--space-lg)" }}
        >
          {say("tagline")}
        </SelectCardMotto>

        <SelectCardPitch
          className="content-text"
          style={{
            lineHeight: 1.55,
            marginTop: "var(--space-md)",
            color: "var(--na-select-card-quiet)",
          }}
        >
          {say("blurb")}
        </SelectCardPitch>

        {/* Rainbow 4 of 4, the ornament (#3130), at the praxis divider's 0.45.
            NO CHILDREN: `.alb-moves .spectrum-rule:empty` walks it. */}
        <SelectCardOrnament
          className="spectrum-rule"
          style={{ height: 2, opacity: 0.45, marginTop: "var(--space-lg)" }}
        />
      </SelectCardBody>

      <SelectCardFooter style={{ padding: "var(--space-md) var(--space-xl) var(--space-xl)" }}>
        <SelectCardStanding
          members={members}
          /* Figure is the tile's, noun the faction header's (#3148); redacted withholds the figure. */
          headcount={(count) => (
            <>
              {!redacted && <>{count} </>}
              {redactableText(membersNounKey(slug, count), { count })}
            </>
          )}
          separator=" · "
          style={{
            fontSize: "var(--text-content)",
            color: "var(--na-select-card-quiet)",
            marginBottom: "var(--space-md)",
          }}
        >
          {say(`status.${state}`)}
        </SelectCardStanding>
        {/* Visible and shut when redacted, never absent (#2409). Paint is the
            task card's `DEFAULT_CARD_CTA` (#2818); `CTA_SELECT_SIZE` last. For
            `na` its `--na-task-card-*` reads resolve to the same values. */}
        <SelectCardCall
          onClick={onVisit}
          disabled={redacted}
          style={{ ...DEFAULT_CARD_CTA, ...CTA_SELECT_SIZE }}
        >
          {say("cta")}
        </SelectCardCall>
      </SelectCardFooter>
    </SelectCardFrame>
  );
}
