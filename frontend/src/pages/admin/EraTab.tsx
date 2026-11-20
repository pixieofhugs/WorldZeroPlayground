import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import i18n from "../../i18n";
import { getEraPreflight, getEras, rollIntoEra } from "../../api/admin";
import type { EraOption, EraPreflight, EraRollOut } from "../../api/admin";
import { extractError } from "../../utils/errors";
import { factionName } from "../../utils/factions";
import "./adminList.css";
import "./adminEra.css";
import { defaultEraTarget, selectableEras } from "./eraRollTargets";

const TARGET_SELECT_ID = "admin-era-target";
const CONFIRM_ID = "admin-era-confirm";

/**
 * The era roll (#827, ADR-0091, #3673): irreversible, so it counts what the
 * roll will do before the button, and the button wakes only when the next era's
 * name is typed. `disabled` in flight too (a double submit would open two eras).
 */
export default function EraTab() {
  const { t } = useTranslation(["admin", "common", "factions"]);
  const [eras, setEras] = useState<EraOption[] | null>(null);
  const [target, setTarget] = useState("");
  const [preflight, setPreflight] = useState<EraPreflight | null>(null);
  const [typed, setTyped] = useState("");
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [result, setResult] = useState<EraRollOut | null>(null);

  const load = async () => {
    const rows = await getEras();
    setEras(rows);
    setTarget(defaultEraTarget(rows)?.config_key ?? "");
  };

  useEffect(() => {
    load().catch((err) => setError(extractError(err, i18n.t("admin:console.era.loadError"))));
  }, []);

  useEffect(() => {
    setPreflight(null);
    setTyped("");
    if (!target) return;
    let live = true;
    getEraPreflight(target)
      .then((next) => live && setPreflight(next))
      .catch((err) => live && setError(extractError(err, i18n.t("admin:console.era.preflightError"))));
    return () => {
      live = false;
    };
  }, [target]);

  const handleRoll = async () => {
    setActionError(null);
    setRolling(true);
    let outcome: EraRollOut;
    try {
      outcome = await rollIntoEra(target);
    } catch (err) {
      setActionError(extractError(err, t("console.era.rollError")));
      setRolling(false);
      return;
    }
    setResult(outcome);
    setRolling(false);
    // Re-read: `is_live` moved. A failure here leaves the rollover intact.
    await load().catch((err) => setActionError(extractError(err, t("console.era.loadError"))));
  };

  if (error) return <p className="adm-err">{error}</p>;
  if (!eras) return <p className="adm-muted">{t("common:loading")}</p>;

  const targets = selectableEras(eras);
  const name = preflight?.name ?? "";
  const leaving = preflight?.leaving_factions ?? [];
  const warnings = preflight
    ? [
        preflight.tasks_arriving === 0 && (
          <p className="adm-warn adm-era-warn" key="tasks">
            <strong>{t("console.era.warn.noTasks.lead", { name })}</strong> {t("console.era.warn.noTasks.body")}{" "}
            <Link to="/admin/tasks">{t("console.era.warn.noTasks.link")}</Link>
          </p>
        ),
        preflight.duels_awaiting_answer > 0 && (
          <p className="adm-warn adm-era-warn" key="duels">
            <strong>{t("console.era.warn.duels.lead", { count: preflight.duels_awaiting_answer })}</strong>{" "}
            {t("console.era.warn.duels.body", { count: preflight.duels_awaiting_answer })}
          </p>
        ),
        preflight.open_reports > 0 && (
          <p className="adm-warn adm-era-warn" key="reports">
            <strong>{t("console.era.warn.reports.lead", { count: preflight.open_reports })}</strong>{" "}
            <Link to="/admin/reports">{t("console.era.warn.reports.link", { count: preflight.open_reports })}</Link>
          </p>
        ),
      ].filter(Boolean)
    : [];

  return (
    <div className="adm-era">
      <header>
        <h1 className="adm-h1 adm-era-danger">{t("console.era.title")}</h1>
        <p className="adm-lede">{t("console.era.lede")}</p>
      </header>

      {result && (
        <div className="adm-card adm-era-card" role="status">
          <h2 className="adm-h1">{t("console.era.done.heading", { name: result.name })}</h2>
          <p className="adm-muted">{t("console.era.done.charactersReset", { count: result.characters_reset })}</p>
          <p className="adm-muted">{t("console.era.done.tasksReactivated", { count: result.tasks_reactivated })}</p>
          <p className="adm-muted">{t("console.era.done.tasksCreated", { count: result.tasks_created })}</p>
        </div>
      )}

      {targets.length === 0 ? (
        <p className="adm-muted">{t("console.era.noTarget")}</p>
      ) : (
        <section className="adm-card adm-era-card" aria-busy={!preflight}>
          <label className="adm-field" htmlFor={TARGET_SELECT_ID}>
            {t("console.era.next")}
            <select
              id={TARGET_SELECT_ID}
              className="adm-input"
              value={target}
              disabled={rolling}
              onChange={(event) => {
                setResult(null);
                setActionError(null);
                setTarget(event.target.value);
              }}
            >
              {targets.map((era) => (
                <option key={era.config_key} value={era.config_key}>
                  {era.name}
                </option>
              ))}
            </select>
          </label>

          {preflight && (
            <>
              <h2 className="adm-era-h2">{t("console.era.happens")}</h2>
              <ul className="adm-era-list">
                <li>{t("console.era.effects.characters", { count: preflight.characters_reset, name })}</li>
                <li>{t("console.era.effects.duels", { count: preflight.duels_frozen })}</li>
                <li>{t("console.era.effects.tasks", { count: preflight.tasks_retired })}</li>
                <li>
                  {leaving.length === 0
                    ? t("console.era.effects.noFactions")
                    : t("console.era.effects.factions", {
                        count: leaving.length,
                        names: leaving
                          .map((f) => t("console.era.effects.factionPeople", { name: factionName(f.slug), count: f.characters }))
                          .join(", "),
                      })}
                </li>
              </ul>

              <h2 className="adm-era-h2 adm-era-warnh">{t("console.era.check")}</h2>
              {warnings.length > 0 ? warnings : <p className="adm-muted">{t("console.era.clear")}</p>}

              <hr className="adm-era-rule" />
              <label className="adm-field" htmlFor={CONFIRM_ID}>
                <span>
                  <Trans t={t} i18nKey="console.era.type" values={{ name }} components={{ 1: <span className="adm-era-name" /> }} />
                </span>
                <input
                  id={CONFIRM_ID}
                  className="adm-input adm-era-input"
                  value={typed}
                  disabled={rolling}
                  autoComplete="off"
                  onChange={(event) => setTyped(event.target.value)}
                />
              </label>
              {actionError && <p className="adm-err" role="alert">{actionError}</p>}
              <div className="adm-btns">
                <button
                  type="button"
                  className="adm-btn adm-btn-dng-solid"
                  disabled={rolling || typed.trim() !== name}
                  onClick={() => void handleRoll()}
                >
                  {rolling ? t("console.era.working") : t("console.era.submit", { name })}
                </button>
                {!rolling && (
                  <button type="button" className="adm-btn" onClick={() => setTyped("")}>
                    {t("console.era.cancel")}
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
