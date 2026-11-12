import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  importTasksCsv,
  taskImportRowErrors,
  type TaskImportResult,
  type TaskImportRowError,
} from "../../api/admin";
import { extractError } from "../../utils/errors";

interface Props {
  onImported: () => void;
}

/**
 * Admin CSV task import (#1376). Atomic: any invalid row creates nothing, and
 * every rejection is returned at once.
 *
 * ponytail: plain file input, no drag-drop or preview. If imports become
 * routine, add a dry-run preview route (validation is already separate).
 */
export default function TaskImportPanel({ onImported }: Props) {
  const { t } = useTranslation(["admin", "common"]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<TaskImportResult | null>(null);
  const [rowErrors, setRowErrors] = useState<TaskImportRowError[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setResult(null);
    setRowErrors([]);
    setError(null);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    reset();
    try {
      const imported = await importTasksCsv(file);
      setResult(imported);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onImported();
    } catch (err) {
      const rows = taskImportRowErrors(err);
      setRowErrors(rows);
      // Per-row rejections are listed; headline only non-row failures.
      if (rows.length === 0) setError(extractError(err, t("import.failed")));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="card px-4 py-3 mb-4 flex flex-col gap-2">
      <p className="font-display text-lg font-bold">{t("import.heading")}</p>
      <p className="font-body text-xs text-muted">{t("import.columns")}</p>
      <p className="font-body text-xs text-muted">{t("import.atomicNote")}</p>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="font-body text-xs"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            reset();
          }}
        />
        <button
          onClick={() => void handleImport()}
          disabled={!file || importing}
          className="btn-primary text-xs"
        >
          {importing ? t("import.importing") : t("import.submit")}
        </button>
      </div>

      {error && (
        <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2">
          {error}
        </p>
      )}

      {rowErrors.length > 0 && (
        <div className="border-2 danger-edge px-3 py-2">
          <p className="font-body content-text danger-text">
            {t("import.rejected", { total: rowErrors.length })}
          </p>
          <ul className="font-body text-xs danger-text list-disc pl-5 mt-1">
            {rowErrors.map((rowError, index) => (
              <li key={`${rowError.row}-${index}`}>{rowError.msg}</li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div className="border-2 border-border px-3 py-2">
          <p className="font-body content-text">
            {t("import.created", { total: result.created_count })}
          </p>
          <ul className="font-body text-xs text-muted list-disc pl-5 mt-1">
            {result.created_titles.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
          {result.warnings.length > 0 && (
            <ul className="font-body text-xs text-muted list-disc pl-5 mt-1">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
