import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import { EphemeristsSigil, LapisLastWord } from '../../../components/cards/ephemeristsAtoms'
import { MobileStickyBar, MobileStickyCaption } from './shared'
import type { TaskDetailState } from '../useTaskDetail'

/**
 * The Ephemerists MOBILE task-detail skin (#527) — the survey commission on a
 * phone. A ledger-ruled vellum hero (Cinzel running-head, a title with one word
 * pulled to lapis, grade + puncta, the commission brief), the sealed ephemerides
 * (completions), and a stamped **sticky action bar** ("Triangulate the truth")
 * pinned above the tab bar. Single-column, no fixed-px grid — the desktop
 * discordant-map plate would overflow a phone. Reuses the same
 * {@link TaskDetailState}, the shared mobile sticky bar, and the `ephemerists.*`
 * copy + `--eph-*` tokens as the desktop archetype. Theme-aware via the cascade.
 */

const VELLUM = 'var(--eph-vellum)'
const VELLUM_DEEP = 'var(--eph-vellum-deep)'
const TEXT = 'var(--eph-vellum-text)'
const MUTED = 'var(--eph-muted)'
const RUBRIC = 'var(--eph-rubric)'
const LAPIS = 'var(--eph-lapis)'
const INK = 'var(--eph-ink)'
const GOLD = 'var(--eph-gold)'
const GOLD_DEEP = 'var(--eph-gold-deep)'
const GOLD_LIGHT = 'var(--eph-gold-light)'
const PARCHMENT = 'var(--eph-parchment)'
const DISPLAY = 'var(--eph-display)'
const SERIF = 'var(--eph-serif)'
const SCRIPT = 'var(--eph-script)'

function SectionHead({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <h2 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 14, letterSpacing: '0.08em', margin: 0, color: TEXT, whiteSpace: 'nowrap' }}>
        {title}
      </h2>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
      {trailing}
    </div>
  )
}

