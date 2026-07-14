// Preview provider for design-sync. react-router-dom v6 hooks (<Link>,
// useNavigate) throw without a Router, and i18next must be initialized before
// any component calls useTranslation.
//
// Preview-only auth: auth-gated UI (vote rungs, comment composer) otherwise
// renders a "log in" gate because useAuth() has no user. We give it an
// authenticated viewer by resolving GET /auth/me to a mock user — but ONLY
// inside the preview harness (window.__dsPreview is set by the preview IIFE,
// never in a real design). Every other request rejects exactly like the
// offline app, so the SHIPPED bundle behaves as if this code isn't here.
import i18n from "../src/i18n"; // default export = the initialized i18next instance
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import api from "../src/api/axios";
import { AuthProvider } from "../src/auth/AuthContext";
import type { CurrentUser } from "../src/api/auth";

const MOCK_USER: CurrentUser = {
  account_id: 1,
  character: {
    id: 1,
    username: "wayfarer",
    display_name: "Wayfarer",
    bio: null,
    avatar_url: null,
    location: null,
    level: 4,
    score: 320,
    all_time_score: 320,
    faction_slug: "ua",
    status: "active",
    badges: [],
    invitations: [],
  },
  is_admin: false,
  can_create_additional_character: true,
  can_start_as_albescent: false,
  albescent_revealed: false,
  can_propose_task: true,
  can_propose_metatask: false,
  can_see_retired_tasks: false,
  can_see_pending_tasks: false,
  can_comment: true,
  second_character_level_required: 3,
  era_name: "Era One",
};

let installed = false;
function installPreviewAuth(): void {
  if (installed) return;
  installed = true;
  // The app's i18n throws on a missing copy key in dev mode. In a preview that
  // crashes the whole card blank (e.g. AlbescentInvitation, whose copy keys are
  // currently shadowed by a duplicate in factions.json). Downgrade to
  // render-the-key so a missing string degrades gracefully instead of blanking.
  i18n.options.saveMissing = false;
  i18n.options.missingKeyHandler = undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api.defaults.adapter = (config: any) =>
    String(config.url ?? "").includes("/auth/me")
      ? Promise.resolve({ data: MOCK_USER, status: 200, statusText: "OK", headers: {}, config })
      : Promise.reject(new Error("design-sync preview: network disabled"));
}

export function DSProvider({ children }: { children: ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof window !== "undefined" && (window as any).__dsPreview) installPreviewAuth();
  return (
    <AuthProvider>
      <MemoryRouter>{children}</MemoryRouter>
    </AuthProvider>
  );
}
