/**
 * Propose-task dispatcher (#2538). The slug is the TARGET faction being
 * proposed for (owner ruling 2026-08-24), the pick in progress — the same seam
 * as `createCharacter`, reskinning live. `''`/`na`/unknown resolve to the na
 * kit, never UA (#796). The signed-out and level gates stay here, above the
 * archetype.
 */
import { useTranslation } from "react-i18next";
import { useProposeTask } from "./proposeTask/useProposeTask";
import PageTitle from "../components/ui/PageTitle";
import { resolveVariant } from "../utils/factionDispatch";
import { surfaceMap } from "../factions";

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

  const Archetype = resolveVariant(surfaceMap("proposeTask"), state.factionSlug);
  return <Archetype state={state} />;
}
