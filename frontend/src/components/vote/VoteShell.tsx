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

export interface VoteSummaryTheme {
  muted: string
  accent: string
  accentFont: string
  avgFontSize: number
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
        <p className="font-body" style={{ fontSize: 8, color: theme.muted, margin: '8px 0 0' }}>
          {t('chrome.voted', { stars: selected })}
        </p>
      )}

      {points != null && (
        <p
          className="font-body"
          style={{
            fontSize: 10,
            color: theme.muted,
            margin: '11px 0 0',
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
                <b
                  style={{
                    color: theme.accent,
                    fontFamily: theme.accentFont,
                    fontSize: theme.avgFontSize,
                  }}
                />
              ),
            }}
          />
        </p>
      )}

      {error && (
        <p className="font-body" style={{ fontSize: 9, color: theme.errorColor, marginTop: 4 }}>
          {error}
        </p>
      )}
    </>
  )
}
