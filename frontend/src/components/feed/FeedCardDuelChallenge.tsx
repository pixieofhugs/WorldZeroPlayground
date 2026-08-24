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

// Duel accept returns 400 "Task bank is full (N in-progress praxes)." when the
// accepter has no free slot — NOT 409 (the collab twin #322 returns 409). Detect
// on the detail substring, not the status code.
const BANK_FULL_MARKER = "Task bank is full";

const DEFAULT_MAX_TASK_SLOTS = 20;

/** The task title's face — identical whether or not it is the body's anchor. */
const TITLE_STYLE = {
  fontSize: "var(--text-content)",
  fontWeight: 700,
  color: "var(--color-text-primary)",
} as const;

/**
 * The duel challenge — a PAYLOAD BODY inside the faction chassis as of #1194
 * (epic #1192 decision 9). `FeedCardRouter` used to warn that this card owns real
 * accept/decline handlers that "must NOT collapse into slots"; that objection was
 * about `FeedRowContent`'s fixed slot bag, and the chassis takes arbitrary
 * children. So this was a strip-the-wrapper refactor and nothing else: every
 * handler, the bank-full drop-and-retry flow, the withdraw path and each state
 * variant are untouched.
 *
 * The one removal is its own timestamp — the chassis band draws that for every
 * card now, and a body that drew it too printed it twice.
 */
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
  // na actors get the spectrum, real factions their tinted disc (ADR-0039) —
  // one call now, with the branch living on the shape rather than here (#1269).
  const actorAvatarFill = factionFill(item.actor_faction_slug, "disc");
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
  // Withdraw is the OPPONENT's mirror of the challenger's composer-chip × (#956):
  // either participant may neutrally call off a still-pending challenge, not only
  // Decline it. Hits the same /duels/{id}/cancel endpoint. Local terminal state
  // so the card settles to a "withdrawn" note once acted on.
  const [withdrawn, setWithdrawn] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  const landOnPraxis = (praxisId: number | null) => {
    // Accepting creates the opponent's fresh praxis server-side — land the
    // responder on its editor so they can start working (mirrors collab).
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

  // Drop the chosen in-progress praxis to free a slot, then retry the accept.
  //   authored solo  → deletePraxis  (removes the praxis)
  //   joined collab  → leavePraxis   (drops your membership)
  // NEVER unsubmitPraxis — it keeps the membership and does not free a slot.
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
      {/* `position: relative` is the overlay's containing block (#1893). It is
          set on the BODY, never on the chassis: the band above (kicker · tag ·
          time · archive ×) is a sibling of this div and must never navigate. */}
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
              {/* One <Trans> sentence so "{name} has challenged you…" stays a
                  translatable unit; the challenger link is tag <1>. */}
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
              ...factionFill(task_faction_slug, "dot"),
              flexShrink: 0,
            }}
          />
          {/* THE BODY'S ANCHOR (#1893). The card's referent is the challenger's
              praxis — the same place the accepted state below already links.
              `challenger_praxis_id` is NULL in the run-up, before the challenger
              has a praxis to point at, and then the body is PLAIN: no overlay,
              no cursor change, and nothing pointing at `/praxis/null`. */}
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

        {/* Accept / Decline / Withdraw buttons */}
        {isPending && !withdrawn && (
          <div
            style={{
              marginTop: "var(--space-md)",
              marginLeft: "var(--space-3xl)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
              flexWrap: "wrap",
              // Discrete on top of the overlay (#1893): Accept / Decline /
              // Withdraw answer the challenge, they never navigate.
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
            {/* Either participant can neutrally call off a pending challenge —
                the opponent's mirror of the challenger's × (#956). */}
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

      {/* Task-list-full modal (#314). Mounted on document.body by the shared
          modal — inside this card it was clipped to the card (#1273). */}
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
