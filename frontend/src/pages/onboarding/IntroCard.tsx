import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import OnboardingCard, { primaryControl } from './OnboardingCard'

/**
 * Stop 1 — the pitch, to someone who has just pointed a phone at a sticker.
 *
 * SIX THINGS, ONE PARAGRAPH (`docs/spec/SPEC-onboarding.md` § Copy, #1735).
 * The paragraph is assembled from six named slots and rendered as a single
 * `<p>`: the slots are what make each of the six a thing the owner can write
 * *into* rather than a thing to remember, and the join is what keeps it one
 * paragraph rather than three beats. The order front-loads the ask — what the
 * game will actually cost you is sentences two and three, never the end.
 *
 * The six are called out one call site each rather than mapped over a key list,
 * so the catalog stays greppable from here (`SignInOptions` makes the same
 * trade for the same reason).
 *
 * VOCABULARY. "Praxis" does not appear on this card, or on any card before
 * auth — the player meets the word once they have one. "Sign up" is not used
 * for account creation either; a Character *signs up for* a task, and that is
 * the only thing it means. Factions are cut entirely: invitation-gated
 * (ADR-0022) and unreachable at level 0, so naming them here sells something
 * the game cannot deliver for a long time.
 *
 * EVERY STRING IS A PLACEHOLDER. The owner writes the words.
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
    t('intro.paragraph.realWorld'),
    t('intro.paragraph.proof'),
    t('intro.paragraph.rated'),
    t('intro.paragraph.free'),
    t('intro.paragraph.maker'),
  ].join(' ')

  return (
    <OnboardingCard
      step={1}
      title={t('intro.title')}
      note={t('intro.note')}
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
