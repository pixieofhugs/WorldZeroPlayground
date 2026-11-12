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
import { cancelChallenge, respondToChallenge } from "../../api/duel";
import { factionFill } from "../../utils/factions";
import { extractError } from "../../utils/errors";
import FeedBadge from "./FeedBadge";
import FeedBankFullModal from "./FeedBankFullModal";
import { FEED_BODY_LIFTED, FeedBodyOverlay } from "./feedBodyTarget";

interface Props {
  item: ActivityFeedItem;
}

// Duel accept returns 400 (not 409 like collab) when the bank is full; match the
// detail substring, not the status.
const BANK_FULL_MARKER = "Task bank is full";

const DEFAULT_MAX_TASK_SLOTS = 20;

/** The task title's face — identical whether or not it is the body's anchor. */
const TITLE_STYLE = {
  fontSize: "var(--text-content)",
  fontWeight: 700,
  color: "var(--color-text-primary)",
} as const;

/**
 * The duel challenge — a payload body inside the faction chassis (#1194). The
 * chassis band draws the timestamp, so the body doesn't.
 */
export default function FeedCardDuelChallenge({ item }: Props) {
  // Duel payload fields, not collab's; the shared hook owns the endpoint (#346).
  const {
    duel_id,
    challenger_praxis_id,
    task_title,
    task_point_value,
    task_faction_slug,
    challenger_character_id,
  } = item.payload;
  // na actors get the spectrum, factions their tinted disc (ADR-0039).
  const actorAvatarFill = factionFill(item.actor_faction_slug, "disc");
  const navigate = useNavigate();

  const { user } = useAuth();
  const gameConfig = useGameConfig();
  const maxTaskSlots = gameConfig?.max_task_signups ?? DEFAULT_MAX_TASK_SLOTS;

  const { accept, decline, loading, status, error } = useRespondToRequest(item);
  // Praxes the viewer can drop to free a bank slot (#314).
  const { activeTasks, refetch: refetchActiveTasks } = useMyActiveTasks();
  const [showDropModal, setShowDropModal] = useState(false);
  // Bank-full swallows the hook error and opens the modal, so drop/retry
  // failures need their own channel.
  const [dropError, setDropError] = useState("");
  const [busy, setBusy] = useState(false);
  // Withdraw: either participant may call off a pending challenge (#956), via
  // /duels/{id}/cancel.
  const [withdrawn, setWithdrawn] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  const landOnPraxis = (praxisId: number | null) => {
    // Accepting creates the opponent's praxis server-side; land on its editor.
    navigate(
      praxisId ? `/praxis/${praxisId}/edit` : `/praxis/${challenger_praxis_id}`,
    );
  };

  const handleAccept = async () => {
    setDropError("");
    const result = await accept();
    if (result.ok) {
      landOnPraxis(result.praxisId);
      return;
    }
    // Bank full → drop modal; any other error stays on the hook's `error`.
    if (result.detail?.includes(BANK_FULL_MARKER)) {
      refetchActiveTasks();
      setShowDropModal(true);
    }
  };

  const handleDecline = () => decline();

  const handleWithdraw = async () => {
    if (withdrawing) return;
    setWithdrawing(true);
    setWithdrawError("");
    try {
      await cancelChallenge(duel_id);
      setWithdrawn(true);
    } catch (err) {
      setWithdrawError(
        extractError(err, i18n.t("feed:duelChallenge.withdrawError")),
      );
    } finally {
      setWithdrawing(false);
    }
  };

  // Drop a praxis to free a slot, then retry: authored solo → delete, joined
  // collab → leave. NEVER unsubmitPraxis — it doesn't free a slot.
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
      // Retry directly (the hook has no drop path).
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
      {/* The body is the overlay's containing block (#1893), never the chassis:
          the band must never navigate. */}
      <div style={{ padding: "var(--space-md) var(--space-lg)", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-md)" }}>
          <Link to={`/characters/${challenger_character_id}`} style={FEED_BODY_LIFTED}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                ...actorAvatarFill,
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
              {/* One <Trans> sentence; the challenger link is tag <1>. */}
              <span
                className="font-body"
                style={{ fontSize: "var(--text-content)", color: "var(--color-text-secondary)" }}
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
                          fontSize: "var(--text-content)",
                          fontWeight: 700,
                          color: "var(--color-text-primary)",
                          textDecoration: "none",
                          ...FEED_BODY_LIFTED,
                        }}
                      />
                    ),
                  }}
                />
              </span>
              <FeedBadge type="duel" label={i18n.t("feed:badge.duel")} />
            </div>
          </div>
        </div>

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
              ...factionFill(task_faction_slug, "dot"),
              flexShrink: 0,
            }}
          />
          {/* The body's anchor (#1893): the challenger's praxis. Its id is NULL
              before that praxis exists, and then the body is plain. */}
          {challenger_praxis_id != null ? (
            <Link
              to={`/praxis/${challenger_praxis_id}`}
              className="font-body"
              style={{ ...TITLE_STYLE, textDecoration: "none" }}
            >
              {task_title}
              <FeedBodyOverlay />
            </Link>
          ) : (
            <span className="font-body" style={TITLE_STYLE}>
              {task_title}
            </span>
          )}
          <span className="label-caption">
            {i18n.t("feed:duelChallenge.taskMeta", { points: task_point_value })}
          </span>
          {/* eslint-disable-next-line local/no-raw-style-values -- ornament: crossed-swords dingbat used as an icon */}
          <span style={{ fontSize: 12 }}>&#x2694;</span>
        </div>

        {isPending && !withdrawn && (
          <div
            style={{
              marginTop: "var(--space-md)",
              marginLeft: "var(--space-3xl)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
              flexWrap: "wrap",
              // Above the overlay (#1893): these answer, never navigate.
              ...FEED_BODY_LIFTED,
            }}
          >
            {/* Face is `.feed-action` (#1783); see FeedCardCollabInvite. */}
            <button
              onClick={handleAccept}
              disabled={loading || busy || withdrawing}
              className="feed-action"
              style={{
                background: "var(--badge-duel)",
                color: "var(--color-text-on-accent)",
                border: "none",
                padding: "var(--space-xs) var(--space-lg)",
                cursor: loading || busy ? "not-allowed" : "pointer",
              }}
            >
              {i18n.t("feed:duelChallenge.accept")}
            </button>
            <button
              onClick={handleDecline}
              disabled={loading || busy || withdrawing}
              className="feed-action"
              style={{
                background: "transparent",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                padding: "var(--space-xs) var(--space-lg)",
                cursor: loading || busy ? "not-allowed" : "pointer",
              }}
            >
              {i18n.t("common:actions.decline")}
            </button>
            {/* The opponent's mirror of the challenger's × (#956). */}
            <button
              onClick={handleWithdraw}
              disabled={loading || busy || withdrawing}
              className="feed-action"
              style={{
                background: "transparent",
                color: "var(--color-text-tertiary)",
                border: "1px solid var(--color-border)",
                padding: "var(--space-xs) var(--space-lg)",
                cursor: loading || busy || withdrawing ? "not-allowed" : "pointer",
              }}
            >
              {i18n.t("feed:duelChallenge.withdraw")}
            </button>
            {error && !showDropModal && (
              <span
                className="label-caption"
                style={{ color: "var(--color-danger)" }}
              >
                {error}
              </span>
            )}
            {withdrawError && (
              <span
                className="label-caption"
                style={{ color: "var(--color-danger)" }}
              >
                {withdrawError}
              </span>
            )}
          </div>
        )}

        {withdrawn && (
          <div style={{ marginTop: "var(--space-sm)", marginLeft: "var(--space-3xl)" }}>
            <span className="label-caption">
              {i18n.t("feed:duelChallenge.withdrawn")}
            </span>
          </div>
        )}

        {status === "accepted" && (
          <div style={{ marginTop: "var(--space-sm)", marginLeft: "var(--space-3xl)" }}>
            <Link
              to={`/praxis/${challenger_praxis_id}`}
              className="label-caption"
              style={{ color: "var(--badge-duel)", textDecoration: "none", ...FEED_BODY_LIFTED }}
            >
              {i18n.t("feed:duelChallenge.accepted")}
            </Link>
          </div>
        )}
        {status === "declined" && (
          <div style={{ marginTop: "var(--space-sm)", marginLeft: "var(--space-3xl)" }}>
            <span className="label-caption">
              {i18n.t("feed:duelChallenge.declined")}
            </span>
          </div>
        )}
      </div>

      {/* Bank-full modal (#314); portalled to document.body (#1273). */}
      {showDropModal && (
        <FeedBankFullModal
          title={i18n.t("feed:duelChallenge.bankFull.title")}
          body={i18n.t("feed:duelChallenge.bankFull.body", {
            max: maxTaskSlots,
          })}
          cancelLabel={i18n.t("feed:duelChallenge.bankFull.cancel")}
          options={activeTasks.map((praxis) => ({
            id: praxis.id,
            label: i18n.t("feed:duelChallenge.bankFull.dropOption", {
              title: praxis.title || praxis.task_title,
            }),
            onSelect: () => dropAndRetry(praxis),
          }))}
          busy={busy}
          error={dropError}
          onDismiss={() => setShowDropModal(false)}
        />
      )}
    </>
  );
}
