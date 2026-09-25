import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getAllTasks,
  getPendingTasks,
  updateTaskStatus,
  adminPatchTask,
} from "../../api/admin";
import type { AdminTaskStatus } from "../../api/admin";
import type { TaskOut } from "../../api/tasks";
import type { FactionOut } from "../../api/factions";
import {
  mergeAdminTaskRows,
  filterAdminTaskRows,
  distinctLevels,
  reconcileLevelFilter,
  hasActiveTaskFilters,
} from "./adminTaskRows";
import type { AdminTaskRow, AdminTaskFilterCriteria } from "./adminTaskRows";
import TaskImportPanel from "./TaskImportPanel";
import { extractError } from "../../utils/errors";
import { useGameConfig } from "../../hooks/useGameConfig";
import FilterBar, { factionFacet, type FilterFacet } from "../../components/ui/FilterBar";
import {
  factionName,
  isFactionHiddenFromChoosers,
  UNAFFILIATED_FACTION_SLUG,
} from "../../utils/factions";

type StatusFilter = "all" | "pending" | "active" | "retired";

const STATUS_FILTERS: StatusFilter[] = ["all", "pending", "active", "retired"];

interface EditState {
  title: string;
  description: string;
  point_value: string;
  level_required: string;
  /** The task's OWN faction — which kit renders it and who earns the
   *  own-faction modifier (#1714). Not the metatask faction, which answers a
   *  different question and has no admin edit. */
  primary_faction_slug: string;
}

const TASK_STATUSES = ["active", "pending", "retired"] as const;
type TaskStatus = (typeof TASK_STATUSES)[number];

