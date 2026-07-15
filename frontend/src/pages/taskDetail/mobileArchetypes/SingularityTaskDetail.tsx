import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import { MobileStickyBar, MobileStickyCaption } from './shared'
import type { TaskDetailState } from '../useTaskDetail'

/**
 * Singularity MOBILE task-detail skin (#526) — an open function on a phone. A
 * bracketed readout hero (prompt eyebrow, `>`-prefixed title, a CLASS line with
 * level + credits), the function brief, the consensus signal, the signaled
 * praxis, and a prompt-styled **sticky action bar** ("> JOIN ARRAY") pinned above
 * the tab bar. Single-column, no fixed-px grid. Reuses the same
 * {@link TaskDetailState}, the shared mobile sticky bar, and the `singularity.*`
 * copy + --faction-singularity-* tokens as the desktop archetype.
 *
 * Always-dark: every colour resolves to a theme-identical --faction-singularity-*
 * token; the skin paints its own void field and never mutates data-theme.
 */

const VOID = 'var(--faction-singularity-card-bg)'
const PHOSPHOR = 'var(--faction-singularity-card-accent)'
const SIGNAL = 'var(--faction-singularity-card-muted)'
const BORDER_HARD = 'var(--faction-singularity-border-hard)'
const FONT = 'var(--font-faction-terminal)'

const phosphor = (pct: number): string => `color-mix(in srgb, ${PHOSPHOR} ${pct}%, transparent)`
const signal = (pct: number): string => `color-mix(in srgb, ${SIGNAL} ${pct}%, transparent)`

const kicker: CSSProperties = {
  fontFamily: FONT,
  fontSize: 8,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: signal(60),
}

function SectionHead({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <h2 style={{ fontFamily: FONT, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0, color: PHOSPHOR, whiteSpace: 'nowrap' }}>
        {title}
      </h2>
      <span style={{ flex: 1, height: 1, background: signal(30) }} />
      {trailing}
    </div>
  )
}

