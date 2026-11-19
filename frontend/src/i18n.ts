import i18n, { type PostProcessorModule } from 'i18next'
import { initReactI18next } from 'react-i18next'

import { listCopyOverrides } from './api/copy'
import { isCopyRecording, recordRenderedCopy } from './utils/copyRegistry'

import common from './locales/en/common.json'
import errors from './locales/en/errors.json'
import factions from './locales/en/factions.json'
import feed from './locales/en/feed.json'
import home from './locales/en/home.json'
import praxis from './locales/en/praxis.json'
import progression from './locales/en/progression.json'
import tasks from './locales/en/tasks.json'
import taunts from './locales/en/taunts.json'
import votes from './locales/en/votes.json'

export const DEFAULT_NAMESPACE = 'common'

/**
 * The catalog as shipped: what Revert restores. `init` gets a CLONE because
 * i18next's store keeps the passed object by reference and `addResource`
 * mutates it (i18next 26.4); without the clone Revert silently no-ops.
 */
export const resources = {
  en: {
    common,
    errors,
    factions,
    feed,
    home,
    praxis,
    progression,
    tasks,
    taunts,
    votes,
  },
} as const

/**
 * `feed` is eager: the task and sigil cards read it with `i18n.t` from the welcome flow and the
 * shell, which no route loader awaits. Shipped JSON of namespaces loaded with their route, for Revert (`shippedValue`). */
export const lazyShipped: Record<string, unknown> = {}

/** Only `/start` surfaces read `onboarding:`; keeping it out of the eager bundle holds the byte budget. */
export function registerNamespace(ns: string, json: object): void {
  lazyShipped[ns] = json
  // overwrite=false: a copy override already applied stays on top.
  i18n.addResourceBundle('en', ns, structuredClone(json), true, false)
}

export async function loadAppCopy(): Promise<void> {
  const [admin, forms] = await Promise.all([import('./locales/en/admin.json'), import('./locales/en/forms.json')])
  registerNamespace('admin', admin.default)
  registerNamespace('forms', forms.default)
}

export async function loadOnboardingCopy(): Promise<void> {
  registerNamespace('onboarding', (await import('./locales/en/onboarding.json')).default)
}

const IS_PRODUCTION = import.meta.env.PROD

/**
 * Records text-on-screen -> `ns:key` for admin copy-edit mode
 * (`utils/copyRegistry.ts`). Uses `extractFromKey`, not `split(':')`: the ns may
 * come as `'ns:key'`, `options.ns`, or `defaultNS`. Never transforms `value`.
 */
const copyRegistry: PostProcessorModule = {
  type: 'postProcessor',
  name: 'copyRegistry',
  process(value, key, options, translator) {
    // Cheap no-op unless an admin armed the editor.
    if (!isCopyRecording() || typeof value !== 'string') return value
    const one = Array.isArray(key) ? key[key.length - 1] : key
    const { key: bare, namespaces } = translator.extractFromKey(one, options)
    const ns = Array.isArray(namespaces) ? namespaces[namespaces.length - 1] : namespaces
    if (typeof ns === 'string' && typeof bare === 'string') {
      recordRenderedCopy(value, { ns, key: bare })
    }
    return value
  },
}

i18n.use(initReactI18next).use(copyRegistry).init({
  // Clone: see `resources`.
  resources: structuredClone(resources),
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: DEFAULT_NAMESPACE,
  ns: Object.keys(resources.en),
  postProcess: [copyRegistry.name],
  react: {
    // Makes post-boot `addResource` reach the screen, but only for
    // `useTranslation` consumers; files calling `i18n.t` directly rely on an
    // ancestor re-rendering (hence `languageChanged` in `loadCopyOverrides`).
    // Fix if it matters: add `useTranslation()` there, not more config.
    bindI18nStore: 'added',
  },
  interpolation: {
    // React already escapes rendered output; double-escaping garbles copy.
    escapeValue: false,
  },
  // Missing key throws in dev/test; prod falls back silently (saveMissing off).
  saveMissing: !IS_PRODUCTION,
  missingKeyHandler: (_languages, namespace, key) => {
    throw new Error(`[i18n] missing copy key "${namespace}:${key}"`)
  },
})

// Suites read copy at collection time, before any route has loaded it. Constant-folded out of production builds.
if (import.meta.env.MODE === 'test') await loadAppCopy()

/**
 * Apply DB copy overrides over the shipped catalog. Non-blocking (called from
 * `main.tsx`) so first paint never waits; failures are silent since the shipped
 * catalog is a complete fallback.
 */
export async function loadCopyOverrides(): Promise<void> {
  try {
    const overrides = await listCopyOverrides()
    for (const { ns, key, value } of overrides) {
      i18n.addResource('en', ns, key, value)
    }
    // Re-render every hook consumer so direct `i18n.t` callers below them update.
    if (overrides.length > 0) i18n.emit('languageChanged', i18n.language)
  } catch {
    // Shipped copy stands.
  }
}

export default i18n
