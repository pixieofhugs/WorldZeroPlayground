/**
 * CharacterProfile — the public player profile (#459, ADR-0033).
 *
 * One faction-agnostic contract; the skin is picked client-side from
 * `faction_slug` by FactionProfileBody (default spectrum-band skin until a
 * faction's bespoke body lands, #460). This page owns data fetching and the
 * friend/foe relationship state; all rendering lives in the profile bodies.
 *
 * There is no form-factor branch here (#1319). Each profile body is ONE
 * responsive component that reads `useFormFactor()` itself — the same shape
 * `<Faction>TaskDetail` uses — so this page dispatches on slug alone.
 *
 * Public view: no self-edit affordance here (the credential card is the
 * identity header; editing moves to the account's own surfaces).
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/apiError";
import { getCharacter } from "../api/characters";
import { listPraxes } from "../api/praxis";
import { listTasks } from "../api/tasks";
import { useResource } from "../hooks/useResource";
import {
  listRelationships,
  createRelationship,
  deleteRelationship,
  listBlocks,
  blockCharacter,
  unblockCharacter,
  type RelationshipListItem,
} from "../api/relationships";
import RelationshipBlockControl from "./characterProfile/RelationshipBlockControl";
import { useAuth } from "../auth/AuthContext";
import { useGameConfig } from "../hooks/useGameConfig";
import { useTaskSignup } from "../hooks/useTaskSignup";
import { extractError } from "../utils/errors";
import { factionFill } from "../utils/factions";
import { levelTrack } from "../utils/levelTrack";
import { useFactionBackdrop } from "../components/backdrop/BackdropContext";
import FactionProfileBody, {
  type ProfileBodyProps,
  type ProfileProgression,
} from "./characterProfile/FactionProfileBody";

/**
 * The identity header's status pill, minus its `background`.
 *
 * Two rows wear it now — the friend/foe edge and the block — because ADR-0077
 * made them two records instead of one field with two meanings. Shared so they
 * cannot drift apart; the caller supplies only the hue that distinguishes them.
 */
const statusPillStyle: React.CSSProperties = {
  color: "var(--color-text-on-accent)",
  fontFamily: "'Courier Prime', monospace",
  fontSize: "var(--text-md)",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  padding: "var(--space-xs) 0",
  textAlign: "center",
  borderRadius: 2,
};

/** The undo beneath a status pill — `remove` and `unblock` read identically. */
const quietButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  textAlign: "center",
};

