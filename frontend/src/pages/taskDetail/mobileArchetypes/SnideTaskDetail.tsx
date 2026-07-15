import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import { MobileStickyBar, MobileStickyCaption } from './shared'
import type { TaskDetailState } from '../useTaskDetail'

/**
 * S.N.I.D.E. MOBILE task-detail skin (#530) — the job file on a phone. A dark
 * ransom hero (Bebas headline, acid rule, halftone, taped), the brief, the
 * verdict aggregate, the closed cases, and a hot-pink **sticky action bar**
 * ("PULL THIS JOB") pinned above the tab bar. Single-column, no fixed-px grid.
 * Reuses the same {@link TaskDetailState}, the shared mobile sticky bar, and the
 * `snide.*` copy + `--faction-snide-*` tokens as the desktop archetype.
 * Native-dark.
 */

const WALL = 'var(--faction-snide-wall)'
const WALL_TEXT = 'var(--faction-snide-wall-text)'
const INK = 'var(--faction-snide-card-bg)'
const TEXT = 'var(--faction-snide-card-text)'
const MUTED = 'var(--faction-snide-card-muted)'
const ACID = 'var(--faction-snide-card-accent)'
const ACCENT_WALL = 'var(--faction-snide)'
const PINK = 'var(--faction-snide-pink)'
const TAPE = 'var(--faction-snide-tape)'
const LINE = 'var(--faction-snide-border)'
const PAPER = 'var(--faction-snide-paper)'
const COND = 'var(--faction-snide-font-cond)'
const IMPACT = 'var(--faction-snide-font-impact)'
const BLACK = 'var(--faction-snide-font-black)'
const TYPE = 'var(--faction-snide-font-type)'
const MARKER = 'var(--faction-snide-font-marker)'

const CARD_SHADOW = '5px 6px 0 rgba(0,0,0,.5)'

const kicker: CSSProperties = {
  fontFamily: TYPE,
  fontSize: 8,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: MUTED,
}

function SectionHead({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <h2 style={{ fontFamily: COND, fontSize: 16, letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0, color: ACID, whiteSpace: 'nowrap' }}>
        {title}
      </h2>
      <span style={{ flex: 1, height: 1, background: LINE }} />
      {trailing}
    </div>
  )
}

function plate(background: string, textColor: string, label: string) {
  return (
    <span style={{ fontFamily: IMPACT, fontSize: 13, letterSpacing: '0.02em', color: textColor, background, padding: '4px 12px' }}>
      {label}
    </span>
  )
}

