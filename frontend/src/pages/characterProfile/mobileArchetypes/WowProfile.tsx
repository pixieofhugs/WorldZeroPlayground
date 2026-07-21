/**
 * WOW MOBILE profile — A KNIGHT'S PAGE, PHONE SHAPED (#901).
 *
 * DERIVED, not drawn. Two sources:
 *
 *   • the pavilion chrome from the kit's one mobile screen — the crested header
 *     wash, the checker, the gold-framed panel
 *     (`components/cards/wowMobile.tsx`);
 *   • the desktop archetype `pages/characterProfile/archetypes/WowProfileBody`
 *     (#900): burnt-gold figures on near-white plates, honours struck on gilt
 *     lozenges, and every row led by a plum rule. Those three marks are what
 *     make the two form factors read as one page.
 *
 * The content contract is `DefaultProfile`'s, unchanged (#459/#517): centred
 * credential, real-fields stat row, badges hidden when empty, the friend/foe
 * control, and a segmented Chronicles / Quests toggle over the shared
 * `PraxisCard` / `TaskCard` stacked single-column. It renders no field the
 * contract does not expose — in particular the kit's four-up
 * Points/Quests/Huzzahs/Rank grid is three numbers this page already shows, so
 * it stays a three-up row, exactly as `WowProfileBody` decided on desktop.
 *
 * DEVIATIONS
 *  • the CREST does not appear. This is a knight's page, not the Court's: the
 *    header carries the player's own avatar in the gilt ring the crest usually
 *    occupies. `WowProfileBody` makes the same call on desktop.
 *  • the badge row shows the badge NAME only. `BadgeOut` carries a name and a
 *    glyph and no description, so the kit's one-line honour caption has nothing
 *    to render — again matching desktop rather than inventing a field.
 */
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { BadgeOut } from "../../../api/auth";
import { badgeArtFor } from "../../../components/badges/badgeArt";
import PraxisCard from "../../../components/PraxisCard";
import TaskCard from "../../../components/TaskCard";
import {
  WOW_BODY,
  WOW_DEEP,
  WOW_DISPLAY,
  WOW_FIGURE,
  WOW_INK,
  WOW_MUTED,
  WOW_PLATE,
  WOW_RULE,
  WowCheckerBand,
  WowSectionHead,
  WowSpark,
  wowChecker,
  wowMobilePage,
} from "../../../components/cards/wowMobile";
import { factionName } from "../../../utils/factions";
import { mediaUrl } from "../../../utils/media";
import type { ProfileBodyProps } from "../FactionProfileBody";

type Segment = "praxis" | "tasks";

