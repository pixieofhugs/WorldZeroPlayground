import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Trans } from "react-i18next";
import type { ActivityFeedItem } from "../../api/activityFeed";
import { chooseFaction } from "../../api/factions";
import { useAuth } from "../../auth/AuthContext";
import i18n from "../../i18n";
import { extractError } from "../../utils/errors";
import {
  UNAFFILIATED_FACTION_SLUG,
  factionCssVar,
  factionName,
} from "../../utils/factions";
import FeedBadge from "./FeedBadge";

interface Props {
  item: ActivityFeedItem;
  /** The slot's archive write (#1424). Absent in the Archived tab, where the action is restore. */
  onNotNow?: () => void;
}

/** Pure and exported so the branch is testable under `renderToStaticMarkup`. */
type AcceptMode = "one-click" | "confirm-first" | "suppressed";

/**
 * - **suppressed**: letter names the current faction. Still reachable after
 *   #1425 (a letter earned for X while in Y survives joining X; ADR-0019).
 *   `/factions/choose` would 422, so no control; "View Factions" remains.
 * - **one-click**: unaffiliated; a first join destroys nothing (epic #1419 d10).
 * - **confirm-first**: a defection, which bars the old faction for the era.
 *
 * Nullish current slug = unaffiliated (nothing is left behind).
 */
export function acceptMode(
  currentSlug: string | null | undefined,
  letterSlug: string,
): AcceptMode {
  if (currentSlug === letterSlug) return "suppressed";
  if (!currentSlug || currentSlug === UNAFFILIATED_FACTION_SLUG) return "one-click";
  return "confirm-first";
}

/** The control BOX; its face is `.feed-action`, which every user also carries (#1783). */
const CONTROL: CSSProperties = {
  padding: "var(--space-xs) var(--space-lg)",
  border: "none",
  cursor: "pointer",
};

/** The deferral control, and the shape the plain link already had. */
const QUIET: CSSProperties = {
  ...CONTROL,
  background: "transparent",
  color: "var(--color-text-secondary)",
  border: "1px solid var(--color-border)",
};

/**
 * The invitation letter as a payload body in the chassis (#1194); the band
 * draws kicker and timestamp.
 *
 * Controls (#1424), no new backend:
 *  - **Accept** = `POST /factions/choose` (requires the letter since #454);
 *    see {@link acceptMode}.
 *  - **Not now** = the slot's archive write. NOT "Decline": archiving answers
 *    nothing (ADR-0070), the letter stays valid. Label is the letter's
 *    `factions:invitation.dismiss` (#2620).
 *
 * The confirm step is `InvitationLetterPopup`'s inline two-stage idiom.
 *
 * This card ANNOUNCES the letter, it doesn't PREVIEW it (owner ruling, #2620):
 * `feed:invitationLetter.*` and the letter's copy are independent vocabularies
 * by design. Drift between them is not a defect.
 */
