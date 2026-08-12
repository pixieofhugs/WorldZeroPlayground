/**
 * WOW MOBILE faction page — THE FIELD PAVILION (#901).
 *
 * DERIVED, not drawn. Two sources:
 *
 *   • the pavilion chrome from the kit's one mobile screen — the crested header
 *     wash, the checker, the gold-framed cream panel
 *     (`components/factionMarks/wowMobile.tsx`);
 *   • the desktop archetype `components/factionHero/WowFactionHero` (#900): the crest
 *     over the name, the motto in Lora italic, the charter's opening, and the
 *     MUSTER as burnt-gold figures. On the phone the muster's gold hairlines
 *     become framed plates, because three hairline-separated columns at 375px
 *     leave the third label two characters wide.
 *
 * `factions.json` already carries the pavilion's own copy from #898 —
 * `wow.mobile.eyebrow` ("The Field Pavilion") and `wow.mobile.subtitle` ("thy
 * crusade, in the palm of thy gauntlet") — and the generic `mobile.*` slot keys
 * every mobile faction page shares.
 *
 * Slots and behaviour are `DefaultFactionPage`'s: hero with real counts, top
 * members, recent praxis, and the invite-gated join model on `state.membership`
 * (ADR-0019). Presentation only.
 *
 * DEVIATION: the kit's hero CTA ("Take the Oath ⚔") is drawn INSIDE the banner;
 * here it lives in the sticky bar instead, so the one real join control is
 * thumb-reachable and so it is rendered only when `membership.state` says the
 * viewer may act ("if you can't use it, you can't see it").
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { factionDescription, factionName } from "../../../utils/factions";
import {
  WOW_BODY,
  WOW_DEEP,
  WOW_DISPLAY,
  WOW_FIGURE,
  WOW_INK,
  WOW_MUTED,
  WOW_PLATE,
  WOW_PLUM,
  WOW_RULE,
  WowPavilionHeader,
  WowSectionHead,
  WowSpark,
  wowGhostButton,
  wowGiltButton,
  wowMobilePage,
} from "../../../components/factionMarks/wowMobile";
import { MobileStickyBar } from "./shared";
import type { CharacterOut } from "../../../api/auth";
import type { FactionDetailState } from "../useFactionDetail";

const NA_SLUG = "na";

export default function WowFactionPage({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation("factions");
  const { faction, members, tasks, recentPraxis, membership } = state;
  const [confirming, setConfirming] = useState(false);

  if (!faction) return null;

  const name = factionName(faction.slug);
  const topMembers = [...members]
    .sort((a, b) => b.all_time_score - a.all_time_score)
    .slice(0, 3);
  const currentSlug = membership.currentFactionSlug;
  const switching = currentSlug && currentSlug !== NA_SLUG;

  const muster = [
    { value: members.length, label: t("mobile.membersStat") },
    { value: tasks.length, label: t("mobile.tasksStat") },
  ];

  return (
    <div
      data-skin="wow"
      data-testid="mobile-faction-page"
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
      <WowPavilionHeader
        eyebrow={t("wow.mobile.eyebrow")}
        name={name}
        byline={t("wow.mobile.subtitle")}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-xl)",
          paddingLeft: "var(--space-lg)",
          paddingRight: "var(--space-lg)",
        }}
      >
        <p
          className="content-text"
          style={{ fontFamily: WOW_BODY, lineHeight: 1.65, color: WOW_INK, margin: 0 }}
        >
          {factionDescription(faction.slug)}
        </p>

        {/* ── the muster ── */}
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          {muster.map((entry) => (
            <div
              key={entry.label}
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
                {entry.value}
              </div>
              <div className="label-caption" style={{ color: WOW_MUTED, marginTop: "var(--space-xs)" }}>
                {entry.label}
              </div>
            </div>
          ))}
        </div>

        {membership.state === "member" && (
          <p
            className="content-text"
            style={{ fontFamily: WOW_DISPLAY, color: WOW_PLUM, margin: 0 }}
          >
            <WowSpark /> {t("mobile.memberBadge")}
          </p>
        )}

        {/* ── the muster roll ── */}
        <section>
          <WowSectionHead>{t("mobile.topMembers")}</WowSectionHead>
          {topMembers.length === 0 ? (
            <p
              className="content-text"
              style={{ fontFamily: WOW_BODY, fontStyle: "italic", color: WOW_MUTED, margin: 0 }}
            >
              {t("mobile.membersEmpty")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              {topMembers.map((member, index) => (
                <MemberRow key={member.id} rank={index + 1} member={member} />
              ))}
            </div>
          )}
        </section>

        {/* ── chronicles recently sealed ── */}
        <section>
          <WowSectionHead>{t("mobile.recentPraxis")}</WowSectionHead>
          {recentPraxis.length === 0 ? (
            <p
              className="content-text"
              style={{ fontFamily: WOW_BODY, fontStyle: "italic", color: WOW_MUTED, margin: 0 }}
            >
              {t("mobile.praxisEmpty")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
              {recentPraxis.map((praxis) => (
                <PraxisCard key={praxis.id} praxis={praxis} />
              ))}
            </div>
          )}
        </section>

        {(membership.state === "gate" || membership.state === "burned") && (
          <p
            className="content-text"
            style={{ fontFamily: WOW_BODY, lineHeight: 1.6, color: WOW_MUTED, margin: 0 }}
          >
            {membership.state === "burned"
              ? t("mobile.burnedHint", { faction: name })
              : t("mobile.gateHint", { faction: name })}
          </p>
        )}
      </div>

      {/* ── take the oath — only an eligible viewer can act (ADR-0019) ── */}
      {membership.state === "eligible" && (
        <MobileStickyBar>
          {membership.joinError && (
            <p
              className="content-text"
              style={{ fontFamily: WOW_BODY, color: "var(--color-danger)", margin: 0 }}
            >
              {membership.joinError}
            </p>
          )}
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="wow-btn"
              style={wowGiltButton}
            >
              <WowSpark color="var(--faction-wow-quest-text)" />
              {t("mobile.join", { faction: name })}
            </button>
          ) : (
            <>
              <p
                className="content-text"
                style={{ fontFamily: WOW_BODY, lineHeight: 1.6, color: WOW_INK, margin: 0 }}
              >
                {switching
                  ? t("detail.join.confirmSwitch", {
                      faction: name,
                      current: factionName(currentSlug),
                    })
                  : t("detail.join.confirm", { faction: name })}
              </p>
              <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                <button
                  type="button"
                  onClick={() => void membership.join()}
                  disabled={membership.joining}
                  className="wow-btn"
                  style={{ ...wowGiltButton, flex: 1, opacity: membership.joining ? 0.6 : 1 }}
                >
                  {membership.joining ? t("mobile.joining") : t("mobile.confirm")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={membership.joining}
                  style={{ ...wowGhostButton, flex: "0 0 auto" }}
                >
                  {t("detail.join.cancel")}
                </button>
              </div>
            </>
          )}
        </MobileStickyBar>
      )}
    </div>
  );
}

/** A roll entry: rank numeral, name, and the knight's tally. */
function MemberRow({ rank, member }: { rank: number; member: CharacterOut }) {
  const { t } = useTranslation("factions");
  return (
    <Link
      to={`/characters/${member.id}`}
      style={{
        minHeight: 46,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        padding: "var(--space-sm) var(--space-lg)",
        background: WOW_PLATE,
        border: `1px solid ${WOW_RULE}`,
        borderLeft: `4px solid var(--faction-wow-plum-surface)`,
        borderRadius: 7,
        textDecoration: "none",
      }}
    >
      <span
        style={{
          flex: "none",
          fontFamily: WOW_DISPLAY,
          fontSize: "var(--text-title)",
          lineHeight: 1,
          color: WOW_FIGURE,
        }}
      >
        {rank}
      </span>
      <span
        className="content-text"
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: WOW_DISPLAY,
          color: WOW_INK,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {member.display_name}
      </span>
      <span className="label-caption" style={{ flex: "none", color: WOW_DEEP }}>
        {t("mobile.memberStat", {
          level: member.level,
          score: member.all_time_score.toLocaleString(),
        })}
      </span>
    </Link>
  );
}
