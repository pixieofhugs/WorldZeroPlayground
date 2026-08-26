// Preview provider for design-sync. react-router-dom v6 hooks (<Link>,
// useNavigate) throw without a Router, and i18next must be initialized before
// any component calls useTranslation.
//
// Preview-only auth: auth-gated UI (vote rungs, comment composer) otherwise
// renders a "log in" gate because useAuth() has no user. We give it an
// authenticated viewer by SUPPLYING the auth context directly — but ONLY inside
// the preview harness (window.__dsPreview is set by the preview IIFE, never in
// a real design), so the SHIPPED bundle behaves as if this code isn't here.
//
// It used to fake `GET /auth/me` by swapping axios' adapter, which #1400 retired
// along with axios. Replacing the transport is no longer even possible from
// here: `openapi-fetch` binds `globalThis.fetch` when `src/api/client.ts`
// creates the client, which happens while THIS module's imports are still being
// evaluated — a stub installed at render time is simply never consulted. The
// context is the honest seam anyway; it is what the app's own tests use, and it
// needs no request to succeed.
//
// ponytail: the old adapter also served `GET /factions` (a slug-only list) so
// the mobile factions directory previewed populated instead of showing its
// offline state. That one is gone with the transport. Restoring it means the
// preview harness stubbing `globalThis.fetch` BEFORE it evaluates this bundle —
// after that point the binding is already taken.
import i18n from "../src/i18n"; // default export = the initialized i18next instance
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
  can_create_additional_character: true,
  can_start_as_albescent: false,
  albescent_revealed: false,
  can_propose_task: true,
  can_propose_metatask: false,
  can_apply_metatask: false,
  can_see_retired_tasks: false,
  can_see_pending_tasks: false,
  can_comment: true,
  albescent_level_required: 8,
  second_character_level_required: 3,
  era_name: "Era One",
  // #811. Only WOW carries a level-jump reach in Era 1 and this viewer is UA,
  // so the affordance is correctly absent.
  level_jump_reach: 0,
  level_jump_available: false,
  task_browse_defaults_to_eligible: false,
};

/** The signed-in viewer a preview is drawn for, with no request behind it. */
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
  // The app's i18n throws on a missing copy key in dev mode. In a preview that
  // crashes the whole card blank (e.g. AlbescentInvitation, whose copy keys are
  // currently shadowed by a duplicate in factions.json). Downgrade to
  // render-the-key so a missing string degrades gracefully instead of blanking.
  i18n.options.saveMissing = false;
  i18n.options.missingKeyHandler = undefined;
}

export function DSProvider({ children }: { children: ReactNode }) {
  // The preview harness sets this flag on `window` before evaluating the kit.
  // Narrowed rather than `any`: this file is now linted (#1400 put the axios ban
  // on `.ds-kit/`, which is where the last hidden axios dependent was hiding),
  // and a one-property cast says what is being read without disabling a rule.
  const preview =
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __dsPreview?: unknown }).__dsPreview);
  if (preview) softenMissingKeys();

  // THE CARD TEMPLATE PAINTS THE BODY WHITE, AND THIS KIT DEFAULTS TO DARK.
  // Each generated preview card ships an inline `body{ …; background:#fff }`,
  // which beats the kit's own `body{ background-color: var(--color-bg-page) }`
  // (index.css) on source order. DEFAULT_THEME is 'dark', so the
  // [data-theme=dark] cascade hands every component cream ink — and any
  // component that does not paint an opaque ground of its own then renders that
  // ink on white. The page archetypes are the whole class: FieldDesk,
  // CreateCharacter, EditPraxis, FactionBody all expect the page ground a layout
  // wrapper gives them in the real app, and had been shipping near-illegible.
  // Repainting the body puts every card on the ground the app actually gives it.
  // Preview-only: cfg.provider wraps preview cards, never a built design.
  if (preview && typeof document !== 'undefined' && document.body) {
    document.body.style.background = 'var(--color-bg-page)';
  }
  // ThemeProvider backs useTheme() — NavBar and the shell chrome throw without
  // it. It also owns the [data-theme] cascade the whole kit styles against.
  // MotionProvider backs useMotion() (#2154), which throws outside it exactly as
  // useTheme does: AppearanceSection renders blank without this, and any future
  // consumer of the animations preference would too.
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
