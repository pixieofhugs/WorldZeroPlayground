/**
 * useProposeTask — extracts every piece of state and async behaviour from the
 * legacy ProposeTask.tsx so that per-faction archetypes can each own their own
 * proposal-form treatment without re-implementing the data plumbing.
 *
 * Behaviour preserved 1:1 from the original page (faction list fetch, the
 * title/description length guards, the metatask faction guard, proposeTask vs
 * proposeMetatask branch, success state). The returned {@link ProposeTaskState}
 * is the stable contract every propose-task archetype consumes. The dispatch
 * key is the user-selected `factionSlug`, so a faction can ship a bespoke form
 * that appears once its pennant is chosen.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { proposeTask } from "../../api/tasks";
import { proposeMetatask } from "../../api/metaTasks";
import { getFactions, type FactionOut } from "../../api/factions";
import { useAuth } from "../../auth/AuthContext";
import { extractError } from "../../utils/errors";
import i18n from "../../i18n";

export interface ProposeTaskState {
  // Gating (faction-agnostic guards live in the dispatcher)
  isLoggedIn: boolean;
  canProposeTask: boolean;
  canProposeMetatask: boolean;
  currentLevel: number;
  success: boolean;

  // Entities
  factions: FactionOut[];

  // Form fields
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  pointValue: string;
  setPointValue: (value: string) => void;
  levelRequired: number | "";
  setLevelRequired: (value: number | "") => void;
  factionSlug: string;
  setFactionSlug: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  isMetaTask: boolean;
  setIsMetaTask: (value: boolean) => void;
  metaBonusValue: string;
  setMetaBonusValue: (value: string) => void;

  // Submission
  submitting: boolean;
  error: string | null;

  // Handlers
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleCancel: () => void;
}

export function useProposeTask(): ProposeTaskState {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [factions, setFactions] = useState<FactionOut[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pointValue, setPointValue] = useState<string>("10");
  const [levelRequired, setLevelRequired] = useState<number | "">(0);
  const [factionSlug, setFactionSlug] = useState("ua");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isMetaTask, setIsMetaTask] = useState(false);
  const [metaBonusValue, setMetaBonusValue] = useState("10");

  useEffect(() => {
    getFactions()
      .then(setFactions)
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.length > 200) {
      setError(i18n.t("forms:proposeTask.fields.name.tooLong"));
      return;
    }
    if (description.length > 5000) {
      setError(i18n.t("forms:proposeTask.fields.description.tooLong"));
      return;
    }
    // Backend authoritatively enforces metatask proposal gating (level 6 or
    // admin). If the viewer isn't eligible the 403 surfaces via extractError.
    if (
      isMetaTask &&
      (!factionSlug || factionSlug === "na" || factionSlug === "ua")
    ) {
      setError(i18n.t("forms:proposeTask.errors.metaFactionRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isMetaTask) {
        await proposeMetatask({
          title,
          description,
          metatask_faction_slug: factionSlug,
          point_value: parseInt(metaBonusValue) || 10,
          level_required: levelRequired === "" ? 0 : levelRequired,
        });
      } else {
        await proposeTask({
          title,
          description: description || undefined,
          point_value: parseInt(pointValue) || 10,
          level_required: levelRequired === "" ? 0 : levelRequired,
          primary_faction_slug: factionSlug || undefined,
        });
      }
      setSuccess(true);
    } catch (err) {
      setError(
        extractError(
          err,
          isMetaTask
            ? i18n.t("forms:proposeTask.errors.createMeta")
            : i18n.t("forms:proposeTask.errors.propose"),
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    navigate(-1);
  }

  return {
    isLoggedIn: !!user,
    canProposeTask: !!user?.can_propose_task,
    canProposeMetatask: !!user?.can_propose_metatask,
    currentLevel: user?.character?.level ?? 0,
    success,

    factions,

    title,
    setTitle,
    description,
    setDescription,
    pointValue,
    setPointValue,
    levelRequired,
    setLevelRequired,
    factionSlug,
    setFactionSlug,
    notes,
    setNotes,
    isMetaTask,
    setIsMetaTask,
    metaBonusValue,
    setMetaBonusValue,

    submitting,
    error,

    handleSubmit,
    handleCancel,
  };
}
