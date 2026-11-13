/**
 * Task detail dispatcher (surface #10, SPEC-faction-ui-profile.md): loads via
 * `useTaskDetail(id)` and picks the archetype by `task.primary_faction_slug`.
 * One responsive archetype per faction (ADR-0058) — no form-factor branch.
 * Archetypes mount `TaskDetailComments` themselves.
 */
import { useParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import PageTitle from "../components/ui/PageTitle";
import StartHereMark from "../components/StartHereMark";
import ConfirmDialog from "../components/confirm/ConfirmDialog";
import { resolveVariant } from "../utils/factionDispatch";
import { surfaceMap } from "../factions";
import { useTaskDetail } from "./taskDetail/useTaskDetail";


export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(["tasks", "common"]);
  const state = useTaskDetail(id);

  if (state.loading)
    return <div className="py-8 font-body text-muted">{t("common:loading")}</div>;

  if (state.fetchError)
    return (
      <div className="py-8">
        <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2">
          {state.fetchError}{" "}
          <Trans
            t={t}
            i18nKey="detail.fetchError"
            components={[
              <button
                key="0"
                onClick={() => window.location.reload()}
                className="underline"
              />,
            ]}
          />
        </p>
      </div>
    );

  if (!state.task)
    return (
      <div className="py-8 font-body text-muted">{t("detail.notFound")}</div>
    );

  const slug = state.task.primary_faction_slug ?? null;
  const Archetype = resolveVariant(surfaceMap('taskDetail'), slug);

  return (
    <>
      {/* No eyebrow: it read as a fake breadcrumb (#2102). */}
      <PageTitle title={t("detail.pageTitle")} />
      {/* The task marks itself (#1861); here so no archetype learns about new
          players. `start_here` is server-derived. */}
      {state.task.start_here && (
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <StartHereMark />
        </div>
      )}
      <Archetype state={state} />
      {/* Drop confirm, mounted once for all archetypes (#2215); never
          `window.confirm`, which browsers may suppress. Wears the TASK's
          faction. */}
      {state.dropConfirm && (
        <ConfirmDialog
          request={state.dropConfirm.request}
          factionSlug={slug}
          onConfirm={state.dropConfirm.onConfirm}
          onDismiss={state.dropConfirm.onDismiss}
        />
      )}
    </>
  );
}
