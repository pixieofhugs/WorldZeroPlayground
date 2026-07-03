import { Link, useNavigate } from "react-router-dom";
import type { ActivityFeedItem } from "../../api/activityFeed";
import { useRespondToRequest } from "../../hooks/useRespondToRequest";
import { factionColor } from "../../utils/factions";
import { relativeTime } from "../../utils/dates";
import FeedBadge from "./FeedBadge";

interface Props {
  item: ActivityFeedItem;
}

export default function FeedCardCollabInvite({ item }: Props) {
  const {
    praxis_id,
    task_title,
    task_point_value,
    task_faction_slug,
    task_level_required,
    inviter_character_id,
  } = item.payload;
  const taskColor = factionColor(task_faction_slug);
  const actorColor = factionColor(item.actor_faction_slug);
  const navigate = useNavigate();

  const { accept, decline, loading, status, error } = useRespondToRequest(item);

  const handleAccept = async () => {
    const result = await accept();
    if (result.ok) {
      // New members land on the editor so they can contribute; the editor
      // self-locks if the collab is already submitted (controlsLocked). (#298)
      navigate(`/praxes/${result.praxisId ?? praxis_id}/edit`);
    }
  };

  const handleDecline = () => decline();

  const isPending = status === "pending";

  return (
    <div style={{ padding: "12px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Link to={`/characters/${inviter_character_id}`}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${actorColor}, ${actorColor}88)`,
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
              to={`/characters/${inviter_character_id}`}
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
              invited you to collaborate
            </span>
            <FeedBadge type="your_stuff" label="Your Stuff" />
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

      {/* Task detail */}
      <div
        style={{
          marginTop: 10,
          marginLeft: 38,
          display: "flex",
          alignItems: "center",
          gap: 8,
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
        <span
          className="font-body"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--color-text-primary)",
          }}
        >
          {task_title}
        </span>
        <span className="eyebrow" style={{ color: "var(--color-text-tertiary)" }}>
          {task_point_value} pts · lvl {task_level_required}
        </span>
        <FeedBadge type="collab" label="Collab" />
      </div>

      {/* Accept/Decline buttons */}
      {isPending && (
        <div
          style={{
            marginTop: 10,
            marginLeft: 38,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleAccept}
            disabled={loading}
            style={{
              fontFamily: "'Courier Prime', monospace",
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              background: "var(--badge-collab)",
              color: "var(--color-text-on-accent)",
              border: "none",
              padding: "5px 14px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Accept
          </button>
          <button
            onClick={handleDecline}
            disabled={loading}
            style={{
              fontFamily: "'Courier Prime', monospace",
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              background: "transparent",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              padding: "5px 14px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Decline
          </button>
          {error && (
            <span className="eyebrow" style={{ color: "var(--color-danger)" }}>
              {error}
            </span>
          )}
        </div>
      )}

      {status === "accepted" && (
        <div style={{ marginTop: 8, marginLeft: 38 }}>
          <Link
            to={`/praxes/${praxis_id}`}
            className="eyebrow"
            style={{ color: "var(--badge-collab)", textDecoration: "none" }}
          >
            Accepted — view collaboration
          </Link>
        </div>
      )}
      {status === "declined" && (
        <div style={{ marginTop: 8, marginLeft: 38 }}>
          <span className="eyebrow" style={{ color: "var(--color-text-tertiary)" }}>
            Declined
          </span>
        </div>
      )}
    </div>
  );
}
