// Typed copy keys: augments i18next's CustomTypeOptions so t('ns:key')
// autocompletes and a bad key fails the build. No codegen — types come
// straight from the en JSON resources.
//
// Note: since react-i18next v13 / i18next v23 the augmentation point is the
// 'i18next' module; react-i18next consumes it from there (augmenting
// 'react-i18next' directly is the pre-v13 mechanism and is ignored now).
import 'i18next'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      admin: typeof import('./locales/en/admin.json')
      common: typeof import('./locales/en/common.json')
      factions: typeof import('./locales/en/factions.json')
      feed: typeof import('./locales/en/feed.json')
      forms: typeof import('./locales/en/forms.json')
      home: typeof import('./locales/en/home.json')
      praxis: typeof import('./locales/en/praxis.json')
      progression: typeof import('./locales/en/progression.json')
      tasks: typeof import('./locales/en/tasks.json')
      taunts: typeof import('./locales/en/taunts.json')
      votes: typeof import('./locales/en/votes.json')
    }
  }
}
