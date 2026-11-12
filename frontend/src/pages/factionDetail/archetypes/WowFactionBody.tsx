import { type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";

import TaskCard from "../../../components/taskCard/TaskCard";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { BalloonBunch, Bunting, Zig } from "../../../components/factionMarks/wowOrnament";
import { WowSigil } from "../../../components/sigil/WowSigil";
import { factionName, factionDescription } from "../../../utils/factions";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";
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
 * Warriors of Whimsy — the faction-page body. Derived, not drawn (no sheet):
 * ornament from `wowOrnament.tsx`, section order + join flow from the phone
 * twin `WowFactionPage` (#901). Words fall back to neutral `detail.*`
 * (ADR-0057). No new tokens.
 *
 * ponytail: no bespoke member tile, spotlight portrait or card chrome; rows are
 * the phone twin's widened and the galleries mount the live cards (ADR-0050).
 * When #951's sheet is drawn, restyle these sections in place.
 */

/* Roles by name (#2674) where one exists; the rest are this surface's own
   extras (decision 07). */
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

/** Roll length; the rest are on the players page. */
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
    onSignup,
    membership,
  } = state;
  const sections = useSectionDisclosures(FACTION_SECTIONS);

  if (!faction) return null;

  const name = factionName(faction.slug);
  const roll = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const champion = roll[0];
  const rest = roll.slice(1);

  return (
    // `--label-ink` repointed once on the frame (#1307 seam), never per label
    // (#1252): olive-gold clears AA on parchment and the cream plate.
    <div
      className="wz-faction-grid"
      data-skin="wow"
      style={
        {
          ...factionBodyVars("wow"), ...factionRoleVars("wow", "wow-faction-page"),
          ["--label-ink" as string]: "var(--faction-wow-accent-deep)",
        } as CSSProperties
      }
    >
      <Charter slug={faction.slug} />

      {/* One stacked order at every width (#3182); roll last, it is uncapped. */}
      <div className="wz-faction-band">
        <JoinBlock name={name} membership={membership} />

      {/* CHAMPION — ranked on all_time_score so it survives an era reset. */}
      {champion && (
        <section>
          <SectionHead>{t("wow.spotlight.label")}</SectionHead>
          <MemberRow rank={1} member={champion} champion />
        </section>
      )}
      </div>

      {/* quests */}
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
                  multiplier={task.viewer_faction_multiplier}
                  onSignup={onSignup}
                />
              ))}
            </div>
          )}
        </SectionPanel>
      </section>

      {/* chronicles: the one bunch of balloons on the page */}
      <section>
        <SectionHead balloons>
          <SectionToggle section={sections.praxis} label={t("detail.default.recentHeading")} />
        </SectionHead>
        <SectionPanel section={sections.praxis}>
          {recentPraxis.length === 0 ? (
            <Quiet>{t("detail.default.recentEmpty")}</Quiet>
          ) : (
            <div className="wz-faction-praxis-row" style={CARD_GRID}>
              {recentPraxis.map((praxis) => (
                <div key={praxis.id} style={PRAXIS_CELL}>
                  <PraxisCard praxis={praxis} />
                </div>
              ))}
            </div>
          )}
        </SectionPanel>
      </section>

      {/* MEMBERS — champion drawn above, so the roll drops them. */}
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
  );
}

/** Praxis gallery: varied card sizes on purpose, not a CSS grid. The cell
 *  stops a lone card stretching across the plate. */
const PRAXIS_CELL: CSSProperties = {
  flex: "0 1 var(--praxis-card-basis, 394px)",
  minWidth: 280,
};

const CARD_GRID: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-lg)",
  alignItems: "flex-start",
};

/** The charter: the faction description under bunting (#1909). */
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

/** Section head over the wavy gold→plum rule. */
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
 * A roll entry: rank, name, tally; the top row takes the Champion ribbon.
 * `minHeight` 46 is the touch target (#895), a floor at both widths.
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
        /* Wraps in narrow columns; only works because the name has a real
           basis below (#3103). */
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
          /* 12ch floor (#3103, STYLE §5): pill and stat wrap below it.
             ponytail: one measure for all rows, unseen in a browser; retune
             if the column or stat copy changes. */
          flex: "1 1 12ch",
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

/** The enlist block (ADR-0019: joining confirms). Hidden for "none". */
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
            {/* Child mirrors the catalog so `<1>` has a shape; caps are the
                owner's word (#2774). */}
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

        {/* Gate and burn stay distinct: "keep questing" is a lie for the
            burn (#1305), which keeps neutral platform wording. */}
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

/** Join trio paint (#2651): gilt for both affirmatives, ghost for cancel. */
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
