import { Link } from "react-router-dom";
import { Trans } from "react-i18next";
import type { ActivityFeedItem } from "../../api/activityFeed";
import i18n from "../../i18n";
import { factionColor, factionName } from "../../utils/factions";
import { relativeTime } from "../../utils/dates";
import FeedBadge from "./FeedBadge";

interface Props {
  item: ActivityFeedItem;
}

export default function FeedCardInvitationLetter({ item }: Props) {
  const { faction_slug } = item.payload;
  // Audited in #783: every use below is SCALAR (`color:`), so the #6b6a7a grey
  // an unregistered slug resolves to is the correct answer, not a gap. The
  // spectrum has no scalar form — `factionFill` returns a background and knows
  // only bar/dot/pill (#794) — and inventing one here would mean a new token.
  // Albescent lands on that grey deliberately: a letter set in the society's
  // own ink would announce it before the player has been revealed.
  const color = factionColor(faction_slug);

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
        <span className="eyebrow" style={{ color }}>
          {i18n.t("feed:invitationLetter.kicker")}
        </span>
        <FeedBadge type="your_stuff" label={i18n.t("feed:badge.yourStuff")} />
        <span
          className="eyebrow"
          style={{
            marginLeft: "auto",
            color: "var(--color-text-tertiary)",
          }}
        >
          {relativeTime(item.timestamp)}
        </span>
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
