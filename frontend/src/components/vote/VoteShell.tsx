import { Trans, useTranslation } from 'react-i18next'

/**
 * Shared chrome for per-faction vote UIs. The 1-5 control itself is faction-
 * specific (ink stamps, hearts, …), but the logged-out gate and the
 * points/"voted"/error summary are identical in structure — only their theme
 * colors differ. These two helpers keep that chrome in one place. Copy lives
 * in the votes:chrome catalog branch (ADR-0032).
 */

/** Logged-out gate shown in place of the vote control. */
export function VoteLoginGate() {
  const { t } = useTranslation('votes')
  return <p className="eyebrow">{t('chrome.loginGate')}</p>
}

/**
 * A skin carries font, colour and letter-spacing — never a size. The shared
 * chrome owns every size here, off the `--text-*` scale (WORLD_ZERO_STYLE §4a:
 * "if a skin is setting a size, the size has escaped the scale").
 */
export interface VoteSummaryTheme {
  muted: string
  accent: string
  accentFont: string
  errorColor: string
  avgLetterSpacing?: string
}

/** "Voted N pts", the votes/points display, and the error line — themeable. */
export function VoteSummary({
  selected,
  points,
  totalVotes,
  error,
  theme,
}: {
  selected: number
  points?: number | null
  totalVotes?: number
  error: string
  theme: VoteSummaryTheme
}) {
  const { t } = useTranslation('votes')

  return (
    <>
      {selected > 0 && (
        <p className="font-body" style={{ fontSize: 'var(--text-content)', color: theme.muted, margin: 'var(--space-sm) 0 0' }}>
          {t('chrome.voted', { stars: selected })}
        </p>
      )}

      {points != null && (
        <p
          className="font-body"
          style={{
            fontSize: 'var(--text-content)',
            color: theme.muted,
            margin: 'var(--space-md) 0 0',
            letterSpacing: theme.avgLetterSpacing,
          }}
        >
          <Trans
            t={t}
            i18nKey="chrome.tally"
            count={totalVotes ?? 0}
            values={{ points }}
            components={{
              1: (
                // The points figure is emphasis inside a running sentence, so it
                // inherits the paragraph's --text-content (18px) rather than
                // carrying a size of its own. The skin's contribution is the
                // accent colour and face; weight comes from <b>.
                <b
                  style={{
                    color: theme.accent,
                    fontFamily: theme.accentFont,
                  }}
                />
              ),
            }}
          />
        </p>
      )}

      {error && (
        <p className="font-body" style={{ fontSize: 'var(--text-content)', color: theme.errorColor, marginTop: 'var(--space-xs)' }}>
          {error}
        </p>
      )}
    </>
  )
}
