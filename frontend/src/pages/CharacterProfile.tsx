/**
 * CharacterProfile — the public player profile (#459, ADR-0033).
 *
 * One faction-agnostic contract; the skin is picked client-side from
 * `faction_slug` by FactionProfileBody (default spectrum-band skin until a
 * faction's bespoke body lands, #460). This page owns data fetching and the
 * friend/foe relationship state; all rendering lives in the profile bodies.
 *
 * Public view: no self-edit affordance here (the credential card is the
 * identity header; editing moves to the account's own surfaces).
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getCharacter, type CharacterOut } from "../api/characters";
import { listPraxes, type PraxisCardOut } from "../api/praxis";
import { listTasks, type TaskOut } from "../api/tasks";
import {
  listRelationships,
  createRelationship,
  deleteRelationship,
  unblockRelationship,
  type RelationshipListItem,
} from "../api/relationships";
import { useAuth } from "../auth/AuthContext";
import { useGameConfig } from "../hooks/useGameConfig";
import { extractError } from "../utils/errors";
import { factionCssVar } from "../utils/factions";
import { useFactionBackdrop } from "../components/backdrop/BackdropContext";
import FactionProfileBody, {
  type ProfileProgression,
} from "./characterProfile/FactionProfileBody";

export default function CharacterProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const gameConfig = useGameConfig();
  const [character, setCharacter] = useState<CharacterOut | null>(null);
  const [submissions, setSubmissions] = useState<PraxisCardOut[]>([]);
  const [proposedTasks, setProposedTasks] = useState<TaskOut[]>([]);
  const [relationship, setRelationship] = useState<RelationshipListItem | null>(
    null,
  );
  const [relationshipLoading, setRelationshipLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Theme the page backdrop to this character's faction (falls back to the
  // global watercolor until loaded / for factions with no backdrop variant).
  useFactionBackdrop(character?.faction_slug);

  useEffect(() => {
    if (!id) return;
    const cid = parseInt(id, 10);
    Promise.all([
      getCharacter(cid),
      listPraxes({ character_id: cid }),
      listTasks({ created_by: cid }),
    ])
      .then(([c, s, t]) => {
        setCharacter(c);
        setSubmissions(s);
        setProposedTasks(t);
      })
      .catch((err) =>
        setFetchError(extractError(err, "Couldn't load this character.")),
      )
      .finally(() => setLoading(false));
  }, [id]);

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
  }, [id, user]);

  const [relationshipError, setRelationshipError] = useState<string | null>(
    null,
  );

  const handleAddRelationship = async (type: "friend" | "foe") => {
    if (!character) return;
    setRelationshipLoading(true);
    setRelationshipError(null);
    try {
      await createRelationship(character.id, type);
      // Re-fetch to get the properly typed RelationshipListItem with display data
      const rels = await listRelationships();
      const match = rels.find(
        (r) => r.to_character_id === character.id,
      );
      setRelationship(match ?? null);
    } catch (err: unknown) {
      // Handle 409 (already exists) gracefully — re-fetch existing relationship
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 409) {
          const rels = await listRelationships();
          const match = rels.find(
            (r) => r.to_character_id === character.id,
          );
          setRelationship(match ?? null);
        } else {
          setRelationshipError("Could not add relationship.");
        }
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

  const handleUnblockRelationship = async () => {
    if (!relationship || !character) return;
    setRelationshipLoading(true);
    setRelationshipError(null);
    try {
      await unblockRelationship(relationship.id);
      // Re-fetch to get the re-derived display status (Blocked → type label).
      const rels = await listRelationships();
      setRelationship(
        rels.find((r) => r.to_character_id === character.id) ?? null,
      );
    } catch {
      setRelationshipError("Could not unblock.");
    } finally {
      setRelationshipLoading(false);
    }
  };

  if (loading)
    return <div className="py-8 font-body text-muted">Loading...</div>;
  if (fetchError)
    return (
      <div className="py-8">
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {fetchError}{" "}
          <button
            onClick={() => window.location.reload()}
            className="underline"
          >
            Try refreshing.
          </button>
        </p>
      </div>
    );
  if (!character)
    return (
      <div className="py-8 font-body text-muted">Character not found.</div>
    );

  const isOwn = user?.character?.id === character.id;

  // ① progression toward level+1 — same thresholds the old level track used.
  const levelThresholds = gameConfig?.level_thresholds ?? [];
  const maxLevel = Math.max(levelThresholds.length - 1, 0);
  const nextLevel = Math.min(character.level + 1, maxLevel);
  const nextThreshold = levelThresholds[nextLevel] ?? 999;
  const currentThreshold = levelThresholds[character.level] ?? 0;
  const progression: ProfileProgression | null = gameConfig
    ? {
        nextLevel,
        currentThreshold,
        nextThreshold,
        progressPercent:
          nextThreshold > currentThreshold
            ? Math.min(
                ((character.score - currentThreshold) /
                  (nextThreshold - currentThreshold)) *
                  100,
                100,
              )
            : 100,
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
          gap: 4,
          width: "100%",
        }}
      >
        {relationship ? (
          <>
            {/* Show relationship status */}
            <div
              style={{
                background:
                  relationship.display_status === "Blocked"
                    ? "var(--color-text-tertiary)"
                    : relationship.type === "friend"
                      ? "var(--badge-friend)"
                      : "var(--color-danger)",
                color: "var(--color-text-on-accent)",
                fontFamily: "'Courier Prime', monospace",
                fontSize: 8,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                padding: "4px 0",
                textAlign: "center",
                borderRadius: 2,
              }}
            >
              {relationship.display_status === "Blocked"
                ? "Blocked"
                : relationship.type === "friend"
                  ? "Friends"
                  : "Foe"}
            </div>
            {relationship.display_status !== "Blocked" ? (
              <button
                onClick={handleRemoveRelationship}
                disabled={relationshipLoading}
                className="eyebrow"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-tertiary)",
                  textAlign: "center",
                }}
              >
                remove
              </button>
            ) : (
              // ADR-0009 — a block is reversible; either party can unblock.
              <button
                onClick={handleUnblockRelationship}
                disabled={relationshipLoading}
                className="eyebrow"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-tertiary)",
                  textAlign: "center",
                }}
              >
                unblock
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => handleAddRelationship("friend")}
              disabled={relationshipLoading}
              style={{
                background: factionCssVar(character.faction_slug),
                color: "var(--color-text-on-accent)",
                fontFamily: "'Courier Prime', monospace",
                fontSize: 8,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                padding: "4px 0",
                border: "none",
                cursor: "pointer",
                borderRadius: 2,
                opacity: relationshipLoading ? 0.5 : 1,
              }}
            >
              Friend
            </button>
            <button
              onClick={() => handleAddRelationship("foe")}
              disabled={relationshipLoading}
              style={{
                background: "none",
                color: "var(--color-danger)",
                fontFamily: "'Courier Prime', monospace",
                fontSize: 8,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                padding: "3px 0",
                border: "1.5px solid var(--color-danger)",
                cursor: "pointer",
                borderRadius: 2,
                opacity: relationshipLoading ? 0.5 : 1,
              }}
            >
              Foe
            </button>
          </>
        )}
        {relationshipError && (
          <p
            className="font-body"
            style={{
              fontSize: 8,
              color: "var(--color-danger)",
              marginTop: 4,
              textAlign: "center",
            }}
          >
            {relationshipError}
          </p>
        )}
      </div>
    ) : null;

  return (
    <FactionProfileBody
      character={character}
      submissions={submissions}
      proposedTasks={proposedTasks}
      progression={progression}
      identityActions={identityActions}
    />
  );
}
