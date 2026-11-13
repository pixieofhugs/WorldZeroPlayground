/**
 * CharacterProfile — the public player profile (#459, ADR-0033). Owns fetching
 * and relationship state; FactionProfileBody picks the skin by slug. No
 * form-factor branch: each body is responsive itself (#1319).
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
import AddRelationshipButtons from "./characterProfile/AddRelationshipButtons";
import { useAuth } from "../auth/AuthContext";
import { useGameConfig } from "../hooks/useGameConfig";
import { useTaskSignup } from "../hooks/useTaskSignup";
import { extractError } from "../utils/errors";
import { levelTrack } from "../utils/levelTrack";
import { useFactionBackdrop } from "../components/backdrop/BackdropContext";
import FactionProfileBody, {
  type ProfileBodyProps,
  type ProfileProgression,
} from "./characterProfile/FactionProfileBody";

/** Status pill minus `background`; shared by the edge and block rows (ADR-0077). */
const statusPillStyle: React.CSSProperties = {
  color: "var(--color-text-on-accent)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-md)",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  padding: "var(--space-xs) 0",
  textAlign: "center",
  borderRadius: 2,
};

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
  // Profile tasks offer sign-up (#2188); the card explains any refusal.
  const { signupMsg, handleSignup } = useTaskSignup();
  const { data, loading, error } = useResource(
    () => {
      const cid = Number(id);
      return Promise.all([
        getCharacter(cid),
        // A career record, all eras (#1362); else empty after an era reset.
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
  // Viewer has blocked them; independent of any edge (ADR-0077).
  const [blocked, setBlocked] = useState(false);

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
    // Outgoing only: a block is silent to the party it names (ADR-0077).
    listBlocks()
      .then((blocks) => setBlocked(blocks.some((b) => b.character_id === cid)))
      .catch(() => {});
    // Keyed on the id, not `user`: `/auth/me` refetches make new objects (#1390).
  }, [id, user?.character?.id]);

  const [relationshipError, setRelationshipError] = useState<string | null>(
    null,
  );

  const handleAddRelationship = async (type: "friend" | "foe") => {
    if (!character) return;
    setRelationshipLoading(true);
    setRelationshipError(null);
    try {
      // The POST returns the enriched item (#1383).
      setRelationship(await createRelationship(character.id, type));
    } catch (err: unknown) {
      // 409 = already exists: re-list to find it (a failed write has no body).
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

  // A block is its own record (ADR-0077): neither handler touches
  // `relationship`. The confirm lives in RelationshipBlockControl.
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

  // One derivation via `levelTrack` (#2127: a local copy disagreed).
  const track = gameConfig
    ? levelTrack(character.level, character.score, gameConfig.level_thresholds)
    : null;
  const progression: ProfileProgression | null = track
    ? {
        // `null` at the top of the curve; skins branch on it. No `??` (#2383).
        nextLevel: track.nextLevel,
        currentThreshold: track.currentThreshold,
        nextThreshold: track.nextThreshold,
        pointsIntoLevel: track.pointsIntoLevel,
        levelSpan: track.levelSpan,
        progressPercent: track.fillPercent,
      }
    : null;

  // Hidden for own profile and logged-out viewers.
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
        {/* Edge and block are independent rows (ADR-0077). */}
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
          <AddRelationshipButtons
            loading={relationshipLoading}
            factionSlug={character.faction_slug}
            onAddFriend={() => handleAddRelationship("friend")}
            onAddFoe={() => handleAddRelationship("foe")}
          />
        )}
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
        {/* Unconditional: the control owns its own visibility. */}
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

  return (
    <>
      {/* Sign-up failure only (success navigates away); no skin owns a slot. */}

      {signupMsg && (
        <p className="font-body content-text border-2 danger-edge danger-text px-3 py-2">
          {signupMsg}
        </p>
      )}
      <FactionProfileBody {...bodyProps} />
    </>
  );
}
