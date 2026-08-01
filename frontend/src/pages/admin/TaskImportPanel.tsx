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
  /** Called after a successful import so the task list picks up the new rows. */
  onImported: () => void;
}

/**
 * Admin CSV task import (#1376).
 *
 * The import is atomic and the copy says so: a file with any invalid row creates
 * nothing, and every rejected row comes back at once so the admin fixes the
 * whole file in one pass rather than one upload per mistake.
 *
 * ponytail: a plain file input, no drag-and-drop and no preview grid — the issue
 * asked for "nothing fancy" for a rarely-used surface. If imports become routine,
 * the upgrade path is a dry-run preview endpoint (the service already separates
 * validation from insertion, so it is a second route, not a rewrite).
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
      // Row-level rejections are already listed; only surface a headline message
      // for the failures that are not per-row (403, network, server error).
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
        <p className="font-body content-text text-red-600 border-2 border-red-300 px-3 py-2">
          {error}
        </p>
      )}

      {rowErrors.length > 0 && (
        <div className="border-2 border-red-300 px-3 py-2">
          <p className="font-body content-text text-red-600">
            {t("import.rejected", { total: rowErrors.length })}
          </p>
          <ul className="font-body text-xs text-red-600 list-disc pl-5 mt-1">
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
