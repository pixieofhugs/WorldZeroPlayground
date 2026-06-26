import { Link } from "react-router-dom";
import type { ActivityFeedItem } from "../../api/activityFeed";
import { factionColor } from "../../utils/factions";
import { relativeTime } from "../../utils/dates";
import FeedBadge from "./FeedBadge";

interface Props {
  item: ActivityFeedItem;
}

export default function FeedCardGlobalTask({ item }: Props) {
  const {
    task_id,
    task_title,
    task_point_value,
    task_level_required,
    task_faction_slug,
  } = item.payload;
  const taskColor = factionColor(task_faction_slug);

  return (
    <div style={{ padding: "12px 16px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 12 }}>&#x23F0;</span>
        <span
          className="font-body"
          style={{ fontSize: 11, color: "var(--color-text-secondary)" }}
        >
          A new task has been activated
        </span>
        <FeedBadge type="global" label="Global" />
        <span style={{ marginLeft: "auto" }}>
          <span
            className="eyebrow"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {relativeTime(item.timestamp)}
          </span>
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginLeft: 22,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: taskColor,
            flexShrink: 0,
          }}
        />
        <Link
          to={`/tasks/${task_id}`}
          className="font-body"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--color-text-primary)",
            textDecoration: "none",
          }}
        >
          {task_title}
        </Link>
        <span
          className="eyebrow"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {task_point_value} pts · lvl {task_level_required}
        </span>
      </div>
    </div>
  );
}