export default function WowProfile({
  character,
  submissions,
  proposedTasks,
  identityActions,
}: ProfileBodyProps) {
  const { t } = useTranslation("common");
  const [segment, setSegment] = useState<Segment>("praxis");
  const badges = character.badges ?? [];

  const stats = [
    { label: t("profile.wow.stats.points"), value: character.score },
    { label: t("profile.wow.stats.praxis"), value: submissions.length },
    { label: t("profile.wow.stats.tasks"), value: proposedTasks.length },
  ];

  return (
    <div
      data-skin="wow"
      data-testid="mobile-profile"
      style={{
        ...wowMobilePage,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-xl)",
        marginLeft: "calc(-1 * var(--space-lg))",
        marginRight: "calc(-1 * var(--space-lg))",
        paddingBottom: "var(--space-xl)",
      }}
    >
      {/* ── the credential, on the pavilion's header wash ── */}
      <header
        style={{
          position: "relative",
          overflow: "hidden",
          textAlign: "center",
          padding: "var(--space-lg)",
          background:
            "linear-gradient(180deg, var(--faction-wow-mobile-header-from), var(--faction-wow-mobile-header-to))",
          borderBottom: `2px solid var(--faction-wow-chronicle-gold)`,
        }}
      >
        <div
          aria-hidden
          style={{ position: "absolute", inset: 0, opacity: 0.12, background: wowChecker(14) }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span
            style={{
              width: 92,
              height: 92,
              borderRadius: "50%",
              background: "var(--faction-wow-avatar-ring)",
              // 4px IS --space-xs; §4a's ring carve-out never covers an
              // on-scale value, so it takes the token.
              padding: "var(--space-xs)",
              boxSizing: "border-box",
            }}
          >
            {character.avatar_url ? (
              <img
                src={mediaUrl(character.avatar_url)}
                alt={character.display_name}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid var(--faction-wow-plum-surface)",
                  boxSizing: "border-box",
                }}
              />
            ) : (
              <span
                aria-hidden
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--faction-wow-avatar-field)",
                  border: "2px solid var(--faction-wow-plum-surface)",
                  boxSizing: "border-box",
                  fontFamily: WOW_DISPLAY,
                  fontSize: "var(--text-heading)",
                  color: WOW_FIGURE,
                }}
              >
                {character.display_name[0]?.toUpperCase()}
              </span>
            )}
          </span>

          <h1
            style={{
              fontFamily: WOW_DISPLAY,
              fontSize: "var(--text-heading)",
              lineHeight: 1.08,
              color: WOW_INK,
              margin: "var(--space-md) 0 0",
              overflowWrap: "anywhere",
            }}
          >
            {character.display_name}
          </h1>
          <div
            style={{
              fontFamily: WOW_BODY,
              fontStyle: "italic",
              fontSize: "var(--text-content)",
              color: WOW_DEEP,
              marginTop: "var(--space-xs)",
            }}
          >
            {t("leaderboard.mobile.factionLevel", {
              faction: factionName(character.faction_slug),
              level: character.level,
            })}
          </div>
          <div className="eyebrow" style={{ fontFamily: WOW_DISPLAY, color: WOW_DEEP }}>
            {t("profile.wow.eyebrow")}
          </div>

          {identityActions && (
            <div style={{ marginTop: "var(--space-lg)", width: "100%", maxWidth: 220 }}>
              {identityActions}
            </div>
          )}
        </div>
      </header>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-xl)",
          paddingLeft: "var(--space-lg)",
          paddingRight: "var(--space-lg)",
        }}
      >
        {/* ── the tally of deeds ── */}
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                textAlign: "center",
                background: WOW_PLATE,
                border: `1px solid ${WOW_RULE}`,
                borderRadius: 7,
                padding: "var(--space-md) var(--space-sm)",
              }}
            >
              <div
                className="content-title"
                style={{ fontFamily: WOW_DISPLAY, lineHeight: 1, color: WOW_FIGURE }}
              >
                {stat.value}
              </div>
              <div className="eyebrow" style={{ color: WOW_MUTED, marginTop: "var(--space-xs)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── honours & credentials — hidden entirely when empty ── */}
        {badges.length > 0 && (
          <section>
            <WowSectionHead>{t("profile.wow.honours")}</WowSectionHead>
            <div
              style={{
                background: WOW_PLATE,
                border: `1px solid ${WOW_RULE}`,
                borderLeft: `4px solid var(--faction-wow-plum-surface)`,
                borderRadius: 7,
                padding: "0 var(--space-lg)",
              }}
            >
              {badges.map((badge, index) => (
                <HonourRow key={badge.key} badge={badge} last={index === badges.length - 1} />
              ))}
            </div>
          </section>
        )}

        {/* ── chronicles / quests ── */}
        <div>
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <SegTab on={segment === "praxis"} onClick={() => setSegment("praxis")}>
              {t("profile.wow.tabPraxis")}
            </SegTab>
            <SegTab on={segment === "tasks"} onClick={() => setSegment("tasks")}>
              {t("profile.wow.tabTasks")}
            </SegTab>
          </div>
          <WowCheckerBand height={3} />
        </div>

        {segment === "praxis" ? (
          submissions.length === 0 ? (
            <Empty>{t("profile.wow.praxisEmpty")}</Empty>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
              {submissions.map((praxis) => (
                <PraxisCard key={praxis.id} praxis={praxis} />
              ))}
            </div>
          )
        ) : proposedTasks.length === 0 ? (
          <Empty>{t("profile.wow.tasksEmpty")}</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
            {proposedTasks.map((task) => (
              <TaskCard key={task.id} task={task} displayPoints={task.point_value} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p
      className="content-text"
      style={{ fontFamily: WOW_BODY, fontStyle: "italic", color: WOW_MUTED, margin: 0 }}
    >
      <WowSpark /> {children}
    </p>
  );
}

/** An honour: the badge glyph struck on a gilt lozenge, then its name. */
function HonourRow({ badge, last }: { badge: BadgeOut; last: boolean }) {
  const Art = badgeArtFor(badge.key);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        padding: "var(--space-md) 0",
        borderBottom: last ? "none" : `1px solid ${WOW_RULE}`,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: "var(--radius-md)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          background:
            "linear-gradient(180deg, var(--faction-wow-avatar-pill-from), var(--faction-wow-avatar-pill-to))",
          border: "1.5px solid var(--faction-wow-avatar-pill-border)",
          color: "var(--faction-wow-avatar-pill-text)",
        }}
      >
        <Art size={16} />
      </span>
      <span
        className="content-text"
        style={{ fontFamily: WOW_DISPLAY, lineHeight: 1.15, color: WOW_INK }}
      >
        {badge.name}
      </span>
    </div>
  );
}

function SegTab({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        minHeight: 46,
        cursor: "pointer",
        fontFamily: WOW_DISPLAY,
        fontSize: "var(--text-xl)",
        letterSpacing: "0.06em",
        color: on ? "var(--faction-wow-quest-text)" : WOW_DEEP,
        background: on
          ? "linear-gradient(180deg, var(--faction-wow-quest-from), var(--faction-wow-quest-to))"
          : WOW_PLATE,
        border: `1.5px solid ${on ? "var(--faction-wow-quest-border)" : WOW_RULE}`,
        borderBottom: "none",
        borderRadius: "7px 7px 0 0",
        padding: "var(--space-sm)",
      }}
    >
      {children}
    </button>
  );
}
