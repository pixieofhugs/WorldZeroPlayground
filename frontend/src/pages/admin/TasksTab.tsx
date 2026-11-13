import { useEffect, useRef, useState } from "react";
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
import TaskDeleteConfirm from "./TaskDeleteConfirm";
import { requestTaskDelete, markTaskRowDeleted } from "./taskDelete";
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
  /** The task's own faction (kit + own-faction modifier, #1714), not the metatask's. */
  primary_faction_slug: string;
}

const TASK_STATUSES = ["active", "pending", "retired", "deleted"] as const;
const RESTORE_STATUSES = ["pending", "active", "retired"] as const;
type TaskStatus = (typeof TASK_STATUSES)[number];

export default function TasksTab() {
  const { t } = useTranslation(["admin", "common"]);
  // Open backend string: unknown statuses fall back to the raw value.
  const statusLabel = (status: string): string => {
    const known = TASK_STATUSES.find((s) => s === status) as
      | TaskStatus
      | undefined;
    return known ? t(`tasks.status.${known}`) : status;
  };
  const gameConfig = useGameConfig();
  // For a TASK `na` means cross-faction, so it gets that wording. `/game-config`
  // is not reveal-gated, so hidden factions are removed here (#1891).
  const factionOptions = (gameConfig?.factions ?? [])
    .map((faction) => faction.slug)
    .filter((slug) => !isFactionHiddenFromChoosers(slug));
  const factionOptionLabel = (slug: string): string =>
    slug === UNAFFILIATED_FACTION_SLUG
      ? t("tasks.crossFaction")
      : factionName(slug);
  // `/game-config` has no `status`; the facet only reads `.slug`, so stub it.
  const factionRoster: FactionOut[] = (gameConfig?.factions ?? []).map(
    (faction) => ({ slug: faction.slug, status: "" }),
  );
  const [tasks, setTasks] = useState<AdminTaskRow[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  // Deleted rows (#3305) are fetched with the rest but hidden until asked for.
  const [showDeleted, setShowDeleted] = useState(false);
  // #3060: local state only, no URL.
  const [search, setSearch] = useState("");
  const [factionFilter, setFactionFilter] = useState<string[]>([]);
  const [levelFilter, setLevelFilter] = useState("");
  const [minPoints, setMinPoints] = useState("");
  const [maxPoints, setMaxPoints] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  // One delete confirm at a time (#3062); its error sits beside it, not at the top.
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // The row whose delete button takes focus back when its confirm is cancelled.
  const refocusDeleteId = useRef<number | null>(null);

  // Refetch both: approving moves a task between them (#909).
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

  const closeDelete = () => {
    setDeleteId(null);
    setDeleteError(null);
  };

  const handleDelete = async (taskId: number) => {
    setDeleting(true);
    setDeleteError(null);
    const refusal = await requestTaskDelete(taskId, t("tasks.deleteError"));
    setDeleting(false);
    if (refusal) {
      setDeleteError(refusal);
      return;
    }
    // No refetch: it would flash the whole list for one row.
    setTasks((rows) => markTaskRowDeleted(rows, taskId));
    closeDelete();
  };

  const levelOptions = distinctLevels(tasks);
  const rawLevel = levelFilter !== "" ? Number(levelFilter) : undefined;
  const effectiveLevel = reconcileLevelFilter(rawLevel, levelOptions);

  // Reset the <select> when its level drops out, else it renders blank.
  useEffect(() => {
    if (rawLevel !== undefined && effectiveLevel === undefined) {
      setLevelFilter("");
    }
  }, [rawLevel, effectiveLevel]);

  const criteria: AdminTaskFilterCriteria = {
    search,
    factions: factionFilter,
    level: effectiveLevel,
    minPoints: minPoints !== "" ? Number(minPoints) : undefined,
    maxPoints: maxPoints !== "" ? Number(maxPoints) : undefined,
  };
  const hasActiveFilters = hasActiveTaskFilters(criteria);

  const clearFilters = () => {
    setSearch("");
    setFactionFilter([]);
    setLevelFilter("");
    setMinPoints("");
    setMaxPoints("");
  };

  const baseFactionFacet = factionFacet(
    factionRoster,
    factionFilter,
    setFactionFilter,
  );
  // `na` is cross-faction for a TASK, not "Unaffiliated"; relabel only that row
  // (the applied chip reads it from here too).
  const filterFactionFacet: FilterFacet = {
    ...baseFactionFacet,
    options: baseFactionFacet.options.map((option) =>
      option.value === UNAFFILIATED_FACTION_SLUG
        ? { ...option, label: t("tasks.crossFaction") }
        : option,
    ),
  };

  const visibleTasks = showDeleted
    ? tasks
    : tasks.filter((task) => task.status !== "deleted");
  const statusFiltered =
    filter === "all"
      ? visibleTasks
      : visibleTasks.filter((task) => task.status === filter);
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

      {/* Search + faction: the shared FilterBar (#1365/#1446). */}
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

      {/* Level is single-select and points a range; FilterBar has neither. */}
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
            // Wheel would change the value instead of scrolling the long list.
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

      <label className="font-body text-xs text-muted flex items-center gap-1 mb-4">
        <input
          type="checkbox"
          checked={showDeleted}
          onChange={(e) => setShowDeleted(e.target.checked)}
        />
        {t("tasks.showDeleted")}
      </label>

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
                    {/* From era config; hidden while loading rather than empty. */}
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
              ) : deleteId === task.id ? (
                <TaskDeleteConfirm
                  title={task.title}
                  deleting={deleting}
                  error={deleteError}
                  onConfirm={() => void handleDelete(task.id)}
                  onCancel={() => {
                    refocusDeleteId.current = task.id;
                    closeDelete();
                  }}
                />
              ) : (
                /* Read view; wraps so four actions fit on a phone (#3062). */
                <div className="flex flex-wrap items-center gap-4">
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
                    {/* Only /admin/tasks/pending carries a proposer; empty for admin-created. */}
                    {task.status === "pending" && task.created_by_name && (
                      <p className="font-body text-xs text-muted">
                        {t("tasks.proposedBy", {
                          name: task.created_by_name,
                        })}
                      </p>
                    )}
                    {/* Proposer's rationale (#1823). Untrusted free text: render as
                        text only, `pre-wrap` for their line breaks. */}
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
                    {/* Undo (#3305). */}
                    {task.status === "deleted" &&
                      RESTORE_STATUSES.map((restoreStatus) => (
                        <button
                          key={restoreStatus}
                          onClick={() =>
                            void handleStatusChange(task.id, restoreStatus)
                          }
                          className="btn-outline text-xs"
                        >
                          {t("tasks.actions.restoreAs", {
                            status: t(`tasks.status.${restoreStatus}`),
                          })}
                        </button>
                      ))}
                    {/* Opens the confirm only. Disabled, not unmounted, while
                        another delete is in flight, so the list doesn't jump. */}
                    {task.status !== "deleted" && (<button
                      type="button"
                      ref={(button) => {
                        if (button && refocusDeleteId.current === task.id) {
                          refocusDeleteId.current = null;
                          button.focus();
                        }
                      }}
                      onClick={() => {
                        setDeleteId(task.id);
                        setDeleteError(null);
                      }}
                      disabled={deleting}
                      className="btn-outline text-xs control-off"
                    >
                      {t("tasks.actions.delete")}
                    </button>)}
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
