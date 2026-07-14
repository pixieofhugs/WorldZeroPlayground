/**
 * Propose-task dispatcher.
 *
 * Drives all form state via `useProposeTask()` and selects the right
 * faction-archetype form based on the user-selected `factionSlug`. Every
 * archetype consumes the same `ProposeTaskState`; only the visual treatment
 * differs. Mirrors the other page dispatchers. The faction-agnostic login /
 * eligibility gates live here so archetypes only ever render the happy-path
 * form (or its success screen).
 */
import { useTranslation } from "react-i18next";
import { useProposeTask } from "./proposeTask/useProposeTask";
import PageTitle from "../components/ui/PageTitle";
import DefaultProposeTask from "./proposeTask/archetypes/DefaultProposeTask";

// ponytail: no faction has a bespoke proposal form yet — everyone renders
// DefaultProposeTask. Add a pickVariant dispatch here when one does.
export default function ProposeTask() {
  const { t } = useTranslation("tasks");
  const state = useProposeTask();

  if (!state.isLoggedIn) {
    return (
      <div className="py-8" style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageTitle title={t("propose.pageTitle")} />
        <p className="font-body text-muted">{t("propose.loginRequired")}</p>
      </div>
    );
  }

  if (!state.canProposeTask) {
    return (
      <div className="py-8" style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageTitle title={t("propose.pageTitle")} />
        <p
          className="font-body"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {t("propose.levelGate", { level: state.currentLevel })}
        </p>
      </div>
    );
  }

  return <DefaultProposeTask state={state} />;
}
