/**
 * WOW MOBILE praxis detail — THE CHRONICLE, OPENED (#901).
 *
 * DERIVED, not drawn — the kit's one mobile screen covers the field desk and the
 * quest row only. Two sources:
 *
 *   • the pavilion chrome from that screen (`components/cards/wowMobile.tsx`);
 *   • the CHRONICLE anatomy of the desktop archetypes — `WowPraxisCard` (#840,
 *     the bound chronicle with a running head) and `WowProfileBody` (#900,
 *     plum-led rows on near-white plates).
 *
 * A quest is ISSUED by decree and proof is RECORDED in the chronicle (ADR-0050),
 * so this screen deliberately does NOT look like `WowTaskDetail`: same palette,
 * same two fonts, same ✦ — different chrome. That mismatch is the archetype.
 *
 * Every behaviour slot is the shared, invariant one (`../shared`) — banners,
 * admin bar, owner actions, flag block, voter breakdown, score breakdown — and
 * the caster is the shared {@link MobileStarVote}, wrapped in
 * `VoteFactionContext.Provider value="wow"` so the logged-out gate speaks the
 * Court's voice rather than the unaffiliated spectrum's (#864).
 *
 * DEVIATION: the crest does NOT appear here. It is the seal of an ISSUING
 * authority; a chronicle is sworn by a knight, so the byline carries the
 * author's own avatar and the ✦ carries the faction. Spending the mark on every
 * screen is what §6 forbids.
 */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import MediaGallery from "../../../components/MediaGallery";
import MarkdownPreview from "../../editPraxis/blocks/MarkdownPreview";
import { formatTimestamp } from "../../../utils/dates";
import { factionName } from "../../../utils/factions";
import {
  WOW_BODY,
  WOW_DEEP,
  WOW_DISPLAY,
  WOW_FIGURE,
  WOW_INK,
  WOW_MUTED,
  WOW_PLUM,
  WOW_RULE,
  WowCheckerBand,
  WowQuestFrame,
  WowSectionHead,
  WowSpark,
  wowMobilePage,
} from "../../../components/cards/wowMobile";
import {
  MemberByline,
  PraxisAdminBar,
  PraxisFlagBlock,
  PraxisOwnerActions,
  PraxisScoreBreakdown,
  PraxisStatusBanners,
  PraxisVoterBreakdown,
} from "../shared";
import { VoteFactionContext } from "../../../components/vote/VoteShell";
import { MobileStarVote } from "./shared";
import type { PraxisDetailState } from "../usePraxisDetail";

