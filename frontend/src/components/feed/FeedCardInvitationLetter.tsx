import { Link } from "react-router-dom";
import type { ActivityFeedItem } from "../../api/activityFeed";
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
          Faction Invitation
        </span>
        <FeedBadge type="your_stuff" label="Your Stuff" />
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
        You've received an invitation to join{" "}
        <span style={{ color, fontWeight: 700 }}>{faction_name}</span>.
      </p>

      <p
        className="font-body"
        style={{
          fontSize: 10,
          color: "var(--color-text-secondary)",
          marginBottom: 12,
        }}
      >
        Complete faction tasks to prove your dedication, or visit the factions
        page to make your choice.
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
        View Factions &rarr;
      </Link>
    </div>
  );
}
