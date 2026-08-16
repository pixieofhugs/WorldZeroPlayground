/**
 * #1610 — the admin Accounts tab labels two different backend enums.
 *
 * `AccountStatus` is `active | suspended`; `CharacterStatus` is
 * `active | banned`. One merged list served both rows, so the type permitted an
 * account labelled "banned" and a life labelled "suspended" and nothing said no.
 * The seam is the label helper: it now takes the allowed set, and each caller
 * passes the enum it statically holds.
 */
import { describe, it, expect } from "vitest";
import type { TFunction } from "i18next";
import {
  ACCOUNT_STATUSES,
  CHARACTER_STATUSES,
  statusLabel,
} from "../AccountsTab";
import adminCatalog from "../../../locales/en/admin.json";

/**
 * Prefixed so a catalog hit is distinguishable from the verbatim fallback —
 * every `accounts.status.*` value happens to equal its own key's last segment,
 * so an identity `t` would make the two outcomes byte-identical.
 */
const t = ((key: string) => `label:${key}`) as unknown as TFunction<"admin">;

describe("admin account/character status labels", () => {
  it("labels a suspended account", () => {
    expect(statusLabel("suspended", ACCOUNT_STATUSES, t)).toBe(
      "label:accounts.status.suspended",
    );
  });

  it("labels a banned character", () => {
    expect(statusLabel("banned", CHARACTER_STATUSES, t)).toBe(
      "label:accounts.status.banned",
    );
  });

  it("labels an active row on either side", () => {
    expect(statusLabel("active", ACCOUNT_STATUSES, t)).toBe(
      "label:accounts.status.active",
    );
    expect(statusLabel("active", CHARACTER_STATUSES, t)).toBe(
      "label:accounts.status.active",
    );
  });

  it("renders a status from the other enum verbatim rather than as its label", () => {
    // No account is ever banned and no life is ever suspended. If one ever
    // reaches the wrong row it falls through to the raw wire value, which is
    // the same fallback an unknown status takes.
    expect(statusLabel("banned", ACCOUNT_STATUSES, t)).toBe("banned");
    expect(statusLabel("suspended", CHARACTER_STATUSES, t)).toBe("suspended");
  });

  it("renders an unmapped status verbatim", () => {
    expect(statusLabel("shadow-realm", ACCOUNT_STATUSES, t)).toBe(
      "shadow-realm",
    );
  });

  it("draws both lists from the one catalog namespace", () => {
    for (const status of [...ACCOUNT_STATUSES, ...CHARACTER_STATUSES]) {
      expect(adminCatalog.accounts.status).toHaveProperty(status);
    }
  });

  it("does not let a status cross enums at the type level", () => {
    // The win this issue exists for: each list is a literal tuple, so the
    // other enum's value is not even a candidate. These lines fail to compile
    // if either list widens back to the merged union.
    // @ts-expect-error "banned" is a CharacterStatus, never an AccountStatus
    expect(ACCOUNT_STATUSES.includes("banned")).toBe(false);
    // @ts-expect-error "suspended" is an AccountStatus, never a CharacterStatus
    expect(CHARACTER_STATUSES.includes("suspended")).toBe(false);
  });
});
