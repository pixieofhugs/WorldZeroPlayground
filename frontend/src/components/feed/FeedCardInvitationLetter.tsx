import { Link } from "react-router-dom";
import { Trans } from "react-i18next";
import type { ActivityFeedItem } from "../../api/activityFeed";
import i18n from "../../i18n";
import { factionColor } from "../../utils/factions";
import { relativeTime } from "../../utils/dates";
import FeedBadge from "./FeedBadge";

interface Props {
  item: ActivityFeedItem;
}

export default function FeedCardInvitationLetter({ item }: Props) {
  const { faction_slug, faction_name } = item.payload;
  const color = factionColor(faction_slug);

  return (
    <div style={{ padding: "16px 20px", position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 16 }}>&#x2709;&#xFE0F;</span>
        <span className="eyebrow" style={{ color, fontSize: 8 }}>
          {i18n.t("feed:invitationLetter.kicker")}
        </span>
        <FeedBadge type="your_stuff" label={i18n.t("feed:badge.yourStuff")} />
        <span
          className="eyebrow"
          style={{
            marginLeft: "auto",
            color: "var(--color-text-tertiary)",
            fontSize: 8,
          }}
        >
          {relativeTime(item.timestamp)}
        </span>
      </div>

      <p
        className="font-display italic"
        style={{
          fontSize: 14,
          color: "var(--color-text-primary)",
          lineHeight: 1.4,
          marginBottom: 8,
        }}
      >
        {/* One <Trans> sentence so the faction name stays inside the
            translatable unit; the highlighted name is tag <1>. */}
        <Trans
          ns="feed"
          i18nKey="invitationLetter.sentence"
          values={{ faction: faction_name }}
          components={{ 1: <span style={{ color, fontWeight: 700 }} /> }}
        />
      </p>

      <p
        className="font-body"
        style={{
          fontSize: 10,
          color: "var(--color-text-secondary)",
          marginBottom: 12,
        }}
      >
        {i18n.t("feed:invitationLetter.body")}
      </p>

      <Link
        to="/factions"
        style={{
          fontFamily: "'Courier Prime', monospace",
          fontSize: 9,
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