export default function SingularityTaskDetail({ state }: { state: TaskDetailState }) {
  const { t } = useTranslation('tasks')
  const {
    task,
    submissions,
    mySubmission,
    isInProgress,
    inProgressPraxisId,
    canSignUp,
    slotsOpen,
    maxTaskSlots,
    modifiedPoints,
    topScore,
    voteCount,
    sortedSubmissions,
    submissionSort,
    setSubmissionSort,
    signupError,
    handleSignup,
    handleDrop,
  } = state

  if (!task) return null

  const topId = submissions.length
    ? submissions.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a)).id
    : null

  return (
    <div className="py-4" style={{ fontFamily: FONT, color: PHOSPHOR, background: VOID, marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
      {/* Breadcrumb */}
      <nav className="mb-3" style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: signal(55) }}>
        <Link to="/tasks" style={{ color: PHOSPHOR, textDecoration: 'none' }}>
          {t('default.breadcrumb')}
        </Link>
        <span aria-hidden style={{ margin: '0 6px', color: SIGNAL }}>/</span>
        <span style={{ color: phosphor(60) }}>{task.title}</span>
      </nav>

      {/* Hero — bracketed readout panel */}
      <div style={{ position: 'relative', overflow: 'hidden', background: VOID, border: `1px solid ${BORDER_HARD}`, padding: '20px 20px 22px', marginBottom: 20 }}>
        {/* Corner brackets */}
        <Bracket pos="tl" />
        <Bracket pos="tr" />
        <Bracket pos="bl" />
        <Bracket pos="br" />
        <div
          aria-hidden
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `repeating-linear-gradient(to bottom, transparent, transparent 2px, ${phosphor(1.2)} 2px, ${phosphor(1.2)} 4px)` }}
        />
        <div style={{ position: 'relative' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <span style={{ ...kicker, color: PHOSPHOR }}>{t('singularity.mobile.detailEyebrow')}</span>
            <span style={kicker}>{t('singularity.statusOpen')}</span>
          </div>

          <h1 style={{ fontFamily: FONT, fontSize: 24, lineHeight: 1.2, color: PHOSPHOR, letterSpacing: '0.02em', margin: 0, overflowWrap: 'anywhere' }}>
            {'> '}
            {task.title}
          </h1>
          <div style={{ height: 1, margin: '14px 0', background: signal(30) }} />
          <div style={{ fontFamily: FONT, fontSize: 11, letterSpacing: '0.06em', color: signal(70) }}>
            {t('singularity.class', { level: task.level_required, points: modifiedPoints })}
          </div>
        </div>
      </div>

      {/* The function — brief */}
      <section style={{ marginBottom: 20 }}>
        <SectionHead title={t('singularity.mobile.briefHeading')} />
        <div style={{ background: VOID, border: `1px solid ${signal(38)}`, padding: '16px 18px' }}>
          <p style={{ fontFamily: FONT, fontSize: 12, lineHeight: 1.7, color: task.description ? phosphor(72) : phosphor(45), margin: 0, whiteSpace: 'pre-wrap' }}>
            {task.description || t('singularity.observationEmpty')}
          </p>
        </div>
      </section>

      {/* The consensus — read-only aggregate */}
      <section style={{ marginBottom: 20 }}>
        <SectionHead title={t('singularity.consensusHeading')} />
        {voteCount > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <span style={{ fontFamily: FONT, fontSize: 40, lineHeight: 0.85, color: PHOSPHOR }}>
              {topScore}
            </span>
            <div style={{ paddingBottom: 5 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: SIGNAL }}>
                {t('singularity.consensus.peakSignal')}
              </div>
              <div style={{ ...kicker, marginTop: 2 }}>{t('singularity.consensus.sealed', { count: voteCount })}</div>
            </div>
          </div>
        ) : (
          <p style={{ fontFamily: FONT, fontSize: 12, color: phosphor(50), margin: 0 }}>{t('singularity.consensus.none')}</p>
        )}
      </section>

      {/* Signaled praxis (completions) */}
      <section>
        <SectionHead
          title={t('singularity.mobile.worksHeading')}
          trailing={
            <div style={{ display: 'flex' }}>
              {(['score', 'recent'] as const).map((sort) => {
                const on = submissionSort === sort
                return (
                  <button
                    key={sort}
                    onClick={() => setSubmissionSort(sort)}
                    style={{
                      fontFamily: FONT,
                      fontSize: 8,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      padding: '5px 10px',
                      background: on ? PHOSPHOR : 'transparent',
                      color: on ? VOID : signal(60),
                      border: `1px solid ${on ? PHOSPHOR : signal(35)}`,
                      cursor: 'pointer',
                    }}
                  >
                    {sort === 'score' ? t('singularity.sort.highestSignal') : t('singularity.sort.recent')}
                  </button>
                )
              })}
            </div>
          }
        />
        {sortedSubmissions.length === 0 ? (
          <p style={{ fontFamily: FONT, fontSize: 12, color: phosphor(50), margin: 0 }}>{t('singularity.empty')}</p>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {sortedSubmissions.slice(0, 4).map((s) => (
                <div key={s.id} style={{ position: 'relative', paddingTop: s.id === topId ? 16 : 0 }}>
                  {s.id === topId && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 3,
                        whiteSpace: 'nowrap',
                        background: PHOSPHOR,
                        color: VOID,
                        fontFamily: FONT,
                        fontSize: 9,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '2px 12px',
                        boxShadow: `0 0 12px ${phosphor(40)}`,
                      }}
                    >
                      {t('singularity.highestSignal')}
                    </div>
                  )}
                  <PraxisCard praxis={s} />
                </div>
              ))}
            </div>
            {submissions.length > 4 && (
              <div style={{ marginTop: 16 }}>
                <Link to={`/praxes?task_id=${task.id}`} style={{ fontFamily: FONT, fontSize: 11, letterSpacing: '0.06em', color: SIGNAL, textDecoration: 'none' }}>
                  {t('singularity.viewAll', { count: submissions.length })}
                </Link>
              </div>
            )}
          </>
        )}
      </section>

      {/* Sticky action bar */}
      {canSignUp && (
        <MobileStickyBar>
          {signupError && (
            <div style={{ fontFamily: FONT, fontSize: 12, color: 'var(--color-danger)', padding: '8px 12px', background: signal(10), border: `1px solid ${signal(40)}` }}>
              {signupError}
            </div>
          )}
          <button
            onClick={handleSignup}
            style={{
              width: '100%',
              background: PHOSPHOR,
              color: VOID,
              fontFamily: FONT,
              fontSize: 14,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '14px 20px',
              border: 'none',
              boxShadow: `0 0 16px ${phosphor(35)}`,
              cursor: 'pointer',
            }}
          >
            {t('singularity.signup.cta', { points: modifiedPoints })}
          </button>
          <MobileStickyCaption color={signal(60)}>
            {t('singularity.signup.note', { open: slotsOpen, max: maxTaskSlots })}
          </MobileStickyCaption>
        </MobileStickyBar>
      )}

      {mySubmission && (
        <MobileStickyBar style={{ flexDirection: 'row', alignItems: 'center' }}>
          <span style={{ fontFamily: FONT, fontSize: 12, color: PHOSPHOR, flex: 1 }}>
            {t('singularity.submitted.note')}
          </span>
          <Link
            to={`/praxes/${mySubmission.id}/edit`}
            style={{ fontFamily: FONT, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 18px', background: VOID, color: PHOSPHOR, border: `1px solid ${PHOSPHOR}`, textDecoration: 'none' }}
          >
            {t('singularity.submitted.edit')}
          </Link>
        </MobileStickyBar>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <MobileStickyBar style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleDrop}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: signal(55) }}
          >
            {t('singularity.inProgress.drop')}
          </button>
          <Link
            to={`/praxes/${inProgressPraxisId}/edit`}
            style={{ marginLeft: 'auto', fontFamily: FONT, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 20px', background: PHOSPHOR, color: VOID, textDecoration: 'none' }}
          >
            {t('singularity.inProgress.continue')}
          </Link>
        </MobileStickyBar>
      )}
    </div>
  )
}

/** One corner bracket of the terminal readout frame. */
function Bracket({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base: CSSProperties = { position: 'absolute', width: 10, height: 10, pointerEvents: 'none' }
  const top = pos[0] === 't'
  const left = pos[1] === 'l'
  return (
    <span
      aria-hidden
      style={{
        ...base,
        top: top ? 3 : undefined,
        bottom: top ? undefined : 3,
        left: left ? 3 : undefined,
        right: left ? undefined : 3,
        borderTop: top ? `1px solid ${PHOSPHOR}` : undefined,
        borderBottom: top ? undefined : `1px solid ${PHOSPHOR}`,
        borderLeft: left ? `1px solid ${PHOSPHOR}` : undefined,
        borderRight: left ? undefined : `1px solid ${PHOSPHOR}`,
      }}
    />
  )
}
