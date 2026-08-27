/**
 * Propose-task dispatcher (#2538) — the seam, not the dress.
 *
 * The file has claimed to dispatch since the archetypes directory was cut, and
 * it did not: `pages/proposeTask/archetypes/` held exactly one file and this
 * page held a direct import of it, so the lookup always returned the same
 * answer. That is the shape four surfaces died in (#2346). It dispatches now.
 *
 * THE SLUG IS THE TARGET FACTION, NOT THE VIEWER'S. `state.factionSlug` is the
 * faction the task is being proposed FOR — the choice the form already asks for
 * as a first-class field, since #1824 replaced the pennant picker with chips.
 * Owner ruling, 2026-08-24: "propose a task should have the faction of the task
 * being proposed."
 *
 * WHICH MAKES THIS `createCharacter`'S SEAM, deliberately and exactly, because a
 * reader should not have to learn two. Like that page there is no loaded record
 * to read a faction off — the task does not exist yet — so the slug is the pick
 * in progress, and the page RESKINS LIVE as the chips change, returning to the
 * na kit the moment the pick is cleared. "Unaffiliated" (`na`) is a pick like
 * any other and lands on that same kit, since #2530 made it a manifest row
 * rather than a fallback named by hand.
 *
 * `''`, `na` and any unregistered slug resolve to `DefaultProposeTask`, the na
 * kit — never UA and never the viewer's own faction. Dispatch has no
 * cross-faction path at all, which is the guard `FactionSelectCard` did not have
 * when its `UaSelectCard` fallback "dressed every unaffiliated and unknown slug
 * in UA's costume" (#796, the third instance of #418/#636).
 *
 * `resolveVariant`, not `pickVariant`: since #2530 `na` is a manifest row rather
 * than a hand-named third argument, so the fallback takes no parameter.
 *
 * THE TWO GATES STAY HERE, ABOVE THE ARCHETYPE. Signed-out and under-levelled
 * are faction-agnostic answers, so an archetype only ever draws the happy-path
 * form or its success screen — one gate rather than eight copies of it.
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