export default function WowPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation("praxis");
  const { praxis } = state;
  if (!praxis) return null;

  const sealed = praxis.submitted_at ?? praxis.created_at;
  const initial = (praxis.created_by_display_name || "?")[0]?.toUpperCase() ?? "?";

  return (
    <div
      data-skin="wow"
      style={{
        ...wowMobilePage,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-lg)",
        marginLeft: "calc(-1 * var(--space-lg))",
        marginRight: "calc(-1 * var(--space-lg))",
        paddingLeft: "var(--space-lg)",
        paddingRight: "var(--space-lg)",
        paddingTop: "var(--space-lg)",
        paddingBottom: "var(--space-xl)",
      }}
    >
      {/* invariant behaviour slots */}
      <PraxisStatusBanners state={state} />
      <PraxisAdminBar state={state} />

      {/* ── the chronicle's running head ── */}
      <div>
        <WowCheckerBand height={6} />
        <div
          className="eyebrow"
          style={{
            fontFamily: WOW_DISPLAY,
            color: WOW_DEEP,
            marginTop: "var(--space-sm)",
          }}
        >
          {t("detail.wow.theChronicle")}
        </div>
        <h1
          style={{
            fontFamily: WOW_DISPLAY,
            fontSize: "var(--text-heading)",
            lineHeight: 1.08,
            color: WOW_INK,
            margin: "var(--space-xs) 0 0",
            overflowWrap: "anywhere",
          }}
        >
          {praxis.title ?? t("detail.wow.untitled")}
        </h1>
      </div>

      {/* ── the knight who swore it ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
        <Link to={`/characters/${praxis.created_by_id}`} style={{ flex: "none" }} aria-hidden>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--faction-wow-avatar-ring)",
              color: "var(--faction-wow-avatar-pill-text)",
              fontFamily: WOW_DISPLAY,
              fontSize: "var(--text-content)",
              border: "1.5px solid var(--faction-wow-avatar-pill-border)",
              boxSizing: "border-box",
            }}
          >
            {initial}
          </span>
        </Link>
        <div style={{ minWidth: 0, flex: 1 }}>
          <MemberByline
            praxis={praxis}
            linkStyle={{
              fontFamily: WOW_DISPLAY,
              fontSize: "var(--text-title)",
              lineHeight: 1.1,
              color: WOW_INK,
              textDecoration: "none",
            }}
          />
          <div
            style={{
              fontFamily: WOW_BODY,
              fontStyle: "italic",
              fontSize: "var(--text-content)",
              color: WOW_MUTED,
              marginTop: "var(--space-xs)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {t("mobileFeed.byline", {
              faction: factionName(praxis.created_by_faction_slug),
              time: formatTimestamp(sealed),
            })}
          </div>
        </div>
      </div>

      <PraxisOwnerActions state={state} />

      {/* ── re: the quest ── */}
      <div
        style={{
          borderLeft: `4px solid var(--faction-wow-plum-surface)`,
          paddingLeft: "var(--space-md)",
          fontFamily: WOW_BODY,
          fontSize: "var(--text-content)",
          lineHeight: 1.5,
          color: WOW_MUTED,
        }}
      >
        {t("detail.wow.re")}{" "}
        <Link
          to={`/tasks/${praxis.task_id}`}
          style={{ fontFamily: WOW_DISPLAY, color: WOW_PLUM, textDecoration: "none" }}
        >
          {praxis.task_title}
        </Link>{" "}
        {t("detail.wow.lvlSealed", {
          level: praxis.task_level_required,
          date: formatTimestamp(sealed),
        })}
      </div>

      {/* ── the sworn account ── */}
      {praxis.body_text && (
        <MarkdownPreview
          source={praxis.body_text}
          className="markdown-preview content-text"
          style={{ fontFamily: WOW_BODY, lineHeight: 1.75, color: WOW_INK }}
        />
      )}

      {/* ── evidence presented ── */}
      {praxis.media_items.length > 0 && (
        <section>
          <WowSectionHead>{t("detail.wow.evidence")}</WowSectionHead>
          <WowQuestFrame>
            <div style={{ padding: "var(--space-md)" }}>
              <MediaGallery media={praxis.media_items} layout="grid" />
            </div>
          </WowQuestFrame>
        </section>
      )}

      {/* ── the Court's verdict ── */}
      <WowQuestFrame>
        <div style={{ padding: "var(--space-lg)", textAlign: "center" }}>
          <div
            className="content-title"
            style={{
              fontFamily: WOW_DISPLAY,
              color: WOW_INK,
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-sm)",
            }}
          >
            <WowSpark />
            {t("detail.wow.verdict")}
          </div>
          <div
            aria-hidden
            style={{
              height: 1,
              background: WOW_RULE,
              margin: "var(--space-md) 0",
            }}
          />
          <div style={{ marginBottom: "var(--space-md)" }}>
            <PraxisScoreBreakdown
              state={state}
              align="center"
              accent={WOW_FIGURE}
              font={WOW_DISPLAY}
            />
          </div>
          <VoteFactionContext.Provider value="wow">
            <MobileStarVote praxisId={praxis.id} accent={WOW_PLUM} accentFont={WOW_DISPLAY} />
          </VoteFactionContext.Provider>
        </div>
      </WowQuestFrame>

      {/* invariant behaviour slots */}
      <PraxisFlagBlock state={state} />
      <PraxisVoterBreakdown state={state} />
    </div>
  );
}
