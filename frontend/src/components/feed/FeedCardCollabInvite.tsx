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

interface Props {
  item: ActivityFeedItem;
}

const DEFAULT_MAX_TASK_SLOTS = 20;

/**
 * The collaboration invite — a PAYLOAD BODY inside the faction chassis as of
 * #1194 (epic #1192 decision 9). A strip-the-wrapper refactor: the accept /
 * decline handlers, the bank-full drop-and-retry flow and the accepted
 * "✓ Joined / open the praxis" state variant all survive untouched, because the
 * chassis takes arbitrary children rather than a fixed slot bag.
 *
 * The one removal is its own timestamp — the chassis band draws that for every
 * card now, and a body that drew it too printed it twice.
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
  // na actors get the spectrum, real factions their tinted disc (ADR-0039) —
  // one call now, with the branch living on the shape rather than here (#1269).
  const actorAvatarFill = factionFill(item.actor_faction_slug, "disc");
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
      navigate(`/praxis/${result.praxisId ?? praxis_id}/edit`);
      return;
    }
    // The hook swallowed the failure into `error` (rendered below) but doesn't
    // hand back the raw rejection, and its `error` state is stale this tick.
    // Re-issue the accept directly so we can inspect the backend detail: when
    // the invitee's task bank is full, offer to drop one praxis and retry.
    // Match on the FAILURE, not the status code (bank-full is 409 on collab,
    // 400 on the duel twin). Other errors stay on the hook's `error`.
    try {
      await respondToInvite(praxis_id, invite_id, true);
      // Raced free between the two calls — land on the collab like happy path.
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
      <div style={{ padding: "var(--space-md) var(--space-lg)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-md)" }}>
          <Link to={`/characters/${inviter_character_id}`}>
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
          <span className="label-caption">
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
              style={{ color: "var(--badge-collab)", textDecoration: "none" }}
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

      {/* Task-bank-full drop-to-accept modal (#322). Mounted on document.body
          by the shared modal — inside this card it was clipped to the card
          (#1273). */}
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
