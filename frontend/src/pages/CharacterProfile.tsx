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
import { useTranslation } from "react-i18next";
import { getCharacter } from "../api/characters";
import { listPraxes } from "../api/praxis";
import { listTasks } from "../api/tasks";
import { useResource } from "../hooks/useResource";
import {
  listRelationships,
  createRelationship,
  deleteRelationship,
  unblockRelationship,
  type RelationshipListItem,
} from "../api/relationships";
import { useAuth } from "../auth/AuthContext";
import { useGameConfig } from "../hooks/useGameConfig";
import { useFormFactor } from "../hooks/useFormFactor";
import { pickVariant } from "../utils/factionDispatch";
import { extractError } from "../utils/errors";
import { factionFill } from "../utils/factions";
import { useFactionBackdrop } from "../components/backdrop/BackdropContext";
import FactionProfileBody, {
  type ProfileBodyProps,
  type ProfileProgression,
} from "./characterProfile/FactionProfileBody";
import DefaultProfile from "./characterProfile/mobileArchetypes/DefaultProfile";

// Parallel MOBILE profile registry, mirroring FACTION_PROFILE_BODIES. Empty for
// now — every phone render falls through to the Default (na) mobile profile
// skin (#517); bespoke faction mobile profiles register here in follow-ups.
export const MOBILE_PROFILE_BY_SLUG: Record<
  string,
  (props: ProfileBodyProps) => JSX.Element
> = {};

export default function CharacterProfile() {
  const { t } = useTranslation("common");
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const gameConfig = useGameConfig();
  const formFactor = useFormFactor();
  const { data, loading, error } = useResource(
    () => {
      const cid = Number(id);
      return Promise.all([
        getCharacter(cid),
        listPraxes({ character_id: cid }),
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
    return <div className="py-8 font-body text-muted">{t("states.loading")}</div>;
  if (error)
    return (
      <div className="py-8">
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
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
                fontSize: "var(--text-xs)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                padding: "4px 0",
                textAlign: "center",
                borderRadius: 2,
              }}
            >
              {relationship.display_status === "Blocked"
                ? t("relationships.blocked")
                : relationship.type === "friend"
                  ? t("relationships.friends")
                  : t("relationships.foe")}
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
                {t("relationships.remove")}
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
                {t("relationships.unblock")}
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => handleAddRelationship("friend")}
              disabled={relationshipLoading}
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: "var(--text-xs)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                padding: "4px 0",
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
                fontSize: "var(--text-xs)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                padding: "3px 0",
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
        {relationshipError && (
          <p
            className="font-body"
            style={{
              fontSize: "var(--text-content)",
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

  const bodyProps: ProfileBodyProps = {
    character,
    submissions,
    proposedTasks,
    progression,
    identityActions,
  };

  // Phone → the mobile-native profile skin (Default fallback until a faction
  // registers its own); desktop → the existing faction-dispatched body.
  if (formFactor === "mobile") {
    const Mobile = pickVariant(
      MOBILE_PROFILE_BY_SLUG,
      character.faction_slug,
      DefaultProfile,
    );
    return <Mobile {...bodyProps} />;
  }

  return <FactionProfileBody {...bodyProps} />;
}
