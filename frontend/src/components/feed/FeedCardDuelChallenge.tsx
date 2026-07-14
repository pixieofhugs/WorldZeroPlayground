import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trans } from "react-i18next";
import type { ActivityFeedItem } from "../../api/activityFeed";
import i18n from "../../i18n";
import { useRespondToRequest } from "../../hooks/useRespondToRequest";
import { useMyActiveTasks } from "../../hooks/useMyActiveTasks";
import { useGameConfig } from "../../hooks/useGameConfig";
import { useAuth } from "../../auth/AuthContext";
import { deletePraxis, leavePraxis } from "../../api/praxis";
import { respondToChallenge } from "../../api/duel";
import { factionColor } from "../../utils/factions";
import { relativeTime } from "../../utils/dates";
import { extractError } from "../../utils/errors";
import FeedBadge from "./FeedBadge";

interface Props {
  item: ActivityFeedItem;
}

// Duel accept returns 400 "Task bank is full (N in-progress praxes)." when the
// accepter has no free slot — NOT 409 (the collab twin #322 returns 409). Detect
// on the detail substring, not the status code.
const BANK_FULL_MARKER = "Task bank is full";

const DEFAULT_MAX_TASK_SLOTS = 20;

export default function FeedCardDuelChallenge({ item }: Props) {
  // Duel payload carries duel_id / challenger_praxis_id / duel_status — NOT
  // the collab invite_id / praxis_id / invite_status fields. The shared hook
  // owns the endpoint switch (#346).
  const {
    duel_id,
    challenger_praxis_id,
    task_title,
    task_point_value,
    task_faction_slug,
    challenger_character_id,
  } = item.payload;
  const taskColor = factionColor(task_faction_slug);
  const actorColor = factionColor(item.actor_faction_slug);
  const navigate = useNavigate();

  const { user } = useAuth();
  const gameConfig = useGameConfig();
  const maxTaskSlots = gameConfig?.max_task_signups ?? DEFAULT_MAX_TASK_SLOTS;

  const { accept, decline, loading, status, error } = useRespondToRequest(item);
  // In-progress praxes the viewer can drop to free a bank slot (#314).
  const { activeTasks, refetch: refetchActiveTasks } = useMyActiveTasks();
  const [showDropModal, setShowDropModal] = useState(false);
  // Local error surface: the bank-full path swallows the hook error and opens
  // the modal instead, so we need our own channel for drop/retry failures.
  const [dropError, setDropError] = useState("");
  const [busy, setBusy] = useState(false);

  const landOnPraxis = (praxisId: number | null) => {
    // Accepting creates the opponent's fresh praxis server-side — land the
    // responder on its editor so they can start working (mirrors collab).
    navigate(
      praxisId ? `/praxes/${praxisId}/edit` : `/praxes/${challenger_praxis_id}`,
    );
  };

  const handleAccept = async () => {
    setDropError("");
    const result = await accept();
    if (result.ok) {
      landOnPraxis(result.praxisId);
      return;
    }
    // The hook already set `error` from the backend detail. If the accept
    // failed because the viewer's task bank is full, surface the drop modal
    // instead of the generic message; any other error falls through to the
    // inline `error` the hook exposes.
    if (result.detail?.includes(BANK_FULL_MARKER)) {
      refetchActiveTasks();
      setShowDropModal(true);
    }
  };

  const handleDecline = () => decline();

  // Drop the chosen in-progress praxis to free a slot, then retry the accept.
  //   authored solo  → deletePraxis  (removes the praxis)
  //   joined collab  → leavePraxis   (drops your membership)
  // NEVER withdrawPraxis — it keeps the membership and does not free a slot.
  const dropAndRetry = async (praxis: {
    id: number;
    created_by_id: number;
  }) => {
    if (busy) return;
    setBusy(true);
    setDropError("");
    try {
      const mine = user?.character?.id;
      if (mine !== undefined && praxis.created_by_id === mine) {
        await deletePraxis(praxis.id);
      } else {
        await leavePraxis(praxis.id);
      }
      // Slot freed — retry the accept directly (the hook has no drop path).
      const duel = await respondToChallenge(duel_id, { accept: true });
      setShowDropModal(false);
      landOnPraxis(duel.opponent_praxis_id);
    } catch (err) {
      setDropError(
        extractError(err, i18n.t("feed:duelChallenge.bankFull.dropError")),
      );
    } finally {
      setBusy(false);
    }
  };

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
              {/* One <Trans> sentence so "{name} has challenged you…" stays a
                  translatable unit; the challenger link is tag <1>. */}
              <span
                className="font-body"
                style={{ fontSize: 11, color: "var(--color-text-secondary)" }}
              >
                <Trans
                  ns="feed"
                  i18nKey="duelChallenge.sentence"
                  values={{ name: item.actor_display_name }}
                  components={{
                    1: (
                      <Link
                        to={`/characters/${challenger_character_id}`}
                        className="font-body"
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--color-text-primary)",
                          textDecoration: "none",
                        }}
                      />
                    ),
                  }}
                />
              </span>
              <FeedBadge type="duel" label={i18n.t("feed:badge.duel")} />
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
            {i18n.t("feed:duelChallenge.taskMeta", { points: task_point_value })}
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
              disabled={loading || busy}
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
                cursor: loading || busy ? "not-allowed" : "pointer",
              }}
            >
              {i18n.t("feed:duelChallenge.accept")}
            </button>
            <button
              onClick={handleDecline}
              disabled={loading || busy}
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
                cursor: loading || busy ? "not-allowed" : "pointer",
              }}
            >
              {i18n.t("feed:duelChallenge.decline")}
            </button>
            {error && !showDropModal && (
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
              {i18n.t("feed:duelChallenge.accepted")}
            </Link>
          </div>
        )}
        {status === "declined" && (
          <div style={{ marginTop: 8, marginLeft: 38 }}>
            <span
              className="eyebrow"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {i18n.t("feed:duelChallenge.declined")}
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
              {i18n.t("feed:duelChallenge.bankFull.title")}
            </p>
            <p
              className="font-body"
              style={{
                fontSize: 11,
                marginBottom: 16,
                color: "var(--color-text-secondary)",
              }}
            >
              {i18n.t("feed:duelChallenge.bankFull.body", { max: maxTaskSlots })}
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
                  onClick={() => dropAndRetry(praxis)}
                  disabled={busy}
                  style={{
                    background: "var(--color-bg-surface-alt)",
                    border: "1px solid var(--color-border)",
                    padding: "8px 12px",
                    cursor: busy ? "not-allowed" : "pointer",
                    textAlign: "left",
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: 10,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {i18n.t("feed:duelChallenge.bankFull.dropOption", {
                    title: praxis.title || praxis.task_title,
                  })}
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
              {i18n.t("feed:duelChallenge.bankFull.cancel")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
