import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { listAdminPraxes } from "../../api/admin";
import type { FactionOut } from "../../api/factions";
import type { ModerationStatus, PraxisCardOut } from "../../api/praxis";
import FilterBar, {
  factionFacet,
  type FilterRail,
} from "../../components/ui/FilterBar";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useGameConfig } from "../../hooks/useGameConfig";
import { extractError } from "../../utils/errors";
import AdminConfirm from "./AdminConfirm";
import {
  ALL,
  DEFAULT_PRAXIS_CRITERIA,
  PRAXIS_MODERATION_FILTERS,
  applyModeration,
  buildAdminPraxisQuery,
  hasActiveIdFilters,
  isDestructive,
  praxisRowActions,
  requestPraxisModeration,
  splitAdminPraxisPage,
} from "./adminPraxisRows";
import type {
  AdminPraxisCriteria,
  DestructiveAction,
  EraScope,
  PraxisRowAction,
} from "./adminPraxisRows";

const PRAXIS_STATUSES = ["in_progress", "pending", "submitted"] as const;
const PRAXIS_TYPES = ["solo", "collab", "duel"] as const;

/** Quiet when nothing is wrong, louder as the ruling gets heavier. */
const MODERATION_TONE: Record<ModerationStatus, string> = {
  visible: "text-muted",
  flagged: "warning-text",
  hidden: "danger-text",
  failed: "danger-text",
  deleted: "danger-text",
};

/**
 * Admin praxis finder (#3061) over every praxis, hidden and drafts included.
 * Shaped like `TasksTab`, but `adminPraxisRows` builds a server query (paged).
 */
