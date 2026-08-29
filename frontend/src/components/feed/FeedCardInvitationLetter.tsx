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
  /**
   * "Not now" — the slot's own archive write, handed down by `FeedCardRouter`
   * (#1424). Absent in the Archived tab, where the slot's action is *restore*
   * and a "Not now" that un-archived would be a lie.
   */
  onNotNow?: () => void;
}

/**
 * The three states `Accept` can be in for a (current faction, letter faction)
 * pair. Pure, exported, and tested directly: the harness is
 * `renderToStaticMarkup`, so the branch is provable but the click is not.
 */
type AcceptMode = "one-click" | "confirm-first" | "suppressed";

/**
 * Which `Accept` a holder of this letter gets.
 *
 * - **suppressed** — the letter names the faction the character is already in.
 *   Reachable *even after #1425 stopped delivering them*: a letter earned for X
 *   while in Y stays on the account after joining X, and that row is
 *   indistinguishable from the legacy bug row it also gates sibling-character
 *   creation with (ADR-0019). `POST /factions/choose` answers those 422
 *   "Already a member of this faction.", so the control is not drawn at all —
 *   the card falls back to `View Factions →` (CLAUDE.md: hide, never disable).
 * - **one-click** — unaffiliated. A first join destroys nothing, so a dialog in
 *   front of the happy path would only be noise (epic #1419 decision 10).
 * - **confirm-first** — affiliated with a *different* real faction. Accepting is
 *   a defection: `defect_to_faction` writes a `FactionDefectionHistory` row and
 *   `can_join_faction` then bars the faction being left for the rest of the era.
 *   Next to a fast triage queue's "Still waiting" skip, an unguarded click there
 *   costs a player an era.
 *
 * A nullish current slug is treated as unaffiliated: `/updates` is a protected
 * route so a character always exists, and the safe reading of "no faction
 * recorded" is that nothing is being left behind.
 */
export function acceptMode(
  currentSlug: string | null | undefined,
  letterSlug: string,
): AcceptMode {
  if (currentSlug === letterSlug) return "suppressed";
  if (!currentSlug || currentSlug === UNAFFILIATED_FACTION_SLUG) return "one-click";
  return "confirm-first";
}

/**
 * The BOX a feed control wears. Its FACE — font, size, weight, casing,
 * tracking — is `.feed-action`, so every element styled from here also carries
 * that class (#1783). Those five declarations used to sit at the top of this
 * object and again on the "view factions" link below, and again twice over in
 * FeedCardCollabInvite, three times in FeedCardDuelChallenge and once in
 * FeedBankFullModal: eight copies of one label, which is how the feed's
 * controls and `.btn-*` came to sit on two different rungs of the same ramp.
 */
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
 * The faction invitation letter — a PAYLOAD BODY inside the faction chassis as of
 * #1194 (epic #1192 decision 9), not a card that brings its own chrome.
 *
 * It lost its own kicker and its own timestamp: the chassis band draws both for
 * every card now, and a body that drew them too printed each twice.
 *
 * #1424 gave it the pair of controls that let it sit in the Requests queue and
 * ever leave it — `Accept` and `Not now`. Both are zero new backend:
 *
 *  - **Accept** is `POST /factions/choose`, which since #454 already *requires*
 *    holding that faction's current-era letter. It always was the accept
 *    endpoint. See {@link acceptMode} for the three branches it has.
 *  - **Not now** is the slot's existing archive write, wearing a label. It is
 *    emphatically **not** "Decline": ADR-0070 says archiving never answers
 *    anything, the letter stays valid, the factions page still joins, and
 *    `InvitationLetter` has no status column to decline into. Its label is the
 *    letter's own `factions:invitation.dismiss`, the one key both surfaces read
 *    for this act (#2620) — the only string this card and the letter share.
 *
 * The confirm step is the inline two-stage idiom `InvitationLetterPopup` already
 * uses for the same act — prose plus [confirm] [cancel] replacing the button
 * row — not a new dialog component.
 *
 * **This card ANNOUNCES the letter; it does not PREVIEW it** (owner ruling on
 * #2620, 2026-08-26). Everything else it says is its own: it reads no
 * `factions:<slug>.invitation.*` headline, pitch, perk or CTA, and "View
 * Factions" sends the player to the factions page rather than opening the
 * letter. So `feed:invitationLetter.*` and the letter's copy are two
 * independent vocabularies **by design** — when they drift apart in a copy
 * sweep, that is not a defect to file, and nothing here should be pointed at
 * the letter's keys to "align" them.
 */
export default function FeedCardInvitationLetter({ item, onNotNow }: Props) {
  const { faction_slug } = item.payload;
  // The faction's hue, and it is a FILL: the wax seal's disc below (#2108).
  // `na` stays neutral there on purpose (ADR-0039 §2), and the cascade owns the
  // dark half.
  const color = factionCssVar(faction_slug);
  // The TYPE on this card takes a neutral tier instead. The letter sits on the
  // neutral feed chassis, where the bare hue ran 2.36:1 (Ephemerists), 2.67:1
  // (S.N.I.D.E.) and 3.10:1 (Coven) in light — under the 4.5:1 every one of the
  // three sites below owes. `.feed-action` sets face and size but no colour, so
  // the link needs one stated.
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
      // The character's faction is on /auth/me and dresses most of the site, so
      // the feed alone is not enough — but the join POST now answers the whole
      // refreshed viewer (#1383), so adopting it replaces the /auth/me that
      // used to chase it. The bell and the queue count still follow: since
      // #2288 `chooseFaction` fires the requests bus itself, for the three other
      // join surfaces that never did. Do not fire it again here.
      applyUser(await chooseFaction(faction_slug));
      setJoined(true);
      setConfirming(false);
    } catch (err) {
      // `extractError` returns the backend `detail` verbatim, which is what
      // makes each refusal legible rather than generic: "Cannot rejoin a faction
      // you have left." (403), the ADR-0021 Albescent eligibility bar (403) and
      // "Already a member of this faction." (422) all speak for themselves.
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
        {/* One <Trans> sentence so the faction name stays inside the
            translatable unit; the highlighted name is tag <1>. */}
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
            {/* [Cancel] … [Confirm] — the global footer order (#646), the same
                ruling `JoinConfirm` now carries for the faction pages and the
                invitation letter. This card cannot mount that control: its
                confirm step is two paragraphs of its own copy, it has a
                one-click branch for an unaffiliated holder (epic #1419
                decision 10) and a terminal "joined" state the trio knows
                nothing about. So it keeps its own pair, and
                `joinControlOrder.test.tsx` keeps this order honest (#2656). */}
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
