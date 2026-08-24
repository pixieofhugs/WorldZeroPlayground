import { useTranslation } from 'react-i18next'
import { useTheme } from '../../../hooks/useTheme'
import { useMotion } from '../../../hooks/useMotion'
import SettingsCard from '../SettingsCard'
import SettingsRow from '../SettingsRow'
import SettingsSwitch from '../SettingsSwitch'

const MOTION_NOTE_ID = 'settings-animations-system'

/**
 * Appearance (#2154) — two device-local rows, no backend behind either.
 *
 * Dark mode reuses `useTheme()` verbatim: the same one cell the NavBar reads,
 * so a flip here re-renders every other consumer (#701). Animations is the new
 * `useMotion()`, built to the same shape.
 *
 * THE ANIMATIONS SWITCH GOES OFF AND UNMOVABLE WHEN THE OS ASKS FOR REDUCED
 * MOTION, AND THAT IS DELIBERATE — not a bug, not a loading state. Motion in
 * this tree lives inside `@media (prefers-reduced-motion: no-preference)`, so
 * the preference can only ever subtract; a switch reading "on" while the page
 * is already still would be a control that does nothing. The reason is given
 * three ways: the visible note, the switch's accessible name, and
 * `aria-describedby` pointing at the note. See `hooks/useMotion.tsx`.
 */
export default function AppearanceSection({ sectionId }: { readonly sectionId: string }) {
  const { t } = useTranslation('common')
  const { theme, toggle: toggleTheme } = useTheme()
  const { motion, systemReduced, toggle: toggleMotion } = useMotion()

  const dark = theme === 'dark'
  const animationsOn = motion === 'on'

  return (
    <SettingsCard sectionId={sectionId} title={t('settings.appearance.eyebrow')}>
      <SettingsRow title={t('settings.appearance.darkMode')} help={t('settings.appearance.darkModeHelp')}>
        <SettingsSwitch
          checked={dark}
          label={t('settings.appearance.darkMode')}
          onToggle={toggleTheme}
          testId="settings-theme-toggle"
        />
      </SettingsRow>

      <SettingsRow
        last
        title={t('settings.appearance.animations')}
        help={t('settings.appearance.animationsHelp')}
        note={systemReduced ? t('settings.appearance.animationsSystemNote') : undefined}
        noteId={MOTION_NOTE_ID}
      >
        <SettingsSwitch
          checked={animationsOn}
          disabled={systemReduced}
          describedById={systemReduced ? MOTION_NOTE_ID : undefined}
          label={
            systemReduced
              ? t('settings.appearance.animationsSystemName')
              : t('settings.appearance.animations')
          }
          onToggle={toggleMotion}
          testId="settings-animations-toggle"
        />
      </SettingsRow>
    </SettingsCard>
  )
}
