import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import admin from './locales/en/admin.json'
import common from './locales/en/common.json'
import factions from './locales/en/factions.json'
import feed from './locales/en/feed.json'
import forms from './locales/en/forms.json'
import home from './locales/en/home.json'
import praxis from './locales/en/praxis.json'
import progression from './locales/en/progression.json'
import tasks from './locales/en/tasks.json'
import taunts from './locales/en/taunts.json'
import votes from './locales/en/votes.json'

export const DEFAULT_NAMESPACE = 'common'

export const resources = {
  en: {
    admin,
    common,
    factions,
    feed,
    forms,
    home,
    praxis,
    progression,
    tasks,
    taunts,
    votes,
  },
} as const

const IS_PRODUCTION = import.meta.env.PROD

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: DEFAULT_NAMESPACE,
  ns: Object.keys(resources.en),
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

export default i18n
