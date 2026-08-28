/**
 * useProposeTask — extracts every piece of state and async behaviour from the
 * legacy ProposeTask.tsx so that per-faction archetypes can each own their own
 * proposal-form treatment without re-implementing the data plumbing.
 *
 * Behaviour preserved 1:1 from the original page (faction list fetch, the
 * title/description length guards, proposeTask vs proposeMetatask branch,
 * success state). The returned {@link ProposeTaskState} is the stable contract
 * every propose-task archetype consumes. The dispatch key is the user-selected
 * `factionSlug`, so a faction can ship a bespoke form that appears once its
 * pennant is chosen.
 *
 * Note: there is deliberately no "metatask faction guard" here. The picker is
 * dual-purpose — its slug is a standard task's `primary_faction_slug` and a
 * metatask's issuing `metatask_faction_slug` — and Unaffiliated (`na`) is a
 * legitimate metatask issuer ("anyone"): the backend only requires a truthy
 * slug and metatasks are faction-open, so anyone may apply an `na` metatask
 * (#894).
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
// The unaffiliated sentinel now lives in utils/factions.ts (with the other
// slug/CSS-key knowledge) so a `ui/` component can import it without depending
// on a page module (#921). Imported for the guards below and re-exported so
// existing importers of this module keep working.
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
  /** Free-text note to the reviewing admin. Only the standard-task branch
   *  reads it — the form hides the textarea for metatasks (#1823). */
  notes: string;
}

/** Which endpoint {@link handleSubmit} will hit, plus its ready-built body. */
type ProposalPlan =
  | { kind: "metatask"; body: MetataskProposal }
  | { kind: "standard"; body: TaskCreate };

/**
 * Pure decision core of the submit handler: pick the endpoint and build its
 * body from the raw form fields. Extracted so the routing — especially the
 * Unaffiliated-metatask path (#894) — is unit-testable in a repo with no
 * DOM/renderHook.
 *
 * The faction picker is dual-purpose: its slug becomes a standard task's
 * `primary_faction_slug` and a metatask's issuing `metatask_faction_slug`. Any
 * slug routes through unchanged, including `na` (Unaffiliated = anyone); the
 * backend only requires a truthy slug and metatasks are faction-open (#894).
 *
 * `notes` rides the standard branch only, because that is the only branch whose
 * form renders the textarea (#1823). Both branches POST /tasks and both are
 * validated as `TaskCreate`, so the omission is a UI fact, not a wire limit.
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
  isMetatask: boolean;
  setIsMetatask: (value: boolean) => void;
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
  // App-wide cached, one request per page load across all five consumers (#1284).
  const factions: FactionOut[] = useFactions() ?? [];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pointValue, setPointValue] = useState<string>("10");
  const [levelRequired, setLevelRequired] = useState<number | "">(0);
  // Cross-faction is the neutral starting point: a default must not quietly
  // encode an affiliation the proposer never chose (#704, #709).
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
    // Backend authoritatively enforces metatask proposal gating (level 6 or
    // admin). If the viewer isn't eligible the 403 surfaces via extractError.
    // No faction guard: any picked slug — including `na` (Unaffiliated =
    // anyone) — is a valid metatask issuer (#894).
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