export default function FeedCardInvitationLetter({ item, onNotNow }: Props) {
  const { faction_slug } = item.payload;
  // The hue is a FILL (wax seal, #2108).
  const color = factionCssVar(faction_slug);
  // Type uses neutral ink: bare hues ran as low as 2.36:1 on the neutral chassis.
  const ink = "var(--color-text-primary)";

  const { user, applyUser } = useAuth();
  const mode = acceptMode(user?.character?.faction_slug, faction_slug);
  const currentName = factionName(user?.character?.faction_slug ?? UNAFFILIATED_FACTION_SLUG);
  const letterName = factionName(faction_slug);

  const [confirming, setConfirming] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    if (joining) return;
    setJoining(true);
    setError(null);
    try {
      // The POST returns the refreshed viewer (#1383). `chooseFaction` fires
      // the requests bus itself (#2288); don't fire it again here.
      applyUser(await chooseFaction(faction_slug));
      setJoined(true);
      setConfirming(false);
    } catch (err) {
      // `extractError` passes the backend `detail` through: each refusal
      // (rejoin 403, Albescent bar, already-member 422) speaks for itself.
      setError(extractError(err, i18n.t("feed:invitationLetter.error")));
    } finally {
      setJoining(false);
    }
  };

  const acceptStyle: CSSProperties = {
    ...CONTROL,
    background: color,
    color: "var(--color-bg-page)",
    cursor: joining ? "not-allowed" : "pointer",
  };

  const viewFactions = (
    <Link
      to="/factions"
      className="feed-action"
      style={{
        color: ink,
        textDecoration: "none",
      }}
    >
      {i18n.t("feed:invitationLetter.viewFactions")}
    </Link>
  );

  return (
    <div style={{ padding: "var(--space-lg) var(--space-xl)", position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-md)",
        }}
      >
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: envelope emoji used as an icon */}
        <span style={{ fontSize: 16 }}>&#x2709;&#xFE0F;</span>
        <FeedBadge type="your_stuff" label={i18n.t("feed:badge.yourStuff")} />
      </div>

      <p
        className="font-display italic"
        style={{
          fontSize: "var(--text-content)",
          color: "var(--color-text-primary)",
          lineHeight: 1.4,
          marginBottom: "var(--space-sm)",
        }}
      >
        {/* One <Trans> so the faction name stays in the unit; name is tag <1>. */}
        <Trans
          ns="feed"
          i18nKey="invitationLetter.sentence"
          values={{ faction: letterName }}
          components={{ 1: <span style={{ color: ink, fontWeight: 700 }} /> }}
        />
      </p>

      <p
        className="font-body"
        style={{
          fontSize: "var(--text-content)",
          color: "var(--color-text-secondary)",
          marginBottom: "var(--space-md)",
        }}
      >
        {i18n.t("feed:invitationLetter.body")}
      </p>

      {confirming ? (
        <div data-invitation-confirm>
          <p
            className="font-display italic"
            style={{
              fontSize: "var(--text-content)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-xs)",
            }}
          >
            {i18n.t("feed:invitationLetter.confirm.title", {
              current: currentName,
              faction: letterName,
            })}
          </p>
          <p
            className="font-body"
            style={{
              fontSize: "var(--text-content)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-md)",
            }}
          >
            {i18n.t("feed:invitationLetter.confirm.body", { current: currentName })}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
              flexWrap: "wrap",
            }}
          >
            {/* [Cancel] … [Confirm] (#646). Can't mount `JoinConfirm` (own copy,
                one-click mode, joined state); order held by
                `joinControlOrder.test.tsx` (#2656). */}
            <button
              type="button"
              className="feed-action"
              onClick={() => setConfirming(false)}
              disabled={joining}
              style={QUIET}
            >
              {i18n.t("feed:invitationLetter.confirm.cancel")}
            </button>
            <button type="button" className="feed-action" onClick={() => void join()} disabled={joining} style={acceptStyle}>
              {i18n.t("feed:invitationLetter.confirm.confirm")}
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-md)",
            flexWrap: "wrap",
          }}
        >
          {joined ? (
            <span
              className="label-caption"
              style={{ color: ink }}
              data-invitation-accepted
            >
              {i18n.t("feed:invitationLetter.accepted", { faction: letterName })}
            </span>
          ) : (
            <>
              {mode !== "suppressed" && (
                <button
                  type="button"
                  className="feed-action"
                  data-invitation-accept={mode}
                  onClick={() => {
                    if (mode === "confirm-first") setConfirming(true);
                    else void join();
                  }}
                  disabled={joining}
                  style={acceptStyle}
                >
                  {i18n.t("common:actions.accept")}
                </button>
              )}
              {onNotNow && (
                <button type="button" className="feed-action" data-invitation-not-now onClick={onNotNow} style={QUIET}>
                  {i18n.t("factions:invitation.dismiss")}
                </button>
              )}
            </>
          )}
          {viewFactions}
        </div>
      )}

      {error && (
        <p
          className="font-body"
          style={{
            fontSize: "var(--text-content)",
            color: "var(--color-danger)",
            marginTop: "var(--space-sm)",
            marginBottom: 0,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