export default function PraxisTab() {
  const { t } = useTranslation(["admin", "common"]);
  const gameConfig = useGameConfig();
  // No `status` on `/game-config`; see `TasksTab`.
  const factionRoster: FactionOut[] = (gameConfig?.factions ?? []).map(
    (faction) => ({ slug: faction.slug, status: "" }),
  );

  const [criteria, setCriteria] = useState<AdminPraxisCriteria>(
    DEFAULT_PRAXIS_CRITERIA,
  );
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<PraxisCardOut[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // One confirm open at a time, in place of its row's actions.
  const [confirm, setConfirm] = useState<{
    id: number;
    action: DestructiveAction;
  } | null>(null);
  const [failNote, setFailNote] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  // Refusals sit on their row; the list can be long.
  const [rowError, setRowError] = useState<{
    id: number;
    message: string;
  } | null>(null);
  // The row whose first action takes focus back once its confirm closes.
  const refocusId = useRef<number | null>(null);

  // Any criteria change resets to page one.
  const change = (patch: Partial<AdminPraxisCriteria>) => {
    setCriteria((current) => ({ ...current, ...patch }));
    setPage(0);
  };
  const clearAll = () => change(DEFAULT_PRAXIS_CRITERIA);

  const debouncedSearch = useDebouncedValue(criteria.search);
  const query = buildAdminPraxisQuery(
    { ...criteria, search: debouncedSearch },
    page,
  );
  const queryKey = JSON.stringify(query);

  useEffect(() => {
    // A slow answer to an earlier question must not overwrite a later one.
    let superseded = false;
    setLoading(true);
    setError(null);
    listAdminPraxes(query)
      .then((fetched) => {
        if (superseded) return;
        const next = splitAdminPraxisPage(fetched);
        setRows(next.rows);
        setHasNext(next.hasNext);
        setConfirm(null);
        setRowError(null);
      })
      .catch((err) => {
        if (!superseded) setError(extractError(err, t("praxis.loadError")));
      })
      .finally(() => {
        if (!superseded) setLoading(false);
      });
    return () => {
      superseded = true;
    };
  // `queryKey` is the query by value; `query` is fresh each render.
  }, [queryKey]);

  const closeConfirm = (praxisId: number) => {
    refocusId.current = praxisId;
    setConfirm(null);
    setFailNote("");
    setRowError(null);
  };

  const send = async (praxisId: number, action: PraxisRowAction) => {
    setBusyId(praxisId);
    setRowError(null);
    const result = await requestPraxisModeration(
      praxisId,
      action,
      failNote,
      t("praxis.actionError"),
    );
    setBusyId(null);
    if ("error" in result) {
      setRowError({ id: praxisId, message: result.error });
      return;
    }
    // No refetch: the row stays put so the admin can see and undo the action.
    setRows((current) => applyModeration(current, praxisId, result.status));
    closeConfirm(praxisId);
  };

  const begin = (praxisId: number, action: PraxisRowAction) => {
    setRowError(null);
    if (isDestructive(action)) {
      setFailNote("");
      setConfirm({ id: praxisId, action });
    } else {
      void send(praxisId, action);
    }
  };

  const allSegment = { value: ALL, label: t("praxis.filters.all") };
  const rails: FilterRail[] = [
    {
      key: "moderation",
      label: t("praxis.filters.moderationLabel"),
      value: criteria.moderation,
      defaultValue: ALL,
      segments: [
        allSegment,
        ...PRAXIS_MODERATION_FILTERS.map((value) => ({
          value,
          label: t(`praxis.moderation.${value}`),
        })),
      ],
      onChange: (value) =>
        change({ moderation: value as AdminPraxisCriteria["moderation"] }),
    },
    {
      key: "status",
      label: t("praxis.filters.statusLabel"),
      value: criteria.status,
      defaultValue: ALL,
      segments: [
        allSegment,
        ...PRAXIS_STATUSES.map((value) => ({
          value,
          label: t(`praxis.status.${value}`),
        })),
      ],
      onChange: (value) =>
        change({ status: value as AdminPraxisCriteria["status"] }),
    },
    {
      key: "type",
      label: t("praxis.filters.typeLabel"),
      value: criteria.type,
      defaultValue: ALL,
      segments: [
        allSegment,
        ...PRAXIS_TYPES.map((value) => ({
          value,
          label: t(`praxis.type.${value}`),
        })),
      ],
      onChange: (value) => change({ type: value as AdminPraxisCriteria["type"] }),
    },
    {
      key: "era",
      label: t("common:filters.bar.eraLabel"),
      value: criteria.eraScope,
      // Tab lands on `this_era`, so `all_eras` counts as a filter (raises a chip).
      defaultValue: "all_eras",
      segments: [
        { value: "this_era", label: t("common:filters.bar.era.current") },
        { value: "all_eras", label: t("common:filters.bar.era.all") },
      ],
      onChange: (value) => change({ eraScope: value as EraScope }),
    },
  ];

  const idBox = (
    field: "taskId" | "memberId",
    label: string,
  ) => (
    <label className="font-body text-xs text-muted flex items-center gap-1">
      {label}
      <input
        type="number"
        min={1}
        value={criteria[field]}
        onChange={(event) => change({ [field]: event.target.value })}
        // Wheel would change the value instead of scrolling (#3060).
        onWheel={(event) => event.currentTarget.blur()}
        className="font-body content-text border-2 border-border bg-card px-2 py-2 w-24"
      />
    </label>
  );

  return (
    <div>
      <FilterBar
        rails={rails}
        facets={[
          factionFacet(factionRoster, criteria.factions, (slugs) =>
            change({ factions: slugs }),
          ),
        ]}
        onClearAll={clearAll}
        busy={loading && rows.length > 0}
        search={{
          value: criteria.search,
          onChange: (value) => change({ search: value }),
          placeholder: t("praxis.filters.searchPlaceholder"),
          label: t("praxis.filters.searchLabel"),
        }}
      />

      {/* Outside FilterBar: tasks and characters don't fit a pick-list. */}
      <div className="flex flex-wrap items-center gap-3 mb-4 mt-3">
        {idBox("taskId", t("praxis.filters.taskIdLabel"))}
        {idBox("memberId", t("praxis.filters.memberIdLabel"))}
        {hasActiveIdFilters(criteria) && (
          <button
            type="button"
            onClick={() => change({ taskId: "", memberId: "" })}
            className="btn-outline text-xs"
          >
            {t("praxis.filters.clearIds")}
          </button>
        )}
      </div>

      {error ? (
        <p role="alert" className="font-body content-text danger-text">
          {error}
        </p>
      ) : loading && rows.length === 0 ? (
        <div className="font-body text-muted content-text">
          {t("common:loading")}
        </div>
      ) : rows.length === 0 ? (
        <p className="font-body content-text text-muted">
          {t(page > 0 ? "praxis.emptyPage" : "praxis.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((praxis) => {
            const title = praxis.title || praxis.task_title;
            const actions = praxisRowActions(praxis.moderation_status);
            const open = confirm?.id === praxis.id ? confirm.action : null;
            return (
              <div key={praxis.id} className="card px-4 py-3 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/praxis/${praxis.id}`}
                        className="font-display text-lg font-bold text-inherit"
                      >
                        {title}
                      </Link>
                      <span
                        className={`label-caption border border-border px-2 py-1 ${MODERATION_TONE[praxis.moderation_status]}`}
                      >
                        {t(`praxis.moderation.${praxis.moderation_status}`)}
                      </span>
                    </div>
                    <p className="font-body text-xs text-muted">
                      {t("praxis.meta", {
                        author: praxis.created_by_display_name,
                        authorId: praxis.created_by_id,
                        task: praxis.task_title,
                        taskId: praxis.task_id,
                        type: t(`praxis.type.${praxis.type}`),
                        status: t(`praxis.status.${praxis.status}`),
                      })}
                    </p>
                  </div>
                  {!open && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {actions.map((action, index) => (
                        <button
                          key={action}
                          type="button"
                          ref={
                            index === 0
                              ? (button) => {
                                  if (button && refocusId.current === praxis.id) {
                                    refocusId.current = null;
                                    button.focus();
                                  }
                                }
                              : undefined
                          }
                          onClick={() => begin(praxis.id, action)}
                          // Disabled, not unmounted, so the row doesn't jump.
                          disabled={busyId !== null}
                          className={`text-xs control-off ${action === "restore" ? "btn-primary" : "btn-outline"}`}
                        >
                          {busyId === praxis.id && action === "restore"
                            ? t("praxis.actions.working")
                            : t(`praxis.actions.${action}`)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {open && (
                  <AdminConfirm
                    heading={t(`praxis.confirm.${open}.heading`)}
                    lead={t(`praxis.confirm.${open}.lead`, { title })}
                    confirmLabel={t(`praxis.confirm.${open}.submit`)}
                    busyLabel={t("praxis.actions.working")}
                    cancelLabel={t("praxis.confirm.cancel")}
                    busy={busyId === praxis.id}
                    error={rowError?.id === praxis.id ? rowError.message : null}
                    onConfirm={() => void send(praxis.id, open)}
                    onCancel={() => closeConfirm(praxis.id)}
                  >
                    {open === "fail" && (
                      <label className="font-body text-xs text-muted flex flex-col gap-1">
                        {t("praxis.confirm.fail.noteLabel")}
                        <textarea
                          rows={2}
                          maxLength={1000}
                          value={failNote}
                          onChange={(event) => setFailNote(event.target.value)}
                          className="font-body content-text border border-border bg-surface px-2 py-1 resize-y"
                        />
                      </label>
                    )}
                  </AdminConfirm>
                )}

                {/* A refusal with no confirm open — a restore that failed. */}
                {!open && rowError?.id === praxis.id && (
                  <p role="alert" className="font-body content-text danger-text">
                    {rowError.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(page > 0 || hasNext) && (
        <nav
          aria-label={t("praxis.paging.label")}
          className="flex flex-wrap items-center gap-3 mt-4"
        >
          {page > 0 && (
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              className="btn-outline text-xs"
            >
              {t("praxis.paging.previous")}
            </button>
          )}
          <span className="font-body text-xs text-muted">
            {t("praxis.paging.page", { page: page + 1 })}
          </span>
          {hasNext && (
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              className="btn-outline text-xs"
            >
              {t("praxis.paging.next")}
            </button>
          )}
        </nav>
      )}
    </div>
  );
}