export default function CharacterProfile() {
  const { t } = useTranslation("common");
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const gameConfig = useGameConfig();
  // A profile's task list OFFERS its tasks (#2188). The gate is the viewer, not
  // `can_sign_up` — the card reads the server's reason itself and says why.
  const { signupMsg, handleSignup } = useTaskSignup();
  const { data, loading, error } = useResource(
    () => {
      const cid = Number(id);
      return Promise.all([
        getCharacter(cid),
        // A profile is a career record, not a feed of current activity: it shows
        // what this player has done regardless of era (owner ruling, #1362).
        // Without this the grid inherits the new `this_era` default and reads
        // empty for everyone the morning after an era reset — and it disagrees
        // with GET /characters/{id}/praxes, which stays all-eras.
        listPraxes({ character_id: cid, era_scope: "all_eras" }),
        listTasks({ created_by: cid }),
      ]);
    },
    [id],
  );
  const character = data?.[0] ?? null;
  const submissions = data?.[1] ?? [];
  const proposedTasks = data?.[2] ?? [];
  const [relationship, setRelationship] = useState<RelationshipListItem | null>(
    null,
  );
  const [relationshipLoading, setRelationshipLoading] = useState(false);
  // Whether the VIEWER has blocked this character. A block is its own record
  // now (ADR-0077), independent of any friend/foe edge, so it is its own piece
  // of state rather than a status read off one.
  const [blocked, setBlocked] = useState(false);

  // Theme the page backdrop to this character's faction (falls back to the
  // global watercolor until loaded / for factions with no backdrop variant).
  useFactionBackdrop(character?.faction_slug);

  useEffect(() => {
    if (!id || !user?.character) return;
    const cid = parseInt(id, 10);
    if (user.character.id === cid) return;
    listRelationships()
      .then((rels) => {
        const match = rels.find(
          (r) => r.to_character_id === cid,
        );
        setRelationship(match ?? null);
      })
      .catch(() => {});
    // Outgoing only, always: this answers "have I blocked them", and there is
    // no route that answers "have they blocked me". A block is silent to the
    // party it names (ADR-0077), and that silence is structural here — the
    // blocked side has nothing to render a label from, so there is no branch
    // that could leak one.
    listBlocks()
      .then((blocks) => setBlocked(blocks.some((b) => b.character_id === cid)))
      .catch(() => {});
    // Keyed on the viewer's character id, not the whole auth object (#1390):
    // `/auth/me` returns a new object on every refetch, so `[user]` re-read the
    // whole relationship list every time the viewer cast a star.
  }, [id, user?.character?.id]);

  const [relationshipError, setRelationshipError] = useState<string | null>(
    null,
  );

  const handleAddRelationship = async (type: "friend" | "foe") => {
    if (!character) return;
    setRelationshipLoading(true);
    setRelationshipError(null);
    try {
      // The POST answers the enriched item, display data and all (#1383) —
      // it used to answer the bare row, so this re-listed every relationship
      // the viewer holds just to find the one it had written.
      setRelationship(await createRelationship(character.id, type));
    } catch (err: unknown) {
      // Handle 409 (already exists) gracefully — re-fetch existing relationship.
      // This one stays a list read: the write FAILED, so there is no response
      // body carrying the edge that already existed.
      //
      // Read through `ApiError` rather than duck-typing a `.response.status`.
      // The duck-typed form was written for axios and kept working here only by
      // accident: `ApiError` happens to carry a field called `response` holding
      // a fetch `Response`, which happens to expose `.status`. Two coincidences
      // deep is not a contract, and `apiError.ts` is import-free precisely so a
      // page can name the real type without pulling the transport onto its
      // load path.
      if (err instanceof ApiError && err.status === 409) {
        const rels = await listRelationships();
        const match = rels.find(
          (r) => r.to_character_id === character.id,
        );
        setRelationship(match ?? null);
      } else {
        setRelationshipError("Could not add relationship.");
      }
    } finally {
      setRelationshipLoading(false);
    }
  };

  const handleRemoveRelationship = async () => {
    if (!relationship) return;
    setRelationshipLoading(true);
    setRelationshipError(null);
    try {
      await deleteRelationship(relationship.id);
      setRelationship(null);
    } catch {
      setRelationshipError("Could not remove relationship.");
    } finally {
      setRelationshipLoading(false);
    }
  };

  // ADR-0077 — a block is its own record: it needs no edge, creates none, and
  // leaves any edge the viewer already holds alive but silenced. So neither
  // handler touches `relationship`. The confirm that precedes the block lives in
  // RelationshipBlockControl; by the time it calls, the player has read what
  // blocking does.
  const handleBlock = async () => {
    if (!character) return;
    setRelationshipLoading(true);
    setRelationshipError(null);
    try {
      await blockCharacter(character.id);
      setBlocked(true);
    } catch {
      setRelationshipError(t("relationships.blockError"));
    } finally {
      setRelationshipLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!character) return;
    setRelationshipLoading(true);
    setRelationshipError(null);
    try {
      // Deletes the block record and stops there — no friend/foe edge comes
      // back with it (ADR-0077 ruling 5).
      await unblockCharacter(character.id);
      setBlocked(false);
    } catch {
      setRelationshipError("Could not unblock.");
    } finally {
      setRelationshipLoading(false);
    }
  };

  if (loading)
    return <div className="py-8 font-body text-muted">{t("loading")}</div>;
  if (error)
    return (
      <div className="py-8">
        <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2">
          {extractError(error, "Couldn't load this character.")}{" "}
          <button
            onClick={() => window.location.reload()}
            className="underline"
          >
            {t("states.tryRefreshing")}
          </button>
        </p>
      </div>
    );
  if (!character)
    return (
      <div className="py-8 font-body text-muted">{t("states.characterNotFound")}</div>
    );

  const isOwn = user?.character?.id === character.id;

  // ① progression toward level+1. The arithmetic used to live here, in a
  // second copy of the curve reader — which is how #2127 happened: this copy
  // measured the current band and `levelTrack`'s measured the whole climb, so
  // one character read 9% here and 56% on the home page. There is one
  // derivation now and this page maps it onto the props the skins take.
  const track = gameConfig
    ? levelTrack(character.level, character.score, gameConfig.level_thresholds)
    : null;
  const progression: ProfileProgression | null = track
    ? {
        // At the top of the curve `levelTrack` reports no next rung, and it is
        // passed through untouched (#2383). Two coercions used to stand here —
        // the current level named as "next", the band's far edge faked as the
        // near one — and they are what printed "next · lvl 8" beside "0 / 0
        // pts this level" on a level-8 profile. The skins branch on the `null`
        // the way the field desk always has. Do not reintroduce a `??` here.
        nextLevel: track.nextLevel,
        currentThreshold: track.currentThreshold,
        nextThreshold: track.nextThreshold,
        pointsIntoLevel: track.pointsIntoLevel,
        levelSpan: track.levelSpan,
        progressPercent: track.fillPercent,
      }
    : null;

  // Friend/foe controls (kept feature) — faction-skinned via the character's
  // tokens, folded into the identity header. Hidden (not disabled) for own
  // profile and logged-out viewers.
  const identityActions =
    !isOwn && user?.character ? (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-xs)",
          width: "100%",
        }}
      >
        {/* The edge and the block are two independent records under ADR-0077,
            so they are two independent rows here. A block outranks an active
            edge; it does not consume one, and unblocking restores the edge's
            voice with no further action. */}
        {relationship ? (
          <>
            <div
              style={{
                background:
                  relationship.type === "friend"
                    ? "var(--badge-friend)"
                    : "var(--color-danger)",
                ...statusPillStyle,
              }}
            >
              {relationship.type === "friend"
                ? t("relationships.friends")
                : t("relationships.foe")}
            </div>
            <button
              onClick={handleRemoveRelationship}
              disabled={relationshipLoading}
              className="label-caption"
              style={quietButtonStyle}
            >
              {t("relationships.remove")}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleAddRelationship("friend")}
              disabled={relationshipLoading}
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: "var(--text-md)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                padding: "var(--space-xs) 0",
                border: "none",
                cursor: "pointer",
                borderRadius: 2,
                opacity: relationshipLoading ? 0.5 : 1,
                // na → rainbow frame; real faction → solid hue + on-fill ink
                ...factionFill(character.faction_slug, "pill"),
              }}
            >
              {t("relationships.addFriend")}
            </button>
            <button
              onClick={() => handleAddRelationship("foe")}
              disabled={relationshipLoading}
              style={{
                background: "none",
                color: "var(--color-danger)",
                fontFamily: "'Courier Prime', monospace",
                fontSize: "var(--text-md)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                padding: "var(--space-xs) 0",
                border: "1.5px solid var(--color-danger)",
                cursor: "pointer",
                borderRadius: 2,
                opacity: relationshipLoading ? 0.5 : 1,
              }}
            >
              {t("relationships.addFoe")}
            </button>
          </>
        )}
        {/* Only ever the BLOCKER's own view: `blocked` comes from the viewer's
            outgoing block list, which has no incoming counterpart to read. The
            party who was blocked sees this profile exactly as they would
            otherwise, which is the point of ADR-0077 ruling 2. */}
        {blocked && (
          <>
            <div
              style={{
                background: "var(--color-text-tertiary)",
                ...statusPillStyle,
              }}
            >
              {t("relationships.blocked")}
            </div>
            <button
              onClick={handleUnblock}
              disabled={relationshipLoading}
              className="label-caption"
              style={quietButtonStyle}
            >
              {t("relationships.unblock")}
            </button>
          </>
        )}
        {/* Unconditional on purpose: the control owns its own visibility, so
            the page cannot place it anywhere it would be wrong (own profile,
            someone already blocked, no character of your own). */}
        <RelationshipBlockControl
          viewerCharacterId={user?.character?.id}
          targetCharacterId={character.id}
          targetDisplayName={character.display_name}
          factionSlug={character.faction_slug}
          alreadyBlocked={blocked}
          busy={relationshipLoading}
          onBlock={handleBlock}
        />
        {relationshipError && (
          <p
            className="font-body"
            style={{
              fontSize: "var(--text-content)",
              color: "var(--color-danger)",
              marginTop: "var(--space-xs)",
              textAlign: "center",
            }}
          >
            {relationshipError}
          </p>
        )}
      </div>
    ) : null;

  const bodyProps: ProfileBodyProps = {
    character,
    submissions,
    proposedTasks,
    progression,
    identityActions,
    onSignup: user ? handleSignup : undefined,
  };

  // ONE dispatch, both form factors (#1319). Every profile body is responsive, so
  // the slug dispatch is the whole story — no faction can end up wearing the na
  // spectrum skin on a phone.
  return (
    <>
      {/* The only thing a failed sign-up can be answered with: the success path
          navigates to the new praxis composer, so there is no page left to say
          anything on. Above the body because the body is nine different skins
          and none of them owns a message slot. */}
      {signupMsg && (
        <p className="font-body content-text border-2 danger-edge danger-text px-3 py-2">
          {signupMsg}
        </p>
      )}
      <FactionProfileBody {...bodyProps} />
    </>
  );
}
