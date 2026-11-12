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
import { factionFill } from "../../utils/factions";
import { isTaskBankFull } from "./bankFull";
import FeedBadge from "./FeedBadge";
import FeedBankFullModal from "./FeedBankFullModal";
import { FEED_BODY_LIFTED, FeedBodyOverlay } from "./feedBodyTarget";

interface Props {
  item: ActivityFeedItem;
}

const DEFAULT_MAX_TASK_SLOTS = 20;

/** The task title's face — identical whether or not it is the body's anchor. */
const TITLE_STYLE = {
  fontSize: "var(--text-content)",
  fontWeight: 700,
  color: "var(--color-text-primary)",
} as const;

/**
 * The collaboration invite — a payload body inside the faction chassis (#1194).
 * The chassis band draws the timestamp, so the body doesn't.
 */
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
  // na actors get the spectrum, factions their tinted disc (ADR-0039).
  const actorAvatarFill = factionFill(item.actor_faction_slug, "disc");
  const navigate = useNavigate();

  const { user } = useAuth();
  const { accept, decline, loading, status, error } = useRespondToRequest(item);

  // Bank-full drop-to-accept (#322): drop an in-progress praxis, then retry.
  const { activeTasks, refetch: refetchActiveTasks } = useMyActiveTasks();
  const gameConfig = useGameConfig();
  const maxTaskSlots = gameConfig?.max_task_signups ?? DEFAULT_MAX_TASK_SLOTS;

  const [showDropModal, setShowDropModal] = useState(false);
  const [dropError, setDropError] = useState("");
  const [dropping, setDropping] = useState(false);

  const handleAccept = async () => {
    const result = await accept();
    if (result.ok) {
      // Members land on the editor; it self-locks if already submitted (#298).
      navigate(`/praxis/${result.praxisId ?? praxis_id}/edit`);
      return;
    }
    // The hook's `error` is stale this tick and hides the raw rejection, so
    // re-issue the accept to inspect it. Match the failure, not the status
    // (409 here, 400 on duels).
    try {
      await respondToInvite(praxis_id, invite_id, true);
      // Raced free between the two calls.
      navigate(`/praxis/${praxis_id}/edit`);
    } catch (err) {
      if (isTaskBankFull(err)) {
        setDropError("");
        refetchActiveTasks();
        setShowDropModal(true);
      }
    }
  };

  const handleDecline = () => decline();

  // Authored solo → delete, joined collab → leave. Never withdraw: it doesn't
  // free a slot (#322).
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
      navigate(`/praxis/${praxis_id}`);
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
      {/* The body is the overlay's containing block (#1893), never the chassis:
          the band must never navigate. */}
      <div style={{ padding: "var(--space-md) var(--space-lg)", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-md)" }}>
          <Link to={`/characters/${inviter_character_id}`} style={FEED_BODY_LIFTED}>
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
              {/* One <Trans> sentence; the actor link is tag <1>. */}
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
                          ...FEED_BODY_LIFTED,
                        }}
                      />
                    ),
                  }}
                />
              </span>
              <FeedBadge type="your_stuff" label={i18n.t("feed:badge.yourStuff")} />
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
          {/* The body's anchor (#1893): the praxis you're invited into. A named
              link, so the added tab stop is readable. */}
          {praxis_id != null ? (
            <Link
              to={`/praxis/${praxis_id}`}
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
            {i18n.t("feed:collabInvite.taskMeta", {
              points: task_point_value,
              level: task_level_required,
            })}
          </span>
          <FeedBadge type="collab" label={i18n.t("feed:badge.collab")} />
        </div>

        {isPending && (
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
            {/* Shared face is `.feed-action` (#1783); only fill, rule and
                cursor are this button's own. */}
            <button
              onClick={handleAccept}
              disabled={loading}
              className="feed-action"
              style={{
                background: "var(--badge-collab)",
                color: "var(--color-text-on-accent)",
                border: "none",
                padding: "var(--space-xs) var(--space-lg)",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {i18n.t("common:actions.accept")}
            </button>
            <button
              onClick={handleDecline}
              disabled={loading}
              className="feed-action"
              style={{
                background: "transparent",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                padding: "var(--space-xs) var(--space-lg)",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {i18n.t("common:actions.decline")}
            </button>
            {error && (
              <span className="label-caption" style={{ color: "var(--color-danger)" }}>
                {error}
              </span>
            )}
          </div>
        )}

        {status === "accepted" && (
          <div style={{ marginTop: "var(--space-sm)", marginLeft: "var(--space-3xl)" }}>
            <Link
              to={`/praxis/${praxis_id}`}
              className="label-caption"
              style={{ color: "var(--badge-collab)", textDecoration: "none", ...FEED_BODY_LIFTED }}
            >
              {i18n.t("feed:collabInvite.accepted")}
            </Link>
          </div>
        )}
        {status === "declined" && (
          <div style={{ marginTop: "var(--space-sm)", marginLeft: "var(--space-3xl)" }}>
            <span className="label-caption">
              {i18n.t("feed:collabInvite.declined")}
            </span>
          </div>
        )}
      </div>

      {/* Bank-full modal (#322); portalled to document.body (#1273). */}
      {showDropModal && (
        <FeedBankFullModal
          title={i18n.t("feed:collabInvite.bankFull.title")}
          body={i18n.t("feed:collabInvite.bankFull.body", { max: maxTaskSlots })}
          cancelLabel={i18n.t("feed:collabInvite.bankFull.cancel")}
          options={activeTasks.map((praxis) => ({
            id: praxis.id,
            label: i18n.t("feed:collabInvite.bankFull.dropOption", {
              title: praxis.title || praxis.task_title,
            }),
            onSelect: () => handleDrop(praxis.id, praxis.created_by_id),
          }))}
          busy={dropping}
          error={dropError}
          onDismiss={() => setShowDropModal(false)}
        />
      )}
    </>
  );
}
