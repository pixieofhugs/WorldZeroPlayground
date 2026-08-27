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
 * paragraph rather than three beats.
 *
 * The six are called out one call site each rather than mapped over a key list,
 * so the catalog stays greppable from here (`SignInOptions` makes the same
 * trade for the same reason).
 *
 * THE SIX ARE NOT THE SIX THEY WERE (#2766). The owner's written pitch lands a
 * different six — character, tasks, levels, what lies ahead — so four keys were
 * RENAMED with it (`realWorld`→`character`, `rated`→`tasks`, `free`→`levels`,
 * `maker`→`ahead`). A key called `free` holding a sentence about levelling is
 * the trap #2598 spent a pass removing from another catalog.
 *
 * VOCABULARY. "Praxis" does not appear on this card, or on any card before
 * auth — the player meets the word once they have one. "Sign up" is not used
 * for account creation either; a Character *signs up for* a task, and that is
 * the only thing it means. Factions are cut entirely: invitation-gated
 * (ADR-0022) and unreachable at level 0, so naming them here sells something
 * the game cannot deliver for a long time — which is why the written copy says
 * "warring organizations" and not the word the guard test forbids.
 *
 * WHAT THE PITCH KNOWINGLY UNDERSTATES, ruled and recorded on #2766 rather than
 * overlooked: voting is NOT level-gated (`services/vote.py::viewer_can_vote`
 * refuses only on self-vote and duel), and the budget starts full, so the
 * levels slot reads as though voting unlocks with level when a new character
 * can already vote. The failure mode is a pleasant surprise, not a broken
 * promise, so the owner's wording stands.
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
