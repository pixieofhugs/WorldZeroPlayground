import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ActivityFeedItem } from "../../api/activityFeed";
import { useRespondToRequest } from "../../hooks/useRespondToRequest";
import { useMyActiveTasks } from "../../hooks/useMyActiveTasks";
import { useGameConfig } from "../../hooks/useGameConfig";
import { useAuth } from "../../auth/AuthContext";
import {
  respondToInvite,
  deletePraxis,
  leavePraxis,
} from "../../api/praxis";
import { extractError } from "../../utils/errors";
import { factionColor } from "../../utils/factions";
import { relativeTime } from "../../utils/dates";
import FeedBadge from "./FeedBadge";

interface Props {
  item: ActivityFeedItem;
}

const DEFAULT_MAX_TASK_SLOTS = 20;

export default function FeedCardCollabInvite({ item }: Props) {
  const {
    praxis_id,
    invite_id,
    task_title,
    task_point_value,
    task_faction_slug,
    task_level_required,
    inviter_character_id,
  } = item.payload;
  const taskColor = factionColor(task_faction_slug);
  const actorColor = factionColor(item.actor_faction_slug);
  const navigate = useNavigate();

  const { user } = useAuth();
  const { accept, decline, loading, status, error } = useRespondToRequest(item);

  // Bank-full drop-to-accept flow (#322). The invitee's task bank can be full;
  // accepting then raises 409 "Task bank is full (N in-progress praxes).". We
  // let them drop one in-progress praxis to make room, then retry the accept.
  const { activeTasks, refetch: refetchActiveTasks } = useMyActiveTasks();
  const gameConfig = useGameConfig();
  const maxTaskSlots = gameConfig?.max_task_signups ?? DEFAULT_MAX_TASK_SLOTS;

  const [showDropModal, setShowDropModal] = useState(false);
  const [dropError, setDropError] = useState("");
  const [dropping, setDropping] = useState(false);

  const handleAccept = async () => {
    const result = await accept();
    if (result.ok) {
      // New members land on the editor so they can contribute; the editor
      // self-locks if the collab is already submitted (controlsLocked). (#298)
      navigate(`/praxes/${result.praxisId ?? praxis_id}/edit`);
      return;
    }
    // The hook swallowed the failure into `error` (rendered below) but doesn't
    // hand back the raw axios error, and its `error` state is stale this tick.
    // Re-issue the accept directly so we can inspect the backend detail: when
    // the invitee's task bank is full, offer to drop one praxis and retry.
    // Match on the detail SUBSTRING (bank-full is 409 on collab, 400 on the
    // duel twin) — not the status code. Other errors stay on the hook's `error`.
    try {
      await respondToInvite(praxis_id, invite_id, true);
      // Raced free between the two calls — land on the collab like happy path.
      navigate(`/praxes/${praxis_id}/edit`);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })
        ?.response?.data?.detail;
      if (typeof detail === "string" && detail.includes("Task bank is full")) {
        setDropError("");
        refetchActiveTasks();
        setShowDropModal(true);
      }
    }
  };

  const handleDecline = () => decline();

  // Drop one in-progress praxis to free a bank slot, then retry the accept.
  // Authored-solo praxes are deleted; joined collabs are left. Never withdraw —
  // withdraw reverts to edit and does NOT free a slot (#322).
  const handleDrop = async (praxisToDropId: number, createdById: number) => {
    setDropping(true);
    setDropError("");
    try {
      if (createdById === user?.character?.id) {
        await deletePraxis(praxisToDropId);
      } else {
        await leavePraxis(praxisToDropId);
      }
      await respondToInvite(praxis_id, invite_id, true);
      setShowDropModal(false);
      navigate(`/praxes/${praxis_id}`);
    } catch (err) {
      setDropError(extractError(err, "Could not drop that task. Try again."));
    } finally {
      setDropping(false);
    }
  };

  const isPending = status === "pending";

  return (
    <>
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
          <span
            className="eyebrow"
            style={{ color: "var(--color-text-tertiary)" }}
          >
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
            <span
              className="eyebrow"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Declined
            </span>
          </div>
        )}
      </div>

      {/* Task-bank-full drop-to-accept modal (#322) */}
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
              Task bank full
            </p>
            <p
              className="font-body"
              style={{
                fontSize: 11,
                marginBottom: 16,
                color: "var(--color-text-secondary)",
              }}
            >
              You have {maxTaskSlots} in-progress tasks. Drop one to accept this
              collaboration:
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
              {activeTasks.map((praxis) => (
                <button
                  key={praxis.id}
                  onClick={() =>
                    handleDrop(praxis.id, praxis.created_by_id)
                  }
                  disabled={dropping}
                  style={{
                    background: "var(--color-bg-surface-alt)",
                    border: "1px solid var(--color-border)",
                    padding: "8px 12px",
                    cursor: dropping ? "not-allowed" : "pointer",
                    textAlign: "left",
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: 10,
                    color: "var(--color-text-primary)",
                  }}
                >
                  Drop: {praxis.title || praxis.task_title}
                </button>
              ))}
            </div>
            {dropError && (
              <p
                className="eyebrow"
                style={{ color: "var(--color-danger)", marginTop: 10 }}
              >
                {dropError}
              </p>
            )}
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
