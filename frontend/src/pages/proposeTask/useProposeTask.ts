/**
 * Propose-task state and submit logic; {@link ProposeTaskState} is the contract
 * every archetype consumes. Archetypes dispatch on the picked `factionSlug`.
 * Deliberately no metatask faction guard: `na` is a valid issuer (#894).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { proposeTask, type TaskCreate } from "../../api/tasks";
import { proposeMetatask, type MetataskProposal } from "../../api/metatasks";
import type { FactionOut } from "../../api/factions";
import { useFactions } from "../../hooks/useFactions";
import { useAuth } from "../../auth/AuthContext";
import { extractError } from "../../utils/errors";
import i18n from "../../i18n";
// Re-exported for existing importers (#921).
import { UNAFFILIATED_FACTION_SLUG } from "../../utils/factions";

export { UNAFFILIATED_FACTION_SLUG };

/** Raw form fields the submission planner reads. */
interface ProposalFields {
  isMetatask: boolean;
  title: string;
  description: string;
  pointValue: string;
  metaBonusValue: string;
  levelRequired: number | "";
  factionSlug: string;
  /** Note to the admin; standard branch only (#1823). */
  notes: string;
}

/** Which endpoint {@link handleSubmit} will hit, plus its ready-built body. */
type ProposalPlan =
  | { kind: "metatask"; body: MetataskProposal }
  | { kind: "standard"; body: TaskCreate };

/**
 * Pure submit core: pick the endpoint and build its body. The slug is a standard
 * task's `primary_faction_slug` or a metatask's `metatask_faction_slug`; `na`
 * passes through (#894). `notes` is omitted for metatasks only because the form
 * hides it (#1823), not a wire limit.
 */
export function planProposalSubmission(fields: ProposalFields): ProposalPlan {
  const level = fields.levelRequired === "" ? 0 : fields.levelRequired;
  if (fields.isMetatask) {
    return {
      kind: "metatask",
      body: {
        title: fields.title,
        description: fields.description,
        metatask_faction_slug: fields.factionSlug,
        point_value: parseInt(fields.metaBonusValue) || 10,
        level_required: level,
      },
    };
  }
  return {
    kind: "standard",
    body: {
      title: fields.title,
      description: fields.description || undefined,
      point_value: parseInt(fields.pointValue) || 10,
      level_required: level,
      primary_faction_slug: fields.factionSlug || undefined,
      notes: fields.notes || undefined,
    },
  };
}

export interface ProposeTaskState {
  // Gating guards live in the dispatcher
  isLoggedIn: boolean;
  canProposeTask: boolean;
  canProposeMetatask: boolean;
  currentLevel: number;
  success: boolean;

  factions: FactionOut[];

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
  isMetatask: boolean;
  setIsMetatask: (value: boolean) => void;
  metaBonusValue: string;
  setMetaBonusValue: (value: string) => void;

  submitting: boolean;
  error: string | null;

  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleCancel: () => void;
}

export function useProposeTask(): ProposeTaskState {
  const { user } = useAuth();
  const navigate = useNavigate();
  // App-wide cached (#1284).
  const factions: FactionOut[] = useFactions() ?? [];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pointValue, setPointValue] = useState<string>("10");
  const [levelRequired, setLevelRequired] = useState<number | "">(0);
  // Neutral default: never imply an affiliation (#704).
  const [factionSlug, setFactionSlug] = useState(UNAFFILIATED_FACTION_SLUG);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isMetatask, setIsMetatask] = useState(false);
  const [metaBonusValue, setMetaBonusValue] = useState("10");

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
    // Backend enforces metatask gating; a 403 surfaces via extractError.
    setSubmitting(true);
    setError(null);
    try {
      const plan = planProposalSubmission({
        isMetatask,
        title,
        description,
        pointValue,
        metaBonusValue,
        levelRequired,
        factionSlug,
        notes,
      });
      if (plan.kind === "metatask") {
        await proposeMetatask(plan.body);
      } else {
        await proposeTask(plan.body);
      }
      setSuccess(true);
    } catch (err) {
      setError(
        extractError(
          err,
          isMetatask
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
    isMetatask,
    setIsMetatask,
    metaBonusValue,
    setMetaBonusValue,

    submitting,
    error,

    handleSubmit,
    handleCancel,
  };
}
