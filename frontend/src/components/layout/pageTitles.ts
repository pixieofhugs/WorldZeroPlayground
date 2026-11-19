import { matchPath } from 'react-router-dom'
import type common from '../../locales/en/common.json'

export type PageTitleKey = keyof typeof common.pageTitles

/** Static routes -> `common:pageTitles.<key>`. `/`, `/start` and the dynamic detail pages name themselves via `useDocumentTitle`. */
const ROUTE_TITLES: ReadonlyArray<readonly [pattern: string, key: PageTitleKey]> = [
  ['/start/again', 'welcomeBack'],
  ['/tasks', 'tasks'],
  ['/praxis', 'praxes'],
  ['/praxis/:id/edit', 'editPraxis'],
  ['/duel/:id', 'duel'],
  ['/characters/create', 'createCharacter'],
  ['/characters/:id/edit', 'editCharacter'],
  ['/leaderboard', 'leaderboard'],
  ['/factions', 'factions'],
  ['/factions/:slug', 'faction'],
  ['/updates', 'updates'],
  ['/settings', 'settings'],
  ['/admin', 'admin'],
  ['/admin/copy/:slug', 'admin'],
  ['/admin/level-ups', 'admin'],
  ['/about', 'about'],
  ['/contact', 'contact'],
  ['/propose-task', 'proposeTask'],
  ['/goodbye', 'goodbye'],
  ['/disclaimer', 'disclaimer'],
  ['/attributions', 'attributions'],
  ['/donate', 'donate'],
]

export function pageTitleKey(pathname: string): PageTitleKey | null {
  return ROUTE_TITLES.find(([pattern]) => matchPath(pattern, pathname))?.[1] ?? null
}
