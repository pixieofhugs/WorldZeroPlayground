import { useTranslation } from 'react-i18next'

/**
 * The *start here* mark (#1861, `docs/spec/SPEC-onboarding.md` § The hand-off).
 *
 * Mounted behind the server's `task.start_here`; tests no level, faction or
 * title here. Mounted by the dispatchers (`TaskCard`, `TaskDetail`), not the skins.
 * Takes na's card ink filled — the sheet's rainbow budget is spent.
 *
 * ponytail: na's ink hardcoded, since only the `na` onboarding task carries it;
 * upgrade is a `slug` prop through `factionCssVar`.
 *
 * `mark.label` is sentence case; this surface uppercases it (#2766).
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
