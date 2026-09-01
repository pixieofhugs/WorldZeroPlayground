import { type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";

import TaskCard from "../../../components/taskCard/TaskCard";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { BalloonBunch, Bunting, Zig } from "../../../components/factionMarks/wowOrnament";
import { WowSigil } from "../../../components/sigil/WowSigil";
import { factionName, factionDescription } from "../../../utils/factions";
import { factionRoleVars } from "../../../utils/factionRoles";
import { computeFactionMultiplier } from "../../../utils/points";
import type { CharacterOut } from "../../../api/auth";
import { JoinControl, type JoinControlSkin } from "../../../components/JoinControl";
import {
  FACTION_SECTIONS,
  SectionPanel,
  SectionToggle,
  useSectionDisclosures,
} from "../sectionDisclosure";
import type { FactionDetailState } from "../useFactionDetail";

/**
 * Warriors of Whimsy — the faction-page BODY, net-new.
 *
 * The last of #951's four missing desktop surfaces. #1037 shipped `taskDetail`
 * (the parchment field) and #1121 `praxisDetail` (the chronicle entry); #900
 * shipped the `factionHero` above this and left the page BENEATH it defaulting.
 * So until this file a WOW faction page was a gilt recruiting banner sitting on
 * the na placeholder body — `.eyebrow` headings, a hairline member tile, no
 * charter, and no join control at all (`DefaultFactionBody` carries only the
 * burn notice, which is why its own `ponytail:` names WOW as one of the two
 * factions waiting on this).
 *
 * DERIVED, not drawn — there is no v2 sheet for this surface. Three sources,
 * all already in the repo:
 *
 *   • the parchment ground, the wavy gold→plum rules, the bunting and the
 *     balloons from `WowTaskDetail` (#1037) via the shared ornament module
 *     (`components/factionMarks/wowOrnament.tsx`, §6/#849) — nothing is redrawn here;
 *   • the SECTION ORDER and the join flow from the phone twin
 *     `mobileArchetypes/WowFactionPage` (#901), so the two form factors tell the
 *     same story in the same sequence;
 *   • the two-column main + right-rail SHAPE from the other six bespoke bodies
 *     (Coven's is the closest), so the join block sits where a returning player
 *     already looks for it.
 *
 * THE COPY WAS ALREADY WRITTEN. `factions.json` has carried `wow.charter`,
 * `wow.roster`, `wow.tasks`, `wow.praxis`, `wow.join` and `wow.spotlight` since
 * #900 — six key groups with no reader, because the body they were written for
 * was never built. This file adds no new keys; it wires those six up and falls
 * back to the shared neutral `detail.*` catalog for everything else (ADR-0057:
 * dress is ours, words are not). The charter is the one thing here the hero
 * cannot show — it is the faction's own voice at length, and it is why the page
 * is worth visiting after the banner.
 *
 * NO NEW TOKENS. Every colour is a shipped `--faction-wow-*`; #1023 and #1037
 * minted them and this page reuses them.
 *
 * ponytail: no bespoke member tile, no spotlight portrait, no task/praxis
 * treatment of its own — the roster rows are the phone twin's rows widened, and
 * the two galleries mount the live `<TaskCard>` / `<PraxisCard>`, which are
 * already WOW's own archetypes. The kit never drew this surface, so inventing a
 * third WOW card chrome here would be guessing in a faction that has two
 * DELIBERATELY unalike ones already (ADR-0050: a quest is ISSUED by decree,
 * proof is RECORDED in the chronicle). Upgrade path: when #951's sheet is
 * drawn, restyle these three sections in place — the data wiring and the join
 * contract below are the final ones.
 */

/**
 * THE FIVE CORE ROLES ARE ASKED FOR BY NAME (#2674). The `.wz-faction-grid`
 * frame below spreads `factionRoleVars('wow', 'wow-faction-page')` beside the
 * `--label-ink` repoint it already carries — the same seam, one level up: a
 * custom property set once on the frame rather than a colour written at each
 * site.
 *
 * Every read carries today's token as its fallback, so an unset prefix renders
 * exactly what shipped. The names below that are NOT roles stay put — the olive
 * label ink, the plum fill and its ink, the gold, the gilt, the plate, the
 * hairline and the lift are this surface's own extras (decision 07).
 */
const MED = "var(--wow-faction-page-face)"; /* MedievalSharp */
const LORA = "var(--faction-wow-body-font)"; /* Lora */

const INK = "var(--wow-faction-page-ink)";
const MUTED = "var(--wow-faction-page-quiet)";
/** Label ink. Olive-gold, the one measured to clear AA on the parchment field. */
const LABEL = "var(--faction-wow-accent-deep)";
const PLUM = "var(--wow-faction-page-accent)";
const PLUM_SURFACE = "var(--faction-wow-plum-surface)";
const ON_PLUM = "var(--faction-wow-on-plum)";
/** Frame + rule gold. Never an ink: 2.24:1 on the cream (§3). */
const GOLD = "var(--faction-wow-chronicle-gold)";
/** The burnt gold reserved for figures. */
const GILT = "var(--faction-wow-stamp-total)";
const CARD = "var(--wow-faction-page-paper)";
const PLATE = "var(--faction-wow-plate)";
const HAIR = "var(--faction-wow-chronicle-rule)";
const BORDER = "var(--faction-wow-chronicle-border)";
const SHADOW = "0 18px 40px -20px var(--faction-wow-chronicle-shadow)";

/** Members shown on the roll before it stops. The rest are on the players page. */
const ROLL_LIMIT = 8;

/** A gold-framed cream plate — the kit's one container, used for every section. */
const PLATE_FRAME: CSSProperties = {
  background: CARD,
  border: `2px solid ${GOLD}`,
  borderRadius: "var(--radius-lg)",
  boxShadow: SHADOW,
  padding: "var(--space-xl)",
};

export default function WowFactionBody({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation("factions");
  const {
    faction,
    members,
    tasks,
    recentPraxis,
    viewerFactionSlug,
    gameFactions,
    onSignup,
    membership,
  } = state;
  const sections = useSectionDisclosures(FACTION_SECTIONS);

  // Guarded non-null by the dispatcher.
  if (!faction) return null;

  const name = factionName(faction.slug);
  const roll = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const champion = roll[0];
  /* The roll below the champion card. `slice(1)` rather than a filter on id: the
     card is `roll[0]`, so position is the definition here and an id comparison
     would be a second way of saying the same thing. */
  const rest = roll.slice(1);

  return (
    // `.wz-faction-grid` is the shared main+rail seam all six other bodies use.
    // Not an inline grid: the class carries the ≤860px collapse to one column,
    // which a hand-rolled `1fr 320px` silently loses — the rail would go on
    // squeezing the galleries on a narrow desktop window instead of dropping
    // below them.
    //
    // `--label-ink` is repointed ONCE here, which is the seam #1307 built into
    // the two label tiers. WOW's labels sit on parchment, where the neutral
    // tertiary is too weak; `--faction-wow-accent-deep` is the olive-gold
    // measured to clear AA on both this ground and the cream plate. Setting it
    // on the frame rather than colouring each label inline is the explicit rule
    // at the tiers' declaration — a per-label colour is the contradiction #1252
    // exists to stop, and it is invisible to `factionContrast.test.ts`.
    <div
      className="wz-faction-grid"
      data-skin="wow"
      style={
        {
          ...factionRoleVars("wow", "wow-faction-page"),
          ["--label-ink" as string]: "var(--faction-wow-accent-deep)",
        } as CSSProperties
      }
    >
      {/* ── MAIN COLUMN ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
        <Charter slug={faction.slug} />

        {/* ── quests awaiting a champion ── */}
        <section>
          <SectionHead>
            <SectionToggle
              section={sections.tasks}
              label={t("detail.default.tasksHeading", { total: tasks.length })}
            />
          </SectionHead>
          <SectionPanel section={sections.tasks}>
            {tasks.length === 0 ? (
              <Quiet>{t("detail.default.tasksEmpty")}</Quiet>
            ) : (
              <div className="task-card-row" style={{ gap: "var(--space-lg)" }}>
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    basePoints={task.point_value}
                    multiplier={computeFactionMultiplier(
                      viewerFactionSlug,
                      task.primary_faction_slug,
                      gameFactions,
                    )}
                    onSignup={onSignup}
                  />
                ))}
              </div>
            )}
          </SectionPanel>
        </section>

        {/* ── chronicles of proof ── the one bunch of balloons on the page ── */}
        <section>
          <SectionHead balloons>
            <SectionToggle section={sections.praxis} label={t("detail.default.recentHeading")} />
          </SectionHead>
          <SectionPanel section={sections.praxis}>
            {recentPraxis.length === 0 ? (
              <Quiet>{t("detail.default.recentEmpty")}</Quiet>
            ) : (
              <div className="praxis-gallery" style={CARD_GRID}>
                {recentPraxis.map((praxis) => (
                  <PraxisCard key={praxis.id} praxis={praxis} />
                ))}
              </div>
            )}
          </SectionPanel>
        </section>
      </div>

      {/* ── RIGHT RAIL ── join, then Champion, then the roll (#2548).
           This rail held ONLY the enlist block. Every other body puts the
           Champion card and the Members roll here too, and WOW instead drew its
           muster roll in the MAIN column between the Charter and the quests and
           named no champion at all -- the top scorer was simply row 1, flagged by
           a boolean. The document-order consequence was that Members rendered
           BEFORE Tasks on this page and after both galleries on every other one.

           Nothing is reskinned: the champion is `MemberRow` in its marked state,
           WOW's own drawing, under WOW's own `SectionHead`. Every ornament stays
           -- parchment, the wavy gold/plum rules, the bunting, the balloons. ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
        <JoinBlock name={name} membership={membership} />

        {/* ⑥ CHAMPION — `wow.spotlight.label` is the key `MemberRow` already
            reads for its pill, so no string is minted. Ranked on
            `all_time_score` like every sibling: the two agree inside an era and
            only that one survives a reset, so the card does not blank itself on
            day one. */}
        {champion && (
          <section>
            <SectionHead>{t("wow.spotlight.label")}</SectionHead>
            <MemberRow rank={1} member={champion} champion />
          </section>
        )}

        {/* ⑥ MEMBERS — the champion is drawn above, so the roll drops them, which
            is what `membersEmptyWithSpotlight` has always been for. With a real
            champion card over it that line finally means what it says. */}
        <section>
          <SectionHead>{t("detail.default.membersHeading", { total: members.length })}</SectionHead>
          {rest.length === 0 ? (
            <Quiet>
              {champion ? t("detail.membersEmptyWithSpotlight") : t("detail.membersEmpty")}
            </Quiet>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              {rest.slice(0, ROLL_LIMIT).map((member, index) => (
                <MemberRow key={member.id} rank={index + 2} member={member} champion={false} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** Varied card sizes are intentional, not a CSS grid — matches every other body.
 *  The PRAXIS gallery only, since #1945: the task row above wears
 *  `.task-card-row`, which keeps the widths ragged and levels the bottom edge. */
const CARD_GRID: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-lg)",
  alignItems: "flex-start",
};

/**
 * The charter — the faction's own voice at length, bunting strung across it.
 * The only section the hero above cannot show.
 *
 * #1909 CUT the four strings that used to fill it: `wow.charter.title` ("The
 * Charter of Whimsy") and the three `wow.charter.paragraphs`. No other faction
 * had body copy on this panel — the other seven bodies all print the faction
 * DESCRIPTION here, split on blank lines — so once the audit ruled the surface
 * generic, WOW prints the description too. This is the one deletion in #1909
 * that removes several hundred words of real writing; the ruling's own terms
 * are "we can put it back in intentionally".
 */
function Charter({ slug }: { slug: string }) {
  const { t } = useTranslation("factions");
  const paragraphs = factionDescription(slug)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section style={{ ...PLATE_FRAME, padding: 0, overflow: "hidden" }}>
      <Bunting style={{ padding: "var(--space-sm) var(--space-lg) 0" }} />
      <div style={{ padding: "var(--space-lg) var(--space-xl) var(--space-xl)" }}>
        <div className="label-heading" style={{ fontFamily: MED }}>
          {t("detail.aboutHeading")}
        </div>
        <Zig id="charter" style={{ margin: "var(--space-md) 0" }} />
        {paragraphs.map((paragraph) => (
          <p
            key={paragraph}
            className="content-text"
            style={{
              fontFamily: LORA,
              lineHeight: 1.65,
              color: INK,
              margin: "0 0 var(--space-md)",
            }}
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

/**
 * A section head in the display face, over the wavy gold→plum rule.
 *
 * It used to open on a herald's kicker (`wow.tasks.kicker` /
 * `wow.praxis.kicker`); #1909 cut the slot, because the audit ruled the line
 * restated its own heading and only the seven bespoke bodies ever had one.
 */
function SectionHead({
  children,
  balloons,
}: {
  children: ReactNode;
  balloons?: boolean;
}) {
  return (
    <div style={{ marginBottom: "var(--space-lg)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-md)" }}>
        <h2
          style={{
            fontFamily: MED,
            fontSize: "var(--text-title)",
            lineHeight: 1.15,
            color: INK,
            margin: 0,
          }}
        >
          {children}
        </h2>
        {balloons && <BalloonBunch size={38} style={{ marginBottom: "calc(-1 * var(--space-sm))" }} />}
      </div>
      <Zig id="section" style={{ marginTop: "var(--space-sm)" }} />
    </div>
  );
}

/** The quiet register — Lora italic, for every empty state on the page. */
function Quiet({ children }: { children: ReactNode }) {
  return (
    <p
      className="content-text"
      style={{ fontFamily: LORA, fontStyle: "italic", color: MUTED, margin: 0 }}
    >
      {children}
    </p>
  );
}

/**
 * A roll entry: rank numeral, name, tally — the phone twin's row widened, with
 * the top of the roll taking the Champion ribbon the copy catalog already names.
 *
 * `minHeight` is #895's 46px touch target, carried over from the twin when
 * ADR-0078 retired it. It is applied at BOTH widths rather than behind a
 * `useFormFactor()` read, because it is a FLOOR and the laptop row already
 * clears it — the rank numeral alone is `--text-title` — so the branch would
 * cost a hook to change nothing. ADR-0069 preserved the same number through the
 * duel-seal collapse for the same reason: a touch target is a requirement, not
 * a cosmetic delta, so it survives.
 */
function MemberRow({
  rank,
  member,
  champion,
}: {
  rank: number;
  member: CharacterOut;
  champion: boolean;
}) {
  const { t } = useTranslation("factions");
  return (
    <Link
      to={`/characters/${member.id}`}
      style={{
        minHeight: 46,
        display: "flex",
        alignItems: "center",
        /* Wraps since #2548 moved the roll into the 322px rail. The row was laid
           out for the main column, where rank + name + pill + stat fit on one
           line; in the rail they do not, and a nowrap name beside a nowrap stat
           would overflow the plate rather than reflow inside it. */
        flexWrap: "wrap",
        gap: "var(--space-sm) var(--space-lg)",
        padding: "var(--space-sm) var(--space-lg)",
        background: PLATE,
        border: `1px solid ${HAIR}`,
        borderLeft: `4px solid ${champion ? GOLD : PLUM_SURFACE}`,
        borderRadius: 7,
        textDecoration: "none",
      }}
    >
      <span
        style={{
          flex: "none",
          fontFamily: MED,
          fontSize: "var(--text-title)",
          lineHeight: 1,
          color: GILT,
        }}
      >
        {rank}
      </span>
      <span
        className="content-text"
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: MED,
          color: INK,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {member.display_name}
      </span>
      {champion && (
        <span
          className="label-caption"
          style={{
            flex: "none",
            fontFamily: MED,
            background: PLUM_SURFACE,
            color: ON_PLUM,
            padding: "var(--space-xs) var(--space-sm)",
            borderRadius: 999,
          }}
        >
          {t("wow.spotlight.label")}
        </span>
      )}
      <span className="label-caption" style={{ flex: "none" }}>
        {champion
          ? t("detail.spotlightStat", {
              level: member.level,
              score: member.all_time_score.toLocaleString(),
              count: member.all_time_score,
            })
          : t("detail.memberLevel", { level: member.level })}
      </span>
    </Link>
  );
}

/**
 * The enlist rail (ADR-0019: joining is invite-earned and irreversible, so the
 * button confirms). Every branch of `membership.state` is drawn EXCEPT "none" —
 * a viewer who cannot act does not see a control ("hide unusable controls").
 * The burn and the gate stay distinguishable: "keep questing" is the right line
 * for "not invited yet" and a lie for the burn.
 */
function JoinBlock({
  name,
  membership,
}: {
  name: string;
  membership: FactionDetailState["membership"];
}) {
  const { t } = useTranslation("factions");

  if (membership.state === "none") return null;

  return (
    <aside
      style={{
        ...PLATE_FRAME,
        padding: 0,
        overflow: "hidden",
        border: `2px solid ${BORDER}`,
        position: "sticky",
        top: "var(--space-xl)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          padding: "var(--space-md) var(--space-lg)",
          background:
            "linear-gradient(160deg, var(--faction-wow-ground-from), var(--faction-wow-ground-to))",
          borderBottom: `2px solid ${GOLD}`,
        }}
      >
        <WowSigil size={30} />
        <span className="label-heading" style={{ marginLeft: "auto", fontFamily: MED }}>
          {t("wow.join.heading")}
        </span>
      </div>

      <div style={{ background: CARD, padding: "var(--space-lg)", textAlign: "center" }}>
        {membership.state === "member" && (
          <>
            <div style={{ fontFamily: MED, fontSize: "var(--text-title)", lineHeight: 1.15, color: PLUM }}>
              {t("wow.join.memberTitle")}
            </div>
            {/* #2299 (b): the eighth slot the other six already fill — a sworn
                knight is told what they rank as. The WORD is the owner's
                (#2774: GLORIOUS, in factions.json); this is only the mount, and
                the child below only mirrors the catalog so `<1>` has a shape to
                index. The caps diverge from the six lowercase role phrases on
                purpose — WOW is the faction whose own description shouts. */}
            <div
              className="content-text"
              style={{ fontFamily: LORA, color: MUTED, margin: "var(--space-sm) 0 0" }}
            >
              <Trans t={t} i18nKey="wow.join.memberStanding">
                Standing · <b style={{ color: PLUM }}>GLORIOUS</b>
              </Trans>
            </div>
          </>
        )}

        {membership.state === "eligible" && (
          <JoinControl
            membership={membership}
            name={name}
            skin={JOIN_SKIN}
            openLabel={t("wow.join.joinButton")}
            joiningLabel={t("wow.join.joining")}
            intro={
              <>
                <div
                  style={{
                    fontFamily: MED,
                    fontSize: "var(--text-title)",
                    lineHeight: 1.15,
                    color: INK,
                    margin: "var(--space-xs) 0 var(--space-sm)",
                  }}
                >
                  {t("wow.join.eligibleTitle")}
                </div>
                <p
                  className="content-text"
                  style={{
                    fontFamily: LORA,
                    fontStyle: "italic",
                    color: MUTED,
                    margin: "0 0 var(--space-lg)",
                  }}
                >
                  {t("wow.join.eligibleBody")}
                </p>
              </>
            }
          />
        )}

        {/* The gate and the burn must stay distinguishable: "keep questing" is
            right for "not invited yet" and a lie for the burn, which
            `can_join_faction` refuses for the rest of the era (#1305). The burn
            keeps the shared neutral wording every other body uses — a faction
            does not get to put its own spin on a door it closed. */}
        {membership.state === "gate" && (
          <>
            <div
              style={{
                fontFamily: MED,
                fontSize: "var(--text-title)",
                lineHeight: 1.15,
                color: INK,
                margin: "var(--space-xs) 0 var(--space-sm)",
              }}
            >
              {t("wow.join.gateTitle")}
            </div>
            <p
              className="content-text"
              style={{ fontFamily: LORA, lineHeight: 1.6, color: MUTED, margin: 0 }}
            >
              {t("mobile.gateHint", { faction: name })}
            </p>
          </>
        )}

        {membership.state === "burned" && (
          <>
            <div className="label-caption" style={{ fontFamily: MED }}>
              {t("detail.burned.kicker")}
            </div>
            <div
              style={{
                fontFamily: MED,
                fontSize: "var(--text-title)",
                lineHeight: 1.15,
                color: INK,
                margin: "var(--space-xs) 0 var(--space-sm)",
              }}
            >
              {t("detail.burned.title", { faction: name })}
            </div>
            <p
              className="content-text"
              style={{ fontFamily: LORA, lineHeight: 1.6, color: MUTED, margin: 0 }}
            >
              {t("detail.burned.body", { faction: name })}
            </p>
          </>
        )}
      </div>
    </aside>
  );
}

const GILT_BUTTON: CSSProperties = {
  width: "100%",
  fontFamily: MED,
  fontSize: "var(--text-content)",
  color: "var(--faction-wow-quest-text)",
  background: "linear-gradient(160deg, var(--faction-wow-quest-from), var(--faction-wow-quest-to))",
  border: `2px solid var(--faction-wow-quest-border)`,
  borderRadius: 999,
  padding: "var(--space-sm) var(--space-lg)",
  cursor: "pointer",
};

const GHOST_BUTTON: CSSProperties = {
  fontFamily: MED,
  fontSize: "var(--text-content)",
  color: LABEL,
  background: "transparent",
  border: `1px solid ${HAIR}`,
  borderRadius: 999,
  padding: "var(--space-sm) var(--space-lg)",
  cursor: "pointer",
};

/**
 * THE ONE KIT ALREADY IN #646 ORDER, and the only one that had named its two
 * buttons. The skin is those same two constants handed to `JoinControl` — the
 * gilt pill for both affirmatives, the ghost for the cancel — so nothing on this
 * page moves except that the pair is now written somewhere the other eight can
 * read it (#2651).
 */
const JOIN_SKIN: JoinControlSkin = {
  openStyle: GILT_BUTTON,
  confirmStyle: GILT_BUTTON,
  cancelStyle: GHOST_BUTTON,
  proseStyle: {
    fontFamily: LORA,
    lineHeight: 1.6,
    color: INK,
    margin: "0 0 var(--space-md)",
  },
  errorStyle: {
    fontFamily: LORA,
    color: "var(--color-danger)",
    margin: "0 0 var(--space-md)",
  },
};
