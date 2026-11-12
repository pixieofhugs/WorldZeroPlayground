/**
 * The level-up copy sheet (`/admin/level-ups`): the Field Stamp popup for every
 * level of the live era, for the copy editor. Like `FactionCopySheet`, no
 * editing mechanism of its own; Continue is a no-op.
 */
import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/ui/PageTitle'
import LevelUpPopup from '../../components/LevelUpPopup'
import { useGameConfig } from '../../hooks/useGameConfig'
import { useFormFactor } from '../../hooks/useFormFactor'
import { useFocusWithoutScroll } from './FactionCopySheet'
import { noop } from './copySheet/sheetFixtures'

/** `transform` contains the phone skin's `position: fixed` scrim per level. */
const PHONE_FRAME = { position: 'relative', transform: 'translateZ(0)', overflow: 'hidden', height: 760 } as const

export default function LevelUpCopySheet() {
  const { t } = useTranslation('admin')
  const config = useGameConfig()
  const formFactor = useFormFactor()
  useFocusWithoutScroll()
  return (
    <div className="py-8">
      <PageTitle title={t('levelUpSheet.title')} />
      <p className="card-meta mb-8">{t('levelUpSheet.intro')}</p>
      {/* Index 0 is the start state, never announced. */}
      {config?.level_profiles.map((profile, level) => level > 0 && (
        <section key={level} data-sheet-level={level} className="flex flex-col gap-3 mb-10">
          <h2 className="label-heading">{t('levelUpSheet.level', { level })}</h2>
          <div style={formFactor === 'mobile' ? PHONE_FRAME : undefined}>
            <LevelUpPopup
              level={level}
              rankKey={profile.rank_key}
              abilities={profile.unlocks}
              onContinue={noop}
              dimBackdrop={false}
            />
          </div>
        </section>
      ))}
    </div>
  )
}