export default function TasksTab() {
  const { t } = useTranslation(["admin", "common"]);
  // Task status is an open backend string; map the known ones through the
  // catalog, falling back to the raw value for anything unmapped.
  const statusLabel = (status: string): string => {
    const known = TASK_STATUSES.find((s) => s === status) as
      | TaskStatus
      | undefined;
    return known ? t(`tasks.status.${known}`) : status;
  };
  const gameConfig = useGameConfig();
  // The era's factions, in config order. `na` is among them and is a legitimate
  // choice for a task: for a TASK the slug means cross-faction (open to all),
  // not "unaffiliated player", so it gets the tab's existing cross-faction
  // wording rather than the faction catalog's player-facing name.
  //
  // NOT reveal-gated by its source, unlike every other faction chooser: this
  // reads `/game-config`, which serves the whole era roster to anyone, where
  // `useFactions()` reads the viewer-scoped `/factions`. So `albescent` was in
  // this <select> for every admin, revealed or not (#1891). It is a chooser, so
  // the row is REMOVED rather than masked — `na` is already in this list under
  // its own cross-faction wording, and a masked row would sit beside it.
  const factionOptions = (gameConfig?.factions ?? [])
    .map((faction) => faction.slug)
    .filter((slug) => !isFactionHiddenFromChoosers(slug));
  const factionOptionLabel = (slug: string): string =>
    slug === UNAFFILIATED_FACTION_SLUG
      ? t("tasks.crossFaction")
      : factionName(slug);
  // `factionFacet` (shared FilterBar, #1365/#1446) takes `FactionOut[]` —
  // `{slug, status}` — but `/game-config` hands back `FactionConfigOut`, which
  // carries no `status`. Unused inside the facet either way (it only reads
  // `.slug`), so a synthetic value satisfies the type without widening a
  // shared, multi-consumer type for this one caller (#3060 review).
  const factionRoster: FactionOut[] = (gameConfig?.factions ?? []).map(
    (faction) => ({ slug: faction.slug, status: "" }),
  );
  const [tasks, setTasks] = useState<AdminTaskRow[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  // Search/faction/level/points criteria (#3060) — component state only, no
  // URL: the admin page is a single-user tool and no other tab does it.
  const [search, setSearch] = useState("");
  const [factionFilter, setFactionFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [minPoints, setMinPoints] = useState("");
  const [maxPoints, setMaxPoints] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  // Both sources refetch together: approving a pending task changes its status
  // in one and removes it from the other, so refreshing only one leaves a stale
  // row (#909).
  const refresh = () => {
    setError(null);
    Promise.all([getAllTasks(), getPendingTasks()])
      .then(([allTasks, pendingTasks]) =>
        setTasks(mergeAdminTaskRows(allTasks, pendingTasks)),
      )
      .catch((err) => setError(extractError(err, t("tasks.loadError"))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleStatusChange = async (taskId: number, newStatus: AdminTaskStatus) => {
    setActionError(null);
    try {
      await updateTaskStatus(taskId, newStatus);
      refresh();
    } catch (err) {
      setActionError(extractError(err, t("tasks.statusError")));
    }
  };

  const openEdit = (task: TaskOut) => {
    setEditingId(task.id);
    setEditState({
      title: task.title,
      description: task.description ?? "",
      point_value: String(task.point_value),
      level_required: String(task.level_required),
      primary_faction_slug:
        task.primary_faction_slug ?? UNAFFILIATED_FACTION_SLUG,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState(null);
  };

  const handleSaveEdit = async (taskId: number) => {
    if (!editState) return;
    setSaving(true);
    setActionError(null);
    try {
      await adminPatchTask(taskId, {
        title: editState.title || undefined,
        description: editState.description,
        point_value:
          editState.point_value !== ""
            ? Number(editState.point_value)
            : undefined,
        level_required:
          editState.level_required !== ""
            ? Number(editState.level_required)
            : undefined,
        primary_faction_slug: editState.primary_faction_slug || undefined,
      });
      setEditingId(null);
      setEditState(null);
      refresh();
    } catch (err) {
      setActionError(extractError(err, t("tasks.saveError")));
    } finally {
      setSaving(false);
    }
  };

  const levelOptions = distinctLevels(tasks);
  const rawLevel = levelFilter !== "" ? Number(levelFilter) : undefined;
  const effectiveLevel = reconcileLevelFilter(rawLevel, levelOptions);

  // The <select> keeps its own state — otherwise it renders blank
  // (`selectedIndex -1`) once its chosen level drops out of `levelOptions`
  // (an edit, a refresh), even though `effectiveLevel` has already moved on
  // and stopped filtering by it (#3060 review).
  useEffect(() => {
    if (rawLevel !== undefined && effectiveLevel === undefined) {
      setLevelFilter("");
    }
  }, [rawLevel, effectiveLevel]);

  const criteria: AdminTaskFilterCriteria = {
    search,
    faction: factionFilter || undefined,
    level: effectiveLevel,
    minPoints: minPoints !== "" ? Number(minPoints) : undefined,
    maxPoints: maxPoints !== "" ? Number(maxPoints) : undefined,
  };
  const hasActiveFilters = hasActiveTaskFilters(criteria);

  const clearFilters = () => {
    setSearch("");
    setFactionFilter("");
    setLevelFilter("");
    setMinPoints("");
    setMaxPoints("");
  };

  // `factionFacet` is a multi-select widget; `filterAdminTaskRows`'s `faction`
  // criterion is exact-match singular, and stays that way (#3060 review) — so
  // this adapts the picker's toggle semantics to a radio: picking a new slug
  // replaces the old one, re-picking the current one clears it. `factionRoster`
  // is what keeps this NOT reveal-gated like every other faction chooser (see
  // its own comment above) — the facet only ever sees what it's handed.
  const handleFactionFacetChange = (values: string[]) => {
    setFactionFilter(values.find((slug) => slug !== factionFilter) ?? "");
  };
  const baseFactionFacet = factionFacet(
    factionRoster,
    factionFilter ? [factionFilter] : [],
    handleFactionFacetChange,
  );
  // `factionFacet` labels every row via `factionName()`, which answers
  // "Unaffiliated" for `na` — right for a PLAYER, wrong for a TASK, where `na`
  // means cross-faction (open to all). Same distinction `factionOptionLabel`
  // above exists for; overriding just this one row's label (which also
  // reaches the applied chip, since `deriveChips` reads it off here) keeps the
  // rest of the facet — roster, hidden-chooser gate, sigil, sort — untouched.
  const filterFactionFacet: FilterFacet = {
    ...baseFactionFacet,
    options: baseFactionFacet.options.map((option) =>
      option.value === UNAFFILIATED_FACTION_SLUG
        ? { ...option, label: t("tasks.crossFaction") }
        : option,
    ),
  };

  const statusFiltered =
    filter === "all" ? tasks : tasks.filter((task) => task.status === filter);
  const filtered = filterAdminTaskRows(statusFiltered, criteria);

  if (loading)
    return <div className="font-body text-muted content-text">{t("common:loading")}</div>;
  if (error) return <p className="font-body content-text danger-text">{error}</p>;

  return (
    <div>
      {actionError && (
        <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2 mb-4">
          {actionError}
        </p>
      )}

      <TaskImportPanel onImported={refresh} />

      {/* Search + faction — the shared FilterBar (#1365/#1446), not a
          hand-rolled second copy of the same surface Tasks/Praxes/Updates/
          Players already mount (#3060 review). */}
      <FilterBar
        rails={[]}
        facets={[filterFactionFacet]}
        onClearAll={clearFilters}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: t("tasks.filters.searchPlaceholder"),
          label: t("tasks.filters.searchLabel"),
        }}
      />

      {/* Level + points stay outside FilterBar (#3060 review): level is an
          exact-match SINGLE choice — `filterAdminTaskRows`'s contract, and it
          stays that way — where the bar's facets are multi-select; points has
          no range-facet equivalent in FilterBar at all. */}
      <div className="flex flex-wrap items-center gap-3 mb-4 mt-3">
        <label className="font-body text-xs text-muted flex items-center gap-1">
          {t("tasks.levelLabel")}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="font-body content-text border-2 border-border bg-card px-2 py-2"
          >
            <option value="">{t("tasks.filters.levelAll")}</option>
            {levelOptions.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
        <label className="font-body text-xs text-muted flex items-center gap-1">
          {t("tasks.filters.pointsMinLabel")}
          <input
            type="number"
            value={minPoints}
            onChange={(e) => setMinPoints(e.target.value)}
            // A wheel scroll over a number input changes its value rather
            // than scrolling the page underneath it, and this control sits
            // directly above a long list (#3060 review). Blurring hands the
            // scroll back to the page.
            onWheel={(e) => e.currentTarget.blur()}
            className="font-body content-text border-2 border-border bg-card px-2 py-2 w-24"
          />
        </label>
        <label className="font-body text-xs text-muted flex items-center gap-1">
          {t("tasks.filters.pointsMaxLabel")}
          <input
            type="number"
            value={maxPoints}
            onChange={(e) => setMaxPoints(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            className="font-body content-text border-2 border-border bg-card px-2 py-2 w-24"
          />
        </label>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="btn-outline text-xs">
            {t("tasks.filters.clear")}
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-4">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={filter === s ? "chip-active" : "chip"}
          >
            {t(`tasks.filters.${s}`)}
            {s !== "all" && (
              <span className="ml-1 text-xs">
                ({tasks.filter((task) => task.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tasks list */}
      {filtered.length === 0 ? (
        <p className="font-body content-text text-muted">
          {hasActiveFilters
            ? t("tasks.emptyFiltered")
            : t("tasks.empty", { filter: t(`tasks.filters.${filter}`) })}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((task) => (
            <div key={task.id} className="card px-4 py-3 flex flex-col gap-3">
              {editingId === task.id && editState ? (
                /* Inline edit form */
                <div className="flex flex-col gap-2">
                  <input
                    className="font-body content-text border border-border bg-surface px-2 py-1"
                    value={editState.title}
                    onChange={(e) =>
                      setEditState({ ...editState, title: e.target.value })
                    }
                    placeholder={t("tasks.titlePlaceholder")}
                  />
                  <textarea
                    className="font-body content-text border border-border bg-surface px-2 py-1 resize-y"
                    rows={4}
                    value={editState.description}
                    onChange={(e) =>
                      setEditState({
                        ...editState,
                        description: e.target.value,
                      })
                    }
                    placeholder={t("tasks.descriptionPlaceholder")}
                  />
                  <div className="flex gap-3">
                    <label className="font-body text-xs text-muted flex items-center gap-1">
                      {t("tasks.pointsLabel")}
                      <input
                        type="number"
                        min={1}
                        className="font-body content-text border border-border bg-surface px-2 py-1 w-24"
                        value={editState.point_value}
                        onChange={(e) =>
                          setEditState({
                            ...editState,
                            point_value: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="font-body text-xs text-muted flex items-center gap-1">
                      {t("tasks.levelLabel")}
                      <input
                        type="number"
                        min={0}
                        max={8}
                        className="font-body content-text border border-border bg-surface px-2 py-1 w-24"
                        value={editState.level_required}
                        onChange={(e) =>
                          setEditState({
                            ...editState,
                            level_required: e.target.value,
                          })
                        }
                      />
                    </label>
                    {/* Options come from the era config the app already loads
                        — no admin-only endpoint for the list. Hidden while it
                        is in flight rather than shown empty. */}
                    {factionOptions.length > 0 && (
                      <label className="font-body text-xs text-muted flex items-center gap-1">
                        {t("tasks.factionLabel")}
                        <select
                          className="font-body content-text border border-border bg-surface px-2 py-1"
                          value={editState.primary_faction_slug}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              primary_faction_slug: e.target.value,
                            })
                          }
                        >
                          {factionOptions.map((slug) => (
                            <option key={slug} value={slug}>
                              {factionOptionLabel(slug)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleSaveEdit(task.id)}
                      disabled={saving}
                      className="btn-primary text-xs"
                    >
                      {saving ? t("tasks.actions.saving") : t("tasks.actions.save")}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="btn-outline text-xs"
                    >
                      {t("tasks.actions.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                /* Read view */
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-lg font-bold">
                        {task.title}
                      </p>
                      <span
                        className="label-caption"
                        style={{
                          padding: "var(--space-xs) var(--space-sm)",
                          border: "1px solid var(--color-border)",
                          color:
                            task.status === "active"
                              ? "var(--color-success)"
                              : task.status === "pending"
                                ? "var(--color-warning)"
                                : "var(--color-text-tertiary)",
                        }}
                      >
                        {statusLabel(task.status)}
                      </span>
                    </div>
                    <p className="font-body text-xs text-muted">
                      {t("tasks.meta", {
                        points: task.point_value,
                        level: task.level_required,
                        faction:
                          task.primary_faction_slug ?? t("tasks.crossFaction"),
                      })}
                    </p>
                    {/* Only /admin/tasks/pending carries a proposer, and it is
                        empty for admin-created rows — render nothing then. */}
                    {task.status === "pending" && task.created_by_name && (
                      <p className="font-body text-xs text-muted">
                        {t("tasks.proposedBy", {
                          name: task.created_by_name,
                        })}
                      </p>
                    )}
                    {/* The proposer's answer to "why should this task exist?" —
                        the context this review is meant to weigh (#1823).
                        Pending-only for the same reason as the byline above:
                        /tasks does not carry it. Rendered as text and never
                        through dangerouslySetInnerHTML — this is unfiltered
                        free text from any signed-in player. `pre-wrap` keeps
                        the paragraph breaks they typed without letting
                        anything else through. */}
                    {task.status === "pending" && task.notes && (
                      <div
                        style={{
                          marginTop: "var(--space-sm)",
                          paddingLeft: "var(--space-sm)",
                          borderLeft: "2px solid var(--color-border)",
                        }}
                      >
                        <span
                          className="label-caption"
                          style={{ display: "block" }}
                        >
                          {t("tasks.notesLabel")}
                        </span>
                        <p
                          className="font-body text-xs"
                          style={{ whiteSpace: "pre-wrap" }}
                        >
                          {task.notes}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(task.status === "pending" ||
                      task.status === "retired") && (
                      <button
                        onClick={() => openEdit(task)}
                        className="btn-outline text-xs"
                      >
                        {t("tasks.actions.edit")}
                      </button>
                    )}
                    {task.status === "pending" && (
                      <>
                        <button
                          onClick={() =>
                            void handleStatusChange(task.id, "active")
                          }
                          className="btn-primary text-xs"
                        >
                          {t("tasks.actions.activate")}
                        </button>
                        <button
                          onClick={() =>
                            void handleStatusChange(task.id, "retired")
                          }
                          className="btn-outline text-xs"
                        >
                          {t("tasks.actions.retire")}
                        </button>
                      </>
                    )}
                    {task.status === "active" && (
                      <button
                        onClick={() =>
                          void handleStatusChange(task.id, "retired")
                        }
                        className="btn-outline text-xs"
                      >
                        {t("tasks.actions.retire")}
                      </button>
                    )}
                    {task.status === "retired" && (
                      <button
                        onClick={() =>
                          void handleStatusChange(task.id, "active")
                        }
                        className="btn-primary text-xs"
                      >
                        {t("tasks.actions.reactivate")}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
