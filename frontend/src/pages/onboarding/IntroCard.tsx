import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import OnboardingCard, { primaryControl } from './OnboardingCard'

/**
 * Stop 1: the pitch, to someone who just scanned a sticker.
 *
 * Six named slots joined into one `<p>` (`SPEC-onboarding.md` § Copy, #1735),
 * one call site each so the catalog stays greppable. Keys were renamed with the
 * pitch in #2766 so names match content.
 *
 * Vocabulary: no "Praxis" before auth; "sign up" means a Character joining a
 * task; no factions (invitation-gated, ADR-0022). The levels slot's vote claim
 * is true since #3102 (`services/era_gates.py::may_vote`).
 */

const prose: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-content)',
  lineHeight: 1.55,
  color: 'var(--faction-default-card-text)',
  margin: 0,
}

export default function IntroCard({ onContinue }: { onContinue: () => void }) {
  const { t } = useTranslation('onboarding')

  const paragraph = [
    t('intro.paragraph.game'),
    t('intro.paragraph.character'),
    t('intro.paragraph.tasks'),
    t('intro.paragraph.proof'),
    t('intro.paragraph.levels'),
    t('intro.paragraph.ahead'),
  ].join(' ')

  return (
    <OnboardingCard
      step={1}
      title={t('intro.title')}
      actions={
        <button type="button" onClick={onContinue} style={primaryControl} data-testid="onboarding-continue">
          {t('intro.continue')}
        </button>
      }
    >
      <p style={prose} data-testid="onboarding-pitch">
        {paragraph}
      </p>
    </OnboardingCard>
  )
}
