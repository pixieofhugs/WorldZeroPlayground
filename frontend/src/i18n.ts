import i18n, { type PostProcessorModule } from 'i18next'
import { initReactI18next } from 'react-i18next'

import { listCopyOverrides } from './api/copy'
import { isCopyRecording, recordRenderedCopy } from './utils/copyRegistry'

import admin from './locales/en/admin.json'
import common from './locales/en/common.json'
import errors from './locales/en/errors.json'
import factions from './locales/en/factions.json'
import feed from './locales/en/feed.json'
import forms from './locales/en/forms.json'
import home from './locales/en/home.json'
import onboarding from './locales/en/onboarding.json'
import praxis from './locales/en/praxis.json'
import progression from './locales/en/progression.json'
import tasks from './locales/en/tasks.json'
import taunts from './locales/en/taunts.json'
import votes from './locales/en/votes.json'

export const DEFAULT_NAMESPACE = 'common'

/**
 * The catalog AS SHIPPED — the source of truth for "what did this key say
 * before anyone overrode it", which is the whole of Revert.
 *
 * It stays pristine only because `init` below is handed a CLONE. i18next's
 * `ResourceStore` keeps the object it is given BY REFERENCE and `addResource`
 * mutates it in place (`store.data === ` the object passed to `init`, verified
 * against i18next 26.4). Passing this one straight in made Revert a no-op that
 * reported success: it read the value the boot load or the previous save had
 * already written over the top, and wrote that back.
 *
 * The clone is 90 KB of JSON, once, at module init — measured at ~0.3 ms.
 */
export const resources = {
  en: {
    admin,
    common,
    errors,
    factions,
    feed,
    forms,
    home,
    onboarding,
    praxis,
    progression,
    tasks,
    taunts,
    votes,
  },
} as const

const IS_PRODUCTION = import.meta.env.PROD

/**
 * The index behind admin copy-edit mode (`utils/copyRegistry.ts`).
 *
 * Every rendered string passes through here, so it records the pairing nobody
 * else can see: the text on screen, and the `ns:key` that produced it. That is
 * how a click on a word finds its catalog key with no marker in the markup and
 * no edit to any call site.
 *
 * `extractFromKey` is i18next's own namespace resolver, and the reason this is
 * not a `key.split(':')`: a key reaches `t()` as `'ns:key'`, or bare with the ns
 * in `options.ns` (which is how `useTranslation('admin')` passes it), or bare
 * against `defaultNS`. All three have to answer the same, or a save writes to
 * the wrong file.
 *
 * Returns `value` untouched, always — it is a reader, not a transform.
 */
const copyRegistry: PostProcessorModule = {
  type: 'postProcessor',
  name: 'copyRegistry',
  process(value, key, options, translator) {
    // One boolean on the normal path: nothing is recorded, and nothing is
    // computed, unless an admin has armed the editor.
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
  // A clone, so that `resources` above keeps saying what the app shipped with.
  // See the comment on it: the store mutates whatever it is handed.
  resources: structuredClone(resources),
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: DEFAULT_NAMESPACE,
  ns: Object.keys(resources.en),
  postProcess: [copyRegistry.name],
  react: {
    // `addResource` after boot has to reach the screen. Without this, a
    // component only re-reads its copy when its own props change, so an
    // override applied a moment after paint — or saved from the editor — would
    // sit in the store unrendered until a navigation.
    //
    // ITS REACH IS NOT THE WHOLE TREE, and that is the known ceiling. This
    // subscribes the components that call `useTranslation`; the sixty-odd files
    // that call `i18n.t` directly with no hook (`components/taskCard/*`,
    // `components/selectCard/*`, `components/factionHero/*`, most of
    // `components/feed/*`, `cardMasthead/CardMasthead.tsx`) re-read their copy
    // only when something above them happens to re-render in the same pass —
    // luck, not a mechanism. `loadCopyOverrides` below emits `languageChanged`
    // for that reason, which re-renders every hook consumer and so reaches most
    // of them through an ancestor; a memoised subtree with no hook anywhere
    // above it still waits for a navigation. The fix, if it ever matters, is a
    // `useTranslation()` in those files, not more configuration here.
    bindI18nStore: 'added',
  },
  interpolation: {
    // React already escapes rendered output; double-escaping garbles copy.
    escapeValue: false,
  },
  // A missing copy key is a build defect, not a runtime condition. In dev and
  // test the handler throws so the defect cannot ship; in production i18next
  // falls back silently (saveMissing is off, so the handler never fires).
  saveMissing: !IS_PRODUCTION,
  missingKeyHandler: (_languages, namespace, key) => {
    throw new Error(`[i18n] missing copy key "${namespace}:${key}"`)
  },
})

/**
 * Apply the DB's copy overrides on top of the shipped catalog.
 *
 * NON-BLOCKING, and called from `main.tsx` rather than at this module's scope —
 * first paint must not wait on a round trip for wording. The accepted trade:
 * an overridden string paints in its shipped form for a moment and then
 * changes. `bindI18nStore: 'added'` above is what makes that second paint
 * happen without a reload.
 *
 * A failure is silence on purpose: the shipped catalog is a complete, correct
 * fallback, so there is nothing to tell the player.
 */
export async function loadCopyOverrides(): Promise<void> {
  try {
    const overrides = await listCopyOverrides()
    for (const { ns, key, value } of overrides) {
      i18n.addResource('en', ns, key, value)
    }
    // One re-read of the whole tree, once, when there is something to re-read.
    // `bindI18nStore: 'added'` only wakes hook consumers (see its comment);
    // this makes every one of them re-render, which is how the override reaches
    // a component that calls `i18n.t` directly under one of them.
    if (overrides.length > 0) i18n.emit('languageChanged', i18n.language)
  } catch {
    // Shipped copy stands.
  }
}

export default i18n
