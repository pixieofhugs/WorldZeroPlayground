import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
import PraxisCard from "../components/PraxisCard";
import TaskCard from "../components/TaskCard";
import PageTitle from "../components/ui/PageTitle";
import { useAuth } from "../auth/AuthContext";
import { useGameConfig } from "../hooks/useGameConfig";
import { extractError } from "../utils/errors";
import { factionCssVar, factionName } from "../utils/factions";
import { mediaUrl } from "../utils/media";
import { useFactionBackdrop } from "../components/backdrop/BackdropContext";

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

  const charFactionName = factionName(character.faction_slug);
  const isOwn = user?.character?.id === character.id;
  const levelThresholds = gameConfig?.level_thresholds ?? [];
  const maxLevel = Math.max(levelThresholds.length - 1, 0);
  const nextLevel = Math.min(character.level + 1, maxLevel);
  const nextThreshold = levelThresholds[nextLevel] ?? 999;
  const currentThreshold = levelThresholds[character.level] ?? 0;
  const progressPercent =
    nextThreshold > currentThreshold
      ? Math.min(
          ((character.score - currentThreshold) /
            (nextThreshold - currentThreshold)) *
            100,
          100,
        )
      : 100;

  return (
    <div className="py-8">
      {/* ── Profile Header — Faction-Framed (§14.2) ── */}
      <div
        className="sidebar-card mb-5"
        style={{
          borderLeft: `4px solid ${factionCssVar(character.faction_slug, "border")}`,
          padding: "16px 20px",
        }}
      >
        <div className="flex gap-5 items-start">
          {/* Avatar orb */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            {character.avatar_url ? (
              <img
                src={mediaUrl(character.avatar_url)}
                alt={character.username}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `3px solid white`,
                  boxShadow: `0 0 0 3px ${factionCssVar(character.faction_slug)}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${factionCssVar(character.faction_slug, "light")}, ${factionCssVar(character.faction_slug)})`,
                  border: "3px solid white",
                  boxShadow: `0 0 0 3px ${factionCssVar(character.faction_slug)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Lora', serif",
                  fontStyle: "italic",
                  fontSize: 28,
                  color: "var(--color-text-on-accent)",
                }}
              >
                {character.username[0]?.toUpperCase()}
              </div>
            )}
            {/* Level badge */}
            <span
              style={{
                background: factionCssVar(character.faction_slug),
                color: "var(--color-text-on-accent)",
                fontSize: 8,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                padding: "2px 10px",
                borderRadius: 10,
                fontFamily: "'Courier Prime', monospace",
              }}
            >
              Level {character.level}
            </span>
            {/* Action buttons */}
            {isOwn ? (
              <>
                <Link
                  to={`/characters/${character.id}/edit`}
                  className="btn-outline"
                  style={{
                    fontSize: 8,
                    padding: "3px 12px",
                    width: "100%",
                    textAlign: "center",
                  }}
                >
                  Edit Profile
                </Link>
                {user?.can_create_additional_character && (
                  <Link
                    to="/characters/create"
                    className="btn-outline"
                    style={{
                      fontSize: 8,
                      padding: "3px 12px",
                      width: "100%",
                      textAlign: "center",
                    }}
                  >
                    + New Character
                  </Link>
                )}
              </>
            ) : user?.character ? (
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
              </div>
            ) : null}
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

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1
              className="font-display italic"
              style={{
                fontSize: 26,
                color: factionCssVar(character.faction_slug),
                marginBottom: 2,
              }}
            >
              {character.display_name}
            </h1>
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              @{character.username} · Joined{" "}
              {new Date(character.created_at).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              })}
            </p>

            {/* Faction pennant */}
            <span
              className="pennant-shape"
              style={{
                display: "inline-block",
                background: factionCssVar(character.faction_slug),
                color: "var(--color-text-on-accent)",
                fontFamily: "'Courier Prime', monospace",
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                padding: "3px 14px",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                marginBottom: 8,
              }}
            >
              {charFactionName}
            </span>

            {/* Bio */}
            {character.bio && (
              <p
                className="font-body"
                style={{
                  fontSize: 11,
                  lineHeight: 1.6,
                  borderLeft: `3px solid ${factionCssVar(character.faction_slug, "border")}`,
                  paddingLeft: 10,
                  marginTop: 6,
                  marginBottom: 8,
                  color: "var(--color-text-secondary)",
                  fontFamily: "'Special Elite', serif",
                }}
              >
                {character.bio}
              </p>
            )}

            {/* Stat strip */}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              {[
                { label: "Era score", value: character.score },
                { label: "All-time", value: character.all_time_score },
                { label: "Praxis", value: submissions.length },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="sidebar-card"
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    textAlign: "center",
                    minWidth: 70,
                  }}
                >
                  <div
                    className="font-body font-bold"
                    style={{ fontSize: 14, color: "var(--color-text-primary)" }}
                  >
                    {stat.value}
                  </div>
                  <div className="eyebrow" style={{ fontSize: 7 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Level Track (§14.3) ── */}
      {gameConfig && (
        <div className="sidebar-card mb-5" style={{ padding: "14px 18px" }}>
          {/* Node track */}
          <div
            style={{ display: "flex", alignItems: "center", marginBottom: 10 }}
          >
            {levelThresholds.map((_threshold, level) => {
              const completed = character.level > level;
              const current = character.level === level;
              return (
                <div
                  key={level}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  {level > 0 && (
                    <div
                      style={{
                        width: 16,
                        height: 3,
                        background: completed
                          ? factionCssVar(character.faction_slug)
                          : "rgba(0,0,0,0.1)",
                        transition: "background 200ms",
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: current ? 32 : 26,
                      height: current ? 32 : 26,
                      borderRadius: "50%",
                      background: completed
                        ? factionCssVar(character.faction_slug)
                        : current
                          ? `${factionCssVar(character.faction_slug)}20`
                          : "var(--level-node-incomplete)",
                      border: current
                        ? `3px solid ${factionCssVar(character.faction_slug)}`
                        : `2px solid ${completed ? factionCssVar(character.faction_slug) : "rgba(0,0,0,0.12)"}`,
                      boxShadow: current
                        ? `0 0 0 3px ${factionCssVar(character.faction_slug)}33`
                        : "none",
                      color: completed
                        ? "var(--color-text-on-accent)"
                        : current
                          ? factionCssVar(character.faction_slug)
                          : "var(--color-level-inactive)",
                      fontFamily: "'Courier Prime', monospace",
                      fontSize: current ? 10 : 8,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 200ms",
                    }}
                  >
                    {level}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="eyebrow"
              style={{ fontSize: 8, whiteSpace: "nowrap" }}
            >
              Lvl {character.level} → {nextLevel}
            </span>
            <div
              style={{
                flex: 1,
                height: 5,
                borderRadius: 3,
                background: "var(--color-bg-surface-alt)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPercent}%`,
                  background: factionCssVar(character.faction_slug),
                  borderRadius: 3,
                  transition: "width 300ms",
                }}
              />
            </div>
            <span
              className="font-body"
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: factionCssVar(character.faction_slug),
                whiteSpace: "nowrap",
              }}
            >
              {character.score} / {nextThreshold} pts
            </span>
          </div>
        </div>
      )}

      {/* ── Praxis Grid (§14.4) ── */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-3">
          <PageTitle title="Praxis" eyebrow={`${submissions.length} total`} />
        </div>

        {submissions.length === 0 ? (
          <p className="font-body text-muted">No submissions yet.</p>
        ) : (
          <div className="flex flex-wrap gap-4 items-start">
            {submissions.map((s) => (
              <PraxisCard key={s.id} praxis={s} />
            ))}
          </div>
        )}
      </div>

      {/* ── Proposed Tasks (#419) — approved tasks this character created ── */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-3">
          <PageTitle
            title="Proposed tasks"
            eyebrow={`${proposedTasks.length} total`}
          />
        </div>

        {proposedTasks.length === 0 ? (
          <p className="font-body text-muted">No proposed tasks yet.</p>
        ) : (
          <div className="flex flex-wrap gap-4 items-start">
            {proposedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                displayPoints={task.point_value}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
