import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAllTasks, updateTaskStatus, adminPatchTask } from "../../api/admin";
import type { TaskOut } from "../../api/tasks";
import { extractError } from "../../utils/errors";

type StatusFilter = "all" | "pending" | "active" | "retired";

const STATUS_FILTERS: StatusFilter[] = ["all", "pending", "active", "retired"];

interface EditState {
  title: string;
  description: string;
  point_value: string;
  level_required: string;
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
  const [tasks, setTasks] = useState<TaskOut[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => {
    setError(null);
    getAllTasks()
      .then(setTasks)
      .catch((err) => setError(extractError(err, t("tasks.loadError"))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleStatusChange = async (taskId: number, newStatus: string) => {
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

  const filtered =
    filter === "all" ? tasks : tasks.filter((task) => task.status === filter);

  if (loading)
    return <div className="font-body text-muted text-sm">{t("common:loading")}</div>;
  if (error) return <p className="font-body text-sm text-red-600">{error}</p>;

  return (
    <div>
      {actionError && (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2 mb-4">
          {actionError}
        </p>
      )}

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
        <p className="font-body text-sm text-muted">
          {t("tasks.empty", { filter: t(`tasks.filters.${filter}`) })}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((task) => (
            <div key={task.id} className="card px-4 py-3 flex flex-col gap-3">
              {editingId === task.id && editState ? (
                /* Inline edit form */
                <div className="flex flex-col gap-2">
                  <input
                    className="font-body text-sm border border-border bg-surface px-2 py-1"
                    value={editState.title}
                    onChange={(e) =>
                      setEditState({ ...editState, title: e.target.value })
                    }
                    placeholder={t("tasks.titlePlaceholder")}
                  />
                  <textarea
                    className="font-body text-sm border border-border bg-surface px-2 py-1 resize-y"
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
                        className="font-body text-sm border border-border bg-surface px-2 py-1 w-20"
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
                        className="font-body text-sm border border-border bg-surface px-2 py-1 w-16"
                        value={editState.level_required}
                        onChange={(e) =>
                          setEditState({
                            ...editState,
                            level_required: e.target.value,
                          })
                        }
                      />
                    </label>
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
                        className="eyebrow"
                        style={{
                          fontSize: 8,
                          padding: "1px 6px",
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
