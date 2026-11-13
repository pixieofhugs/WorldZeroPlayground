// Preview provider for design-sync: Router + i18n + theme/motion. Inside the
// preview harness only (window.__dsPreview), it supplies an authenticated
// viewer via AuthContext so auth-gated UI renders; shipped bundles are unaffected.
// Stubbing fetch here can't work: openapi-fetch binds globalThis.fetch while
// this module's imports evaluate.
//
// ponytail: mobile factions directory previews in its offline state; fix by
// having the harness stub globalThis.fetch BEFORE evaluating this bundle.
import i18n from "../src/i18n";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext, AuthProvider } from "../src/auth/AuthContext";
import { ThemeProvider } from "../src/hooks/useTheme";
import { MotionProvider } from "../src/hooks/useMotion";
import type { CurrentUser } from "../src/api/auth";

const MOCK_USER: CurrentUser = {
  account_id: 1,
  email: "wayfarer@example.com",
  provider: "google",
  character: {
    id: 1,
    username: "wayfarer",
    display_name: "Wayfarer",
    bio: "",
    tagline: "",
    avatar_url: "",
    location: "",
    level: 4,
    score: 320,
    all_time_score: 320,
    faction_slug: "ua",
    status: "active",
    created_at: "2026-06-28T09:12:00Z",
    badges: [],
    invitations: [],
  },
  is_admin: false,
  is_owner: false,
  can_create_additional_character: true,
  can_start_as_albescent: false,
  albescent_revealed: false,
  albescent_glimpsed: false,
  can_propose_task: true,
  can_propose_metatask: false,
  can_apply_metatask: false,
  can_see_retired_tasks: false,
  can_see_pending_tasks: false,
  can_comment: true,
  can_vote: true,
  vote_level_required: 1,
  albescent_level_required: 8,
  second_character_level_required: 3,
  era_name: "Era One",
  // #811: only WOW has level-jump reach in Era 1.
  level_jump_reach: 0,
  level_jump_available: false,
  task_browse_defaults_to_eligible: false,
};

const PREVIEW_AUTH = {
  user: MOCK_USER,
  loading: false,
  refetch: async () => {},
  applyUser: () => {},
  signOut: async () => {},
};

let softened = false;
function softenMissingKeys(): void {
  if (softened) return;
  softened = true;
  // Dev i18n throws on a missing key, blanking the card; render the key instead.
  i18n.options.saveMissing = false;
  i18n.options.missingKeyHandler = undefined;
}

export function DSProvider({ children }: { children: ReactNode }) {
  const preview =
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __dsPreview?: unknown }).__dsPreview);
  if (preview) softenMissingKeys();

  // Preview cards inline `body{background:#fff}` but the kit defaults to dark
  // (cream ink), so page archetypes without their own ground went illegible.
  if (preview && typeof document !== 'undefined' && document.body) {
    document.body.style.background = 'var(--color-bg-page)';
  }
  // useTheme()/useMotion() throw outside their providers.
  return (
    <ThemeProvider>
      <MotionProvider>
      {preview ? (
        <AuthContext.Provider value={PREVIEW_AUTH}>
          <MemoryRouter>{children}</MemoryRouter>
        </AuthContext.Provider>
      ) : (
        <AuthProvider>
          <MemoryRouter>{children}</MemoryRouter>
        </AuthProvider>
      )}
      </MotionProvider>
    </ThemeProvider>
  );
}
