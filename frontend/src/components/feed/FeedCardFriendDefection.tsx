import { Link } from "react-router-dom";
import type { ActivityFeedItem } from "../../api/activityFeed";
import { factionColor } from "../../utils/factions";
import { relativeTime } from "../../utils/dates";
import FeedBadge from "./FeedBadge";

interface Props {
  item: ActivityFeedItem;
}

export default function FeedCardFriendDefection({ item }: Props) {
  const {
    character_id,
    old_faction_slug,
    old_faction_name,
    new_faction_slug,
    new_faction_name,
  } = item.payload;
  const newColor = factionColor(new_faction_slug);
  const oldColor = factionColor(old_faction_slug);

  return (
    <div style={{ padding: "12px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Link to={`/characters/${character_id}`}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${newColor}, ${newColor}88)`,
              flexShrink: 0,
              marginTop: 2,
            }}
          />
        </Link>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <Link
              to={`/characters/${character_id}`}
              className="font-body"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                textDecoration: "none",
              }}
            >
              {item.actor_display_name}
            </Link>
            <span
              className="font-body"
              style={{ fontSize: 11, color: "var(--color-text-secondary)" }}
            >
              defected from{" "}
              <span style={{ color: oldColor, fontWeight: 600 }}>
                {old_faction_name}
              </span>
              {" to "}
              <span style={{ color: newColor, fontWeight: 600 }}>
                {new_faction_name}
              </span>
            </span>
            <FeedBadge type="friend" label="Friend" />
          </div>
          <span
            className="eyebrow"
            style={{
              color: "var(--color-text-tertiary)",
              display: "block",
              marginTop: 2,
            }}
          >
            {relativeTime(item.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}
