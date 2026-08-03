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
  unblockRelationship,
  type RelationshipListItem,
} from "../api/relationships";
import { useAuth } from "../auth/AuthContext";
import { useGameConfig } from "../hooks/useGameConfig";
import { extractError } from "../utils/errors";
import { factionFill } from "../utils/factions";
import { useFactionBackdrop } from "../components/backdrop/BackdropContext";
import FactionProfileBody, {
  type ProfileBodyProps,
  type ProfileProgression,
} from "./characterProfile/FactionProfileBody";

export default function CharacterProfile() {
  const { t } = useTranslation("common");
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const gameConfig = useGameConfig();
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

  const handleUnblockRelationship = async () => {
    if (!relationship || !character) return;
    setRelationshipLoading(true);
    setRelationshipError(null);
    try {
      // The re-derived display status (Blocked → type label) comes back on the
      // unblock itself (#1383); it used to cost a full re-list.
      setRelationship(await unblockRelationship(relationship.id));
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
        <p className="font-body content-text text-red-600 border-2 border-red-300 px-3 py-2">
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
          gap: "var(--space-xs)",
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
                padding: "var(--space-xs) 0",
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
                fontSize: "var(--text-xs)",
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
  };

  // ONE dispatch, both form factors (#1319). The page used to branch on
  // `useFormFactor()` through a `mobileProfile` surface only WOW ever filled,
  // which meant every OTHER faction wore the na spectrum skin on a phone. Each
  // profile body is responsive now, so the slug dispatch is the whole story.
  return <FactionProfileBody {...bodyProps} />;
}
