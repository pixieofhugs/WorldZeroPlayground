import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  getAccounts,
  getAccountDetail,
  suspendAccount,
  banCharacter,
} from "../../api/admin";
import type {
  AccountSummary,
  AccountDetail,
  CharacterStatus,
} from "../../api/admin";
import { extractError } from "../../utils/errors";
import { formatTimestamp } from "../../utils/dates";
import { useAuth } from "../../auth/AuthContext";
import AdminRosterSection from "./AdminRosterSection";

/** Two backend enums, one `accounts.status.*` namespace (#1610). The account
 *  enum is not on the wire schema, so it is stated here. */
export const ACCOUNT_STATUSES = ["active", "suspended"] as const;
export const CHARACTER_STATUSES = [
  "active",
  "banned",
] as const satisfies readonly CharacterStatus[];

/** Exists only to prove the interpolated key is a real catalog key. */
type LabelledStatus =
  | (typeof ACCOUNT_STATUSES)[number]
  | (typeof CHARACTER_STATUSES)[number];

/** Statuses are open strings on the wire; an unmapped one renders raw. */
export function statusLabel(
  status: string,
  allowed: readonly LabelledStatus[],
  t: TFunction<"admin">,
): string {
  const known = allowed.find((s) => s === status);
  return known ? t(`accounts.status.${known}`) : status;
}

export default function AccountsTab() {
  const { t } = useTranslation(["admin", "common"]);
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = (email?: string) => {
    setError(null);
    getAccounts(email || undefined)
      .then(setAccounts)
      .catch((err) => setError(extractError(err, t("accounts.loadError"))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSearch = (value: string) => {
    setSearchEmail(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      refresh(value);
    }, 300);
  };

  const handleExpand = async (accountId: number) => {
    if (expandedId === accountId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(accountId);
    try {
      const d = await getAccountDetail(accountId);
      setDetail(d);
    } catch (err) {
      setActionError(extractError(err, t("accounts.detailError")));
    }
  };

  const handleSuspend = async (accountId: number, suspended: boolean) => {
    setActionError(null);
    try {
      await suspendAccount(accountId, suspended);
      refresh(searchEmail);
      if (expandedId === accountId) {
        const d = await getAccountDetail(accountId);
        setDetail(d);
      }
    } catch (err) {
      setActionError(extractError(err, t("accounts.suspendError")));
    }
  };

  const handleBan = async (characterId: number, banned: boolean) => {
    setActionError(null);
    try {
      await banCharacter(characterId, banned);
      if (expandedId) {
        const d = await getAccountDetail(expandedId);
        setDetail(d);
      }
    } catch (err) {
      setActionError(extractError(err, t("accounts.banError")));
    }
  };

  if (loading)
    return <div className="font-body text-muted content-text">{t("common:loading")}</div>;
  if (error) return <p className="font-body content-text danger-text">{error}</p>;

  return (
    <div>
      <AdminRosterSection isOwner={user?.is_owner === true} />
      {actionError && (
        <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2 mb-4">
          {actionError}
        </p>
      )}

      <input
        type="text"
        placeholder={t("accounts.searchPlaceholder")}
        value={searchEmail}
        onChange={(e) => handleSearch(e.target.value)}
        className="border-2 border-border bg-card px-3 py-2 font-body content-text focus:outline-none focus:border-ink w-full mb-4"
      />

      {accounts.length === 0 ? (
        <p className="font-body content-text text-muted">{t("accounts.empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((account) => (
            <div key={account.id} className="card px-4 py-3">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => void handleExpand(account.id)}
                  className="flex-1 text-left"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <p className="font-display text-lg font-bold">
                    {account.email}
                  </p>
                  <p className="font-body text-xs text-muted">
                    <span
                      style={{
                        color:
                          account.status === "suspended"
                            ? "var(--color-danger)"
                            : "var(--color-success)",
                        fontWeight: 700,
                      }}
                    >
                      {statusLabel(account.status, ACCOUNT_STATUSES, t)}
                    </span>{" "}
                    &middot; {t("accounts.idLabel", { id: account.id })} &middot;{" "}
                    {formatTimestamp(account.created_at)}
                  </p>
                </button>
                <button
                  onClick={() =>
                    void handleSuspend(
                      account.id,
                      account.status !== "suspended",
                    )
                  }
                  className="btn-outline text-xs shrink-0"
                  style={
                    account.status === "suspended"
                      ? {
                          borderColor: "var(--color-success)",
                          color: "var(--color-success)",
                        }
                      : {
                          borderColor: "var(--color-danger-ring)",
                          color: "var(--color-danger)",
                        }
                  }
                >
                  {account.status === "suspended"
                    ? t("accounts.unsuspend")
                    : t("accounts.suspend")}
                </button>
              </div>

              {expandedId === account.id && detail && (
                <div className="mt-3 ml-4 border-l-2 border-border pl-4">
                  <p className="label-heading mb-2">
                    {t("accounts.charactersHeading", {
                      count: detail.characters.length,
                    })}
                  </p>
                  {detail.characters.length === 0 ? (
                    <p className="font-body content-text text-muted">
                      {t("accounts.noCharacters")}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {detail.characters.map((character) => (
                        <div
                          key={character.id}
                          className="flex items-center gap-3"
                        >
                          <div className="flex-1">
                            <span className="font-body text-sm font-bold">
                              {character.display_name}
                            </span>
                            <span className="font-body text-xs text-muted ml-2">
                              @{character.username} &middot;{" "}
                              {character.faction_slug}
                            </span>
                            <span
                              className="ml-2 font-body text-xs"
                              style={{
                                color:
                                  character.status === "banned"
                                    ? "var(--color-danger)"
                                    : "var(--color-success)",
                                fontWeight: 700,
                              }}
                            >
                              {statusLabel(
                                character.status,
                                CHARACTER_STATUSES,
                                t,
                              )}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              void handleBan(
                                character.id,
                                character.status !== "banned",
                              )
                            }
                            // `text-xs` is admin's density; no inline size (#1783).
                            className
="btn-outline text-xs"
                            style={{
                              padding: "var(--space-xs) var(--space-sm)",
                              ...(character.status === "banned"
                                ? {
                                    borderColor: "var(--color-success)",
                                    color: "var(--color-success)",
                                  }
                                : {
                                    borderColor: "var(--color-danger-ring)",
                                    color: "var(--color-danger)",
                                  }),
                            }}
                          >
                            {character.status === "banned"
                              ? t("accounts.unban")
                              : t("accounts.ban")}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
