import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trans } from "react-i18next";
import type { ActivityFeedItem } from "../../api/activityFeed";
import i18n from "../../i18n";
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
import { factionColor, factionFill, isKnownFaction } from "../../utils/factions";
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
  // `factionColor` has no rainbow fallback — an unregistered slug (`na`, and
  // Albescent since #783) resolves to a flat #6b6a7a grey. That is fine in the
  // scalar contexts below, but a FILLED disc beside six hued ones reads as
  // "broken", so the fills branch to the spectrum like the CSS surfaces do
  // (ADR-0039). Only these two discs change; the six real factions are
  // untouched. See #794 for why there is no scalar spectrum token.
  const taskFill = isKnownFaction(task_faction_slug)
    ? { background: taskColor }
    : factionFill(task_faction_slug, "dot");
  const actorFill = isKnownFaction(item.actor_faction_slug)
    ? { background: `linear-gradient(135deg, ${actorColor}, ${actorColor}88)` }
    : factionFill(item.actor_faction_slug, "dot");
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
      setDropError(
        extractError(err, i18n.t("feed:collabInvite.bankFull.dropError")),
      );
    } finally {
      setDropping(false);
    }
  };

  const isPending = status === "pending";

  return (
    <>
      <div style={{ padding: "var(--space-md) var(--space-lg)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-md)" }}>
          <Link to={`/characters/${inviter_character_id}`}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                ...actorFill,
                flexShrink: 0,
                marginTop: "var(--space-xs)",
              }}
            />
          </Link>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                flexWrap: "wrap",
              }}
            >
              {/* One <Trans> sentence so "{name} invited you…" stays a
                  translatable unit; the actor link is tag <1>. */}
              <span
                className="font-body"
                style={{ fontSize: "var(--text-content)", color: "var(--color-text-secondary)" }}
              >
                <Trans
                  ns="feed"
                  i18nKey="collabInvite.sentence"
                  values={{ name: item.actor_display_name }}
                  components={{
                    1: (
                      <Link
                        to={`/characters/${inviter_character_id}`}
                        className="font-body"
                        style={{
                          fontSize: "var(--text-content)",
                          fontWeight: 700,
                          color: "var(--color-text-primary)",
                          textDecoration: "none",
                        }}
                      />
                    ),
                  }}
                />
              </span>
              <FeedBadge type="your_stuff" label={i18n.t("feed:badge.yourStuff")} />
            </div>
            <span
              className="eyebrow"
              style={{
                color: "var(--color-text-tertiary)",
                display: "block",
                marginTop: "var(--space-xs)",
              }}
            >
              {relativeTime(item.timestamp)}
            </span>
          </div>
        </div>

        {/* Task detail */}
        <div
          style={{
            marginTop: "var(--space-md)",
            marginLeft: "var(--space-3xl)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              ...taskFill,
              flexShrink: 0,
            }}
          />
          <span
            className="font-body"
            style={{
              fontSize: "var(--text-content)",
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
            {i18n.t("feed:collabInvite.taskMeta", {
              points: task_point_value,
              level: task_level_required,
            })}
          </span>
          <FeedBadge type="collab" label={i18n.t("feed:badge.collab")} />
        </div>

        {/* Accept/Decline buttons */}
        {isPending && (
          <div
            style={{
              marginTop: "var(--space-md)",
              marginLeft: "var(--space-3xl)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={handleAccept}
              disabled={loading}
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: "var(--text-sm)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                background: "var(--badge-collab)",
                color: "var(--color-text-on-accent)",
                border: "none",
                padding: "var(--space-xs) var(--space-lg)",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {i18n.t("feed:collabInvite.accept")}
            </button>
            <button
              onClick={handleDecline}
              disabled={loading}
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: "var(--text-sm)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                background: "transparent",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                padding: "var(--space-xs) var(--space-lg)",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {i18n.t("feed:collabInvite.decline")}
            </button>
            {error && (
              <span className="eyebrow" style={{ color: "var(--color-danger)" }}>
                {error}
              </span>
            )}
          </div>
        )}

        {status === "accepted" && (
          <div style={{ marginTop: "var(--space-sm)", marginLeft: "var(--space-3xl)" }}>
            <Link
              to={`/praxes/${praxis_id}`}
              className="eyebrow"
              style={{ color: "var(--badge-collab)", textDecoration: "none" }}
            >
              {i18n.t("feed:collabInvite.accepted")}
            </Link>
          </div>
        )}
        {status === "declined" && (
          <div style={{ marginTop: "var(--space-sm)", marginLeft: "var(--space-3xl)" }}>
            <span
              className="eyebrow"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {i18n.t("feed:collabInvite.declined")}
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
            padding: "var(--space-xl)",
          }}
          onClick={() => setShowDropModal(false)}
        >
          <div
            style={{
              background: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
              padding: "var(--space-xl)",
              maxWidth: 420,
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow" style={{ marginBottom: "var(--space-sm)" }}>
              {i18n.t("feed:collabInvite.bankFull.title")}
            </p>
            <p
              className="font-body"
              style={{
                fontSize: "var(--text-content)",
                marginBottom: "var(--space-lg)",
                color: "var(--color-text-secondary)",
              }}
            >
              {i18n.t("feed:collabInvite.bankFull.body", { max: maxTaskSlots })}
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-sm)",
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
                    padding: "var(--space-sm) var(--space-md)",
                    cursor: dropping ? "not-allowed" : "pointer",
                    textAlign: "left",
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: "var(--text-content)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {i18n.t("feed:collabInvite.bankFull.dropOption", {
                    title: praxis.title || praxis.task_title,
                  })}
                </button>
              ))}
            </div>
            {dropError && (
              <p
                className="eyebrow"
                style={{ color: "var(--color-danger)", marginTop: "var(--space-md)" }}
              >
                {dropError}
              </p>
            )}
            <button
              onClick={() => setShowDropModal(false)}
              style={{
                marginTop: "var(--space-lg)",
                fontFamily: "'Courier Prime', monospace",
                fontSize: "var(--text-sm)",
                fontWeight: 700,
                textTransform: "uppercase",
                background: "transparent",
                border: "1px solid var(--color-border)",
                padding: "var(--space-xs) var(--space-lg)",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
              }}
            >
              {i18n.t("feed:collabInvite.bankFull.cancel")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