export default function EphemeristsTaskDetail({ state }: { state: TaskDetailState }) {
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
    <div className="py-4" style={{ fontFamily: SERIF, color: TEXT, background: VELLUM_DEEP, marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
      {/* Breadcrumb */}
      <nav className="mb-3" style={{ fontFamily: DISPLAY, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}>
        <Link to="/tasks" style={{ color: LAPIS, textDecoration: 'none' }}>
          {t('ephemerists.breadcrumb')}
        </Link>
        <span aria-hidden style={{ margin: '0 6px', color: GOLD }}>›</span>
        <span style={{ color: RUBRIC }}>{task.title}</span>
      </nav>

      {/* Hero — ledger-ruled vellum commission */}
      <div style={{ position: 'relative', overflow: 'hidden', background: VELLUM, border: `1.5px solid ${INK}`, boxShadow: '0 12px 28px rgba(42,29,18,0.18)', padding: '20px 22px 22px', marginBottom: 20 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: DISPLAY, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase', color: GOLD }}>
            <EphemeristsSigil size={12} color={GOLD} />
            {t('ephemerists.masthead')}
          </span>
          <span style={{ fontFamily: SCRIPT, fontStyle: 'italic', fontSize: 12, color: MUTED }}>{t('ephemerists.statusOpen')}</span>
        </div>

        <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 32, lineHeight: 1.04, color: TEXT, margin: 0, overflowWrap: 'anywhere' }}>
          <LapisLastWord text={task.title} footnote />
        </h1>
        <div style={{ height: 1, margin: '14px 0', background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />

        <div className="flex items-center gap-3 flex-wrap">
          <span style={{ fontFamily: DISPLAY, fontSize: 12, color: TEXT, background: VELLUM_DEEP, border: `1px solid ${GOLD}`, padding: '4px 12px' }}>
            {t('ephemerists.grade', { level: task.level_required })}
          </span>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, color: RUBRIC }}>
            {modifiedPoints} <span style={{ fontSize: 11, letterSpacing: '0.06em' }}>{t('ephemerists.puncta')}</span>
          </span>
        </div>
      </div>

      {/* The Commission — brief */}
      <section style={{ marginBottom: 20 }}>
        <SectionHead title={t('ephemerists.commissionHeading')} />
        <div style={{ background: VELLUM, border: `1px solid ${GOLD_DEEP}`, padding: '18px 20px' }}>
          <p style={{ fontFamily: SERIF, fontSize: 15, lineHeight: 1.7, color: task.description ? TEXT : MUTED, margin: 0, whiteSpace: 'pre-wrap' }}>
            {task.description || t('ephemerists.commissionEmpty')}
          </p>
        </div>
      </section>

      {/* The Credence — read-only aggregate */}
      <section style={{ marginBottom: 20 }}>
        <SectionHead title={t('ephemerists.credenceHeading')} />
        {voteCount > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 44, lineHeight: 0.85, color: RUBRIC }}>
              {topScore}
            </span>
            <div style={{ paddingBottom: 5 }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 12, letterSpacing: '0.06em', color: TEXT }}>
                {t('ephemerists.credence.highest')}
              </div>
              <div style={{ fontFamily: SCRIPT, fontStyle: 'italic', fontSize: 13, color: MUTED, marginTop: 2 }}>
                {t('ephemerists.credence.weighed', { count: voteCount })}
              </div>
            </div>
          </div>
        ) : (
          <p style={{ fontFamily: SCRIPT, fontStyle: 'italic', fontSize: 15, color: MUTED, margin: 0 }}>{t('ephemerists.credence.none')}</p>
        )}
      </section>

      {/* Sealed ephemerides (completions) */}
      <section>
        <SectionHead
          title={t('ephemerists.ephemeridesHeading')}
          trailing={
            <div style={{ display: 'flex' }}>
              {(['score', 'recent'] as const).map((sort) => {
                const on = submissionSort === sort
                return (
                  <button
                    key={sort}
                    onClick={() => setSubmissionSort(sort)}
                    style={{
                      fontFamily: DISPLAY,
                      fontSize: 8,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      padding: '5px 10px',
                      background: on ? INK : 'transparent',
                      color: on ? GOLD_LIGHT : MUTED,
                      border: `1px solid ${on ? INK : GOLD_DEEP}`,
                      cursor: 'pointer',
                    }}
                  >
                    {sort === 'score' ? t('ephemerists.sort.mostCanonical') : t('ephemerists.sort.recent')}
                  </button>
                )
              })}
            </div>
          }
        />
        {sortedSubmissions.length === 0 ? (
          <p style={{ fontFamily: SCRIPT, fontStyle: 'italic', fontSize: 15, color: MUTED, margin: 0 }}>{t('ephemerists.empty')}</p>
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        whiteSpace: 'nowrap',
                        background: INK,
                        color: GOLD_LIGHT,
                        fontFamily: DISPLAY,
                        fontSize: 9,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        padding: '3px 12px',
                        boxShadow: '0 3px 8px rgba(42,29,18,0.35)',
                      }}
                    >
                      <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>⚜</span>
                      {t('ephemerists.mostCanonical')}
                    </div>
                  )}
                  <PraxisCard praxis={s} />
                </div>
              ))}
            </div>
            {submissions.length > 4 && (
              <div style={{ marginTop: 16 }}>
                <Link to={`/praxes?task_id=${task.id}`} style={{ fontFamily: SCRIPT, fontStyle: 'italic', fontSize: 15, color: RUBRIC, textDecoration: 'none' }}>
                  {t('ephemerists.viewAll', { count: submissions.length })}
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
            <div style={{ fontFamily: SERIF, fontSize: 12, color: 'var(--color-danger)', padding: '8px 12px', background: 'var(--faction-ephemerists-light)', border: `1px solid ${GOLD_DEEP}` }}>
              {signupError}
            </div>
          )}
          <button
            onClick={handleSignup}
            style={{
              width: '100%',
              background: INK,
              color: PARCHMENT,
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontSize: 15,
              letterSpacing: '0.06em',
              padding: '14px 20px',
              border: `1px solid ${GOLD}`,
              cursor: 'pointer',
            }}
          >
            {t('ephemerists.signup.cta', { points: modifiedPoints })}
          </button>
          <MobileStickyCaption color={MUTED}>
            {t('ephemerists.signup.meta', { open: slotsOpen, max: maxTaskSlots, level: task.level_required })}
          </MobileStickyCaption>
        </MobileStickyBar>
      )}

      {mySubmission && (
        <MobileStickyBar style={{ flexDirection: 'row', alignItems: 'center' }}>
          <span style={{ fontFamily: SCRIPT, fontStyle: 'italic', fontSize: 15, color: RUBRIC, flex: 1 }}>
            {t('ephemerists.submitted.text')}
          </span>
          <Link
            to={`/praxes/${mySubmission.id}/edit`}
            style={{ fontFamily: DISPLAY, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 18px', background: LAPIS, color: PARCHMENT, textDecoration: 'none' }}
          >
            {t('ephemerists.submitted.edit')}
          </Link>
        </MobileStickyBar>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <MobileStickyBar style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleDrop}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: SCRIPT, fontStyle: 'italic', fontSize: 14, color: RUBRIC }}
          >
            {t('ephemerists.inProgress.drop')}
          </button>
          <Link
            to={`/praxes/${inProgressPraxisId}/edit`}
            style={{ marginLeft: 'auto', fontFamily: DISPLAY, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 20px', background: INK, color: PARCHMENT, textDecoration: 'none' }}
          >
            {t('ephemerists.inProgress.continue')}
          </Link>
        </MobileStickyBar>
      )}
    </div>
  )
}
