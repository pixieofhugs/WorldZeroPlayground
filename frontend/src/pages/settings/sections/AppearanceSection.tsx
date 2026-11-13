import { useTranslation } from 'react-i18next'
import { useTheme } from '../../../hooks/useTheme'
import { useMotion } from '../../../hooks/useMotion'
import SettingsCard from '../SettingsCard'
import SettingsRow from '../SettingsRow'
import SettingsSwitch from '../SettingsSwitch'

const MOTION_NOTE_ID = 'settings-animations-system'

/**
 * Appearance (#2154): two device-local rows. Dark mode shares `useTheme()`'s one
 * cell (#701). Under OS reduced motion the Animations switch is DELIBERATELY off
 * and unmovable (motion only lives under `no-preference`), with the reason in the
 * note, the name and `aria-describedby`. See `hooks/useMotion.tsx`.
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