export default function SnideTaskDetail({ state }: { state: TaskDetailState }) {
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
    <div className="py-4" style={{ fontFamily: TYPE, color: WALL_TEXT, background: WALL, marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
      {/* Breadcrumb */}
      <nav className="mb-3" style={{ fontFamily: TYPE, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}>
        <Link to="/tasks" style={{ color: ACCENT_WALL, textDecoration: 'none' }}>
          {t('default.breadcrumb')}
        </Link>
        <span aria-hidden style={{ margin: '0 6px', color: ACCENT_WALL }}>›</span>
        <span style={{ color: MUTED }}>{task.title}</span>
      </nav>

      {/* Hero — dark ransom file */}
      <div style={{ position: 'relative', background: INK, color: TEXT, border: `1px solid ${LINE}`, boxShadow: CARD_SHADOW, padding: '20px 22px 22px', marginBottom: 20, transform: 'rotate(-0.8deg)', overflow: 'hidden' }}>
        <span aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(rgba(182,255,46,0.08) 32%, transparent 34%)', backgroundSize: '5px 5px' }} />
        <span aria-hidden style={{ position: 'absolute', top: -11, left: 28, width: 66, height: 24, background: TAPE, transform: 'rotate(-5deg)', opacity: 0.92 }} />
        <div style={{ position: 'relative' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: COND, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: ACID }}>
              {t('snide.jobFile')}
            </span>
            <span style={kicker}>{t('snide.openCase')}</span>
          </div>

          <h1 style={{ fontFamily: COND, fontSize: 34, letterSpacing: '0.02em', lineHeight: 1.02, color: TEXT, margin: 0, overflowWrap: 'anywhere' }}>
            {task.title}
          </h1>
          <div style={{ height: 2, margin: '14px 0', background: ACID }} />

          <div className="flex items-center gap-2 flex-wrap">
            {plate('rgba(255,255,255,0.06)', TEXT, t('snide.evidence.levelValue', { level: task.level_required }))}
            {plate(ACID, INK, t('mobile.points', { points: modifiedPoints }))}
          </div>
        </div>
      </div>

      {/* The brief */}
      <section style={{ marginBottom: 20 }}>
        <SectionHead title={t('snide.brief')} />
        <div style={{ background: INK, color: TEXT, border: `1px solid ${LINE}`, padding: '18px 20px' }}>
          <p style={{ fontFamily: TYPE, fontSize: 14, lineHeight: 1.7, color: task.description ? TEXT : MUTED, margin: 0, whiteSpace: 'pre-wrap' }}>
            {task.description || t('snide.briefEmpty')}
          </p>
        </div>
      </section>

      {/* The verdict — read-only aggregate */}
      <section style={{ marginBottom: 20 }}>
        <SectionHead title={t('snide.mobile.verdictHeading')} />
        {voteCount > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <span style={{ fontFamily: IMPACT, fontSize: 44, lineHeight: 0.85, color: ACID }}>
              {topScore}
            </span>
            <div style={{ paddingBottom: 5 }}>
              <div style={{ fontFamily: COND, fontSize: 14, letterSpacing: '0.06em', textTransform: 'uppercase', color: WALL_TEXT }}>
                {t('snide.topMarks')}
              </div>
              <div style={{ ...kicker, marginTop: 2 }}>{t('snide.casesClosed', { count: voteCount })}</div>
            </div>
          </div>
        ) : (
          <p style={{ fontFamily: MARKER, fontSize: 14, color: MUTED, margin: 0, transform: 'rotate(-1deg)' }}>{t('snide.verdict.none')}</p>
        )}
      </section>

      {/* Closed cases (completions) */}
      <section>
        <SectionHead
          title={t('snide.mobile.casesHeading')}
          trailing={
            <div style={{ display: 'flex' }}>
              {(['score', 'recent'] as const).map((sort) => {
                const on = submissionSort === sort
                return (
                  <button
                    key={sort}
                    onClick={() => setSubmissionSort(sort)}
                    style={{
                      fontFamily: TYPE,
                      fontSize: 8,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      padding: '5px 10px',
                      background: on ? ACID : 'transparent',
                      color: on ? INK : MUTED,
                      border: `1px solid ${on ? ACID : LINE}`,
                      cursor: 'pointer',
                    }}
                  >
                    {sort === 'score' ? t('snide.sort.topMarks') : t('snide.sort.recent')}
                  </button>
                )
              })}
            </div>
          }
        />
        {sortedSubmissions.length === 0 ? (
          <p style={{ fontFamily: MARKER, fontSize: 14, color: MUTED, margin: 0, transform: 'rotate(-1deg)' }}>{t('snide.empty')}</p>
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
                        transform: 'translateX(-50%) rotate(-2deg)',
                        zIndex: 3,
                        whiteSpace: 'nowrap',
                        background: PINK,
                        color: PAPER,
                        fontFamily: BLACK,
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        padding: '2px 12px',
                        boxShadow: '2px 3px 0 rgba(0,0,0,.4)',
                      }}
                    >
                      {t('snide.topMarks')}
                    </div>
                  )}
                  <PraxisCard praxis={s} />
                </div>
              ))}
            </div>
            {submissions.length > 4 && (
              <div style={{ marginTop: 16 }}>
                <Link to={`/praxes?task_id=${task.id}`} style={{ fontFamily: COND, fontSize: 15, letterSpacing: '0.04em', color: ACCENT_WALL, textDecoration: 'none' }}>
                  {t('snide.viewAll', { count: submissions.length })}
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
            <div style={{ fontFamily: TYPE, fontSize: 12, color: 'var(--color-danger)', padding: '8px 12px', background: 'var(--faction-snide-light)', border: `1px solid ${LINE}` }}>
              {signupError}
            </div>
          )}
          <button
            onClick={handleSignup}
            style={{
              width: '100%',
              background: PINK,
              color: PAPER,
              fontFamily: BLACK,
              fontSize: 14,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '14px 20px',
              border: 'none',
              boxShadow: '2px 3px 0 rgba(0,0,0,.4)',
              cursor: 'pointer',
            }}
          >
            {t('snide.signup.cta')}
          </button>
          <MobileStickyCaption color={MUTED}>
            {t('snide.signup.meta', { open: slotsOpen, max: maxTaskSlots, level: task.level_required, points: modifiedPoints })}
          </MobileStickyCaption>
        </MobileStickyBar>
      )}

      {mySubmission && (
        <MobileStickyBar style={{ flexDirection: 'row', alignItems: 'center' }}>
          <span style={{ fontFamily: COND, fontSize: 15, letterSpacing: '0.03em', color: ACID, flex: 1 }}>
            {t('snide.submitted.note')}
          </span>
          <Link
            to={`/praxes/${mySubmission.id}/edit`}
            style={{ fontFamily: BLACK, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '10px 18px', background: ACID, color: INK, textDecoration: 'none' }}
          >
            {t('snide.submitted.edit')}
          </Link>
        </MobileStickyBar>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <MobileStickyBar style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleDrop}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: TYPE, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}
          >
            {t('snide.inProgress.drop')}
          </button>
          <Link
            to={`/praxes/${inProgressPraxisId}/edit`}
            style={{ marginLeft: 'auto', fontFamily: BLACK, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '12px 20px', background: PINK, color: PAPER, textDecoration: 'none' }}
          >
            {t('snide.inProgress.continue')}
          </Link>
        </MobileStickyBar>
      )}
    </div>
  )
}
