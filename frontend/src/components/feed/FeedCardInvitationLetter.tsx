import { Link } from "react-router-dom";
import { Trans } from "react-i18next";
import type { ActivityFeedItem } from "../../api/activityFeed";
import i18n from "../../i18n";
import { factionCssVar, factionName } from "../../utils/factions";
import FeedBadge from "./FeedBadge";

interface Props {
  item: ActivityFeedItem;
}

/**
 * The faction invitation letter — a PAYLOAD BODY inside the faction chassis as of
 * #1194 (epic #1192 decision 9), not a card that brings its own chrome.
 *
 * It lost its own kicker and its own timestamp: the chassis band draws both for
 * every card now, and a body that drew them too printed each twice. Its content
 * and its link are untouched.
 */
export default function FeedCardInvitationLetter({ item }: Props) {
  const { faction_slug } = item.payload;
  // Scalar ink for both the highlighted name and the link — `na` stays neutral
  // there on purpose (ADR-0039 §2), and the cascade owns the dark half.
  const color = factionCssVar(faction_slug);

  return (
    <div style={{ padding: "var(--space-lg) var(--space-xl)", position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-md)",
        }}
      >
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: envelope emoji used as an icon */}
        <span style={{ fontSize: 16 }}>&#x2709;&#xFE0F;</span>
        <FeedBadge type="your_stuff" label={i18n.t("feed:badge.yourStuff")} />
      </div>

      <p
        className="font-display italic"
        style={{
          fontSize: "var(--text-content)",
          color: "var(--color-text-primary)",
          lineHeight: 1.4,
          marginBottom: "var(--space-sm)",
        }}
      >
        {/* One <Trans> sentence so the faction name stays inside the
            translatable unit; the highlighted name is tag <1>. */}
        <Trans
          ns="feed"
          i18nKey="invitationLetter.sentence"
          values={{ faction: factionName(faction_slug) }}
          components={{ 1: <span style={{ color, fontWeight: 700 }} /> }}
        />
      </p>

      <p
        className="font-body"
        style={{
          fontSize: "var(--text-content)",
          color: "var(--color-text-secondary)",
          marginBottom: "var(--space-md)",
        }}
      >
        {i18n.t("feed:invitationLetter.body")}
      </p>

      <Link
        to="/factions"
        style={{
          fontFamily: "'Courier Prime', monospace",
          fontSize: "var(--text-sm)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color,
          textDecoration: "none",
        }}
      >
        {i18n.t("feed:invitationLetter.viewFactions")}
      </Link>
    </div>
  );
}
