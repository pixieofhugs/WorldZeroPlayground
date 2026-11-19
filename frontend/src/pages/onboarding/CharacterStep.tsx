import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import type { CharacterOut } from '../../api/characters'
import { useCreateCharacter } from '../characterPaths/useCreateCharacter'
import './arrival.css'

// Its own chunk: only a player who reaches this step pays for the form.
const Form = lazy(() => import('../characterPaths/archetypes/DefaultCreateCharacter'))

/** Step `character`: the real na creation form, Back immediately left of Cancel. */
export default function CharacterStep({ onCreated, onBack }: { onCreated: (c: CharacterOut) => Promise<void>; onBack?: () => void }) {
  const { t } = useTranslation('onboarding')
  const state = useCreateCharacter(onCreated)
  const back = onBack && (
    <button type="button" className="ob-ghost ob-cap ob-bk" onClick={onBack}>
      {t('flow.back')}
    </button>
  )
  return (
    <section className="ar-create">
      <div className="toss ar-toss">
        <Suspense fallback={null}>
          <Form state={state} leadAction={back} />
        </Suspense>
      </div>
    </section>
  )
}
