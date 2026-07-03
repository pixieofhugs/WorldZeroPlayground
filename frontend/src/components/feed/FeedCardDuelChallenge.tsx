import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ActivityFeedItem } from "../../api/activityFeed";
import { useRespondToRequest } from "../../hooks/useRespondToRequest";
import { factionColor } from "../../utils/factions";
import { relativeTime } from "../../utils/dates";
import FeedBadge from "./FeedBadge";

interface Props {
  item: ActivityFeedItem;
}

export default function FeedCardDuelChallenge({ item }: Props) {
  // Duel payload carries duel_id / challenger_praxis_id / duel_status — NOT
  // the collab invite_id / praxis_id / invite_status fields. The shared hook
  // owns the endpoint switch (#346).
  const {
    challenger_praxis_id,
    task_title,
    task_point_value,
    task_faction_slug,
    challenger_character_id,
  } = item.payload;
  const taskColor = factionColor(task_faction_slug);
  const actorColor = factionColor(item.actor_faction_slug);
  const navigate = useNavigate();

  const { accept, decline, loading, status, error } = useRespondToRequest(item);
  // Task-list-full modal state — dormant skeleton, wired by #322/#314.
  const [showDropModal, setShowDropModal] = useState(false);
  const [myTasks] = useState<
    { id: number; task: { id: number; title: string } }[]
  >([]);

  const doAccept = async (drop_task_id?: number) => {
    const result = await accept();
    if (result.ok) {
      if (drop_task_id) {
        // Drop task was selected from modal — handled server-side via the task list
      }
      setShowDropModal(false);
      // Accepting creates the opponent's fresh praxis server-side — land the
      // responder on its editor so they can start working (mirrors collab).
      navigate(
        result.praxisId
          ? `/praxes/${result.praxisId}/edit`
          : `/praxes/${challenger_praxis_id}`,
      );
    }
  };

  const handleAccept = () => doAccept();

  const handleDecline = () => decline();

  const isPending = status === "pending";

  return (
    <>
      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Link to={`/characters/${challenger_character_id}`}>
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
                to={`/characters/${challenger_character_id}`}
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
                has challenged you to a duel
              </span>
              <FeedBadge type="duel" label="Duel" />
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
          <span
            className="eyebrow"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {task_point_value} pts · winner takes the points
          </span>
          <span style={{ fontSize: 12 }}>&#x2694;</span>
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
                background: "var(--badge-duel)",
                color: "var(--color-text-on-accent)",
                border: "none",
                padding: "5px 14px",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Accept Duel
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
              <span
                className="eyebrow"
                style={{ color: "var(--color-danger)" }}
              >
                {error}
              </span>
            )}
          </div>
        )}

        {status === "accepted" && (
          <div style={{ marginTop: 8, marginLeft: 38 }}>
            <Link
              to={`/praxes/${challenger_praxis_id}`}
              className="eyebrow"
              style={{ color: "var(--badge-duel)", textDecoration: "none" }}
            >
              Duel Accepted — view duel
            </Link>
          </div>
        )}
        {status === "declined" && (
          <div style={{ marginTop: 8, marginLeft: 38 }}>
            <span
              className="eyebrow"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Declined
            </span>
          </div>
        )}
      </div>

      {/* Task-list-full modal */}
      {showDropModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowDropModal(false)}
        >
          <div
            style={{
              background: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
              padding: "24px",
              maxWidth: 420,
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              Task list full
            </p>
            <p
              className="font-body"
              style={{
                fontSize: 11,
                marginBottom: 16,
                color: "var(--color-text-secondary)",
              }}
            >
              You have 20 in-progress tasks. Drop one to accept this duel:
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {myTasks.map((ct) => (
                <button
                  key={ct.id}
                  onClick={() => doAccept(ct.task.id)}
                  disabled={loading}
                  style={{
                    background: "var(--color-bg-surface-alt)",
                    border: "1px solid var(--color-border)",
                    padding: "8px 12px",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: 10,
                    color: "var(--color-text-primary)",
                  }}
                >
                  Drop: {ct.task.title}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDropModal(false)}
              style={{
                marginTop: 14,
                fontFamily: "'Courier Prime', monospace",
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                background: "transparent",
                border: "1px solid var(--color-border)",
                padding: "5px 14px",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
