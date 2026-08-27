import { useTranslation } from 'react-i18next'

/**
 * The *start here* mark (#1861, `docs/spec/SPEC-onboarding.md` § The hand-off).
 *
 * THE TASK MARKS ITSELF. This draws nothing on its own judgement: it is mounted
 * behind `task.start_here`, a field the server derives from the viewing
 * character's own praxis history (`services.task.start_here_for_viewer`) and
 * which is true only on the one game-wide onboarding task, only for a character
 * who has never completed it — ever, not "not this era". Nothing here may test
 * a level, a faction or a title; the surfaces stay new-player-unaware, which is
 * the whole reason marking the surfaces instead was rejected.
 *
 * ONE COMPONENT, EVERY SURFACE. The spec says the signal appears *wherever the
 * task appears*, so it is mounted by the two dispatchers — `TaskCard` and
 * `TaskDetail` — rather than by the nine faction skins behind them. A mark
 * added per skin is nine chances to disagree, and eight of them are unreachable
 * anyway: the onboarding task's `primary_faction_slug` is the cross-faction
 * sentinel (`na`), so it always draws through the Default skin.
 *
 * THE NA KIT, AND NOT A FOURTH RAINBOW. It sits on the spectrum sheet, whose
 * rainbow budget is exactly three places and already spent (the border band,
 * the conic ring, the tick) — so the mark takes na's card ink *filled*, the
 * same treatment `OnboardingCard`'s primary control takes and for the same
 * reason: a single rainbow stop used alone reads as a single-hue accent, which
 * is precisely what `na` is not. Courier Prime, uppercase, colour only through
 * `--faction-default-*` tokens so both themes come from the
 * `[data-theme="dark"]` cascade.
 *
 * ponytail: the ink is na's, hardcoded rather than `factionCssVar(slug, …)`,
 * because the only task that can carry this mark is `na` by construction
 * (`seed.ONBOARDING_TASK_FACTION_SLUG`). If a second, faction-owned task ever
 * earns the mark it would wear na's ink over that faction's skin; the upgrade
 * is a `slug` prop through `factionCssVar`, and it is not worth a prop today.
 *
 * THE MARK SHOUTS, THE CATALOG DOES NOT (#2766). `mark.label` is stored as
 * `Start here` and this surface uppercases it, so the player reads START HERE.
 * The stored casing is therefore the sentence-case one; the home page's
 * `home:hero.cta.loggedOut` says `Start Here` because THAT button does not
 * uppercase and its Title Case is its own. Same phrase deliberately — the
 * promise made on the marketing page is repeated where it pays off — and the
 * two differ in the catalog only because one of the two surfaces shouts.
 */
export default function StartHereMark() {
  const { t } = useTranslation('onboarding')

  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-md)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        padding: 'var(--space-xs) var(--space-sm)',
        borderRadius: 5,
        background: 'var(--faction-default-card-accent)',
        color: 'var(--faction-default-on-accent)',
        whiteSpace: 'nowrap',
      }}
    >
      {t('mark.label')}
    </span>
  )
}
