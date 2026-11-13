/** #1610: account and character status labels take their own enum's allowed set. */
import { describe, it, expect } from "vitest";
import type { TFunction } from "i18next";
import {
  ACCOUNT_STATUSES,
  CHARACTER_STATUSES,
  statusLabel,
} from "../AccountsTab";
import adminCatalog from "../../../locales/en/admin.json";

/** Prefixed: catalog values equal their key's last segment, so identity `t` would hide a miss. */
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
    // The wrong enum's value falls through to the raw wire value.
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
    // Literal tuples: these fail to compile if either list widens back.
    // @ts-expect-error "banned" is a CharacterStatus, never an AccountStatus
    expect(ACCOUNT_STATUSES.includes("banned")).toBe(false);
    // @ts-expect-error "suspended" is an AccountStatus, never a CharacterStatus
    expect(CHARACTER_STATUSES.includes("suspended")).toBe(false);
  });
});
