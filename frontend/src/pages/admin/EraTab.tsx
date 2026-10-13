import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getEras, rollIntoEra } from "../../api/admin";
import type { EraOption, EraRollOut } from "../../api/admin";
import { extractError } from "../../utils/errors";
import { defaultEraTarget, selectableEras } from "./eraRollTargets";

/** Explicit, because the label is a sibling rather than a wrapper — one control
 *  on one tab, so a fixed id cannot collide with a second instance. */
const TARGET_SELECT_ID = "admin-era-target";

/**
 * The era rollover control (#827, ADR-0091).
 *
 * The destructive tab, and the only irreversible button in the admin page: the
 * request ends the live era and opens another, resetting every character by the
 * incoming era's rules. So it is two-step, the second step spells out what it
 * does in words, and the confirm is really `disabled` while the request is in
 * flight — a double submit would open two eras, and there is no undo for the
 * first one, let alone the second.
 */
export default function EraTab() {
  const { t } = useTranslation(["admin", "common"]);
  const [eras, setEras] = useState<EraOption[] | null>(null);
  const [target, setTarget] = useState("");
  const [confirming, setConfirming] = useState(false);
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
    load().catch((err) => setError(extractError(err, t("era.loadError"))));
  }, [t]);

  const handleRoll = async () => {
    setActionError(null);
    setRolling(true);
    let outcome: EraRollOut;
    try {
      outcome = await rollIntoEra(target);
    } catch (err) {
      setActionError(extractError(err, t("era.rollError")));
      setRolling(false);
      return;
    }
    setResult(outcome);
    setConfirming(false);
    setRolling(false);
    // Re-read rather than patch: `is_live` moved on the server, and the option
    // a mod is now looking at has to be the one they can still roll into.
    // A failure here left the rollover itself intact, so it reports as an
    // action error and keeps the success readout on screen.
    await load().catch((err) =>
      setActionError(extractError(err, t("era.loadError"))),
    );
  };

  if (error) return <p className="font-body content-text danger-text">{error}</p>;
  if (!eras)
    return <div className="font-body text-muted content-text">{t("common:loading")}</div>;

  const targets = selectableEras(eras);
  const targetEra = eras.find((era) => era.config_key === target) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="label-heading mb-2">{t("era.heading")}</p>
        <p className="font-body content-text text-muted">{t("era.blurb")}</p>
      </div>

      {result && (
        <div className="card px-4 py-3">
          <p className="font-display text-lg font-bold">
            {t("era.done.heading", { name: result.name })}
          </p>
          <p className="font-body content-text text-muted">
            {t("era.done.charactersReset", { count: result.characters_reset })}
          </p>
        </div>
      )}

      {actionError && (
        <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2">
          {actionError}
        </p>
      )}

      {targets.length === 0 ? (
        /* One era in the register and it is already live: there is no target,
           so there is no control. Nothing to disable, nothing to explain. */
        <p className="font-body content-text text-muted">{t("era.noTarget")}</p>
      ) : confirming && targetEra ? (
        <div
          className="card px-4 py-3 flex flex-col gap-2"
          style={{ borderColor: "var(--color-danger-edge)" }}
        >
          {/* The frame is red; the WORDS are what say this is destructive. A
              reader who cannot see the border still gets the heading, the list
              and the no-undo line. */}
          <p className="label-heading" style={{ color: "var(--color-danger)" }}>
            {t("era.confirm.heading")}
          </p>
          <p className="font-body content-text">
            {t("era.confirm.lead", { name: targetEra.name })}
          </p>
          <ul className="font-body content-text list-disc pl-5">
            <li>{t("era.confirm.effects.characters")}</li>
            <li>{t("era.confirm.effects.duels")}</li>
            <li>{t("era.confirm.effects.board")}</li>
          </ul>
          <p className="font-body content-text font-bold">{t("era.confirm.noUndo")}</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => void handleRoll()}
              disabled={rolling}
              className="btn-primary text-xs"
            >
              {rolling
                ? t("era.confirm.working")
                : t("era.confirm.submit", { name: targetEra.name })}
            </button>
            {/* Hidden rather than disabled while the request is out: cancelling
                cannot recall a rollover that is already happening. */}
            {!rolling && (
              <button
                onClick={() => setConfirming(false)}
                className="btn-outline text-xs"
              >
                {t("era.confirm.cancel")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 items-start">
          <div className="flex flex-col gap-1">
            <label
              htmlFor={TARGET_SELECT_ID}
              className="font-body text-xs text-muted"
            >
              {t("era.selectLabel")}
            </label>
            <select
              id={TARGET_SELECT_ID}
              className="font-body content-text border border-border bg-surface px-2 py-1"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            >
              {eras.map((era) => (
                /* The live era stays in the list, marked and `disabled`. It is
                   not a control being shown greyed out — it is the register,
                   and where the game currently sits in it is the fact a mod
                   needs before picking the next row. What it is NOT is a
                   target: rolling into the era you are already in is a second
                   reset for nothing, and there is no undo. */
                <option
                  key={era.config_key}
                  value={era.config_key}
                  disabled={era.is_live}
                >
                  {era.is_live ? t("era.liveOption", { name: era.name }) : era.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setActionError(null);
              setResult(null);
              setConfirming(true);
            }}
            className="btn-outline text-xs"
            style={{
              borderColor: "var(--color-danger-ring)",
              color: "var(--color-danger)",
            }}
          >
            {t("era.begin")}
          </button>
        </div>
      )}
    </div>
  );
}
