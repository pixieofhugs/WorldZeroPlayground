import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import AlbescentSigil from '../../../components/cards/AlbescentSigil'
import { MobileStickyBar, MobileStickyCaption } from './shared'
import type { TaskDetailState } from '../useTaskDetail'

/**
 * Albescent MOBILE task-detail skin (#528) — the correspondence on a phone. A
 * plain cotton sheet holds the surveyor's Mark, a Cormorant-italic title, and
 * the standing/worth/returned plates; "The Ask" carries the brief and "Inscribed
 * in the Register" the wall of returned accounts (the finest is most-witnessed).
 * To take a task is to "Acknowledge" it, via a stamped sticky action bar pinned
 * above the tab bar. Single-column, no fixed-px grid. Reuses the same
 * {@link TaskDetailState}, the shared mobile sticky bar, and the `albescent.*`
 * copy + `--faction-albescent-*` tokens as the desktop archetype. Always-light.
 */

const INK = 'var(--faction-albescent-card-text)'
const SHEET = 'var(--faction-albescent-card-bg)'
const PAGE = 'var(--faction-albescent-page)'
const FONT = 'var(--faction-albescent-card-font)'
const MONO = 'var(--faction-albescent-mono)'
/** A near-black ink wash at the given opacity — the whole palette is one hue. */
const ink = (pct: number) => `color-mix(in srgb, ${INK} ${pct}%, transparent)`

const kicker: CSSProperties = {
  fontFamily: MONO,
  fontSize: "var(--text-xs)",
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: ink(30),
}

function SectionHead({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <h2 className="content-title" style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 500, margin: 0, color: INK, whiteSpace: 'nowrap' }}>
        {title}
      </h2>
      <span style={{ flex: 1, height: 1, background: ink(8) }} />
      {trailing}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ ...kicker, marginBottom: 5 }}>{label}</div>
      <div className="content-title" style={{ fontFamily: FONT, fontStyle: 'italic', color: INK }}>{value}</div>
    </div>
  )
}

export default function AlbescentTaskDetail({ state }: { state: TaskDetailState }) {
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
    sortedSubmissions,
    submissionSort,
    setSubmissionSort,
    signupError,
    handleSignup,
    handleDrop,
  } = state

  if (!task) return null

  const correspondenceNo = String(task.id).padStart(4, '0')
  const topId = submissions.length
    ? submissions.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a)).id
    : null

  return (
    <div className="py-4" style={{ fontFamily: MONO, color: INK, background: PAGE, marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
      {/* Breadcrumb */}
      <nav className="mb-3" style={{ fontFamily: MONO, fontSize: "var(--text-sm)", letterSpacing: '0.14em', textTransform: 'uppercase', color: ink(38) }}>
        <Link to="/tasks" style={{ color: 'inherit', textDecoration: 'none' }}>
          {t('default.breadcrumb')}
        </Link>
        <span aria-hidden style={{ margin: '0 6px', opacity: 0.5 }}>/</span>
        <span style={{ color: ink(60) }}>{task.title}</span>
      </nav>

      {/* Hero — cotton sheet, centred */}
      <div
        style={{
          background: SHEET,
          border: `1px solid ${ink(10)}`,
          boxShadow: '0 2px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          padding: '34px 26px 30px',
          textAlign: 'center',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <AlbescentSigil size={38} />
        </div>
        <div style={{ ...kicker, letterSpacing: '0.32em', color: ink(45), marginBottom: 6 }}>{t('albescent.faction')}</div>
        <div style={{ ...kicker, letterSpacing: '0.24em', color: ink(30), marginBottom: 20 }}>
          {t('albescent.correspondence', { number: correspondenceNo })}
        </div>
        <div style={{ width: 48, height: 1, background: ink(12), margin: '0 auto 20px' }} />
        <h1 className="content-title" style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.16, color: INK, margin: '0 auto 20px', overflowWrap: 'anywhere' }}>
          {task.title}
        </h1>
        <div style={{ width: 48, height: 1, background: ink(12), margin: '0 auto 22px' }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 26, flexWrap: 'wrap' }}>
          <Stat label={t('albescent.stats.standing')} value={t('albescent.stats.standingValue', { level: task.level_required })} />
          <Stat label={t('albescent.stats.worth')} value={t('albescent.stats.worthValue', { points: modifiedPoints })} />
          <Stat label={t('albescent.stats.returned')} value={`${submissions.length}`} />
        </div>
      </div>

      {/* The Ask — brief */}
      <section style={{ marginBottom: 20 }}>
        <SectionHead
          title={t('albescent.askHeading')}
          trailing={
            <span style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: "var(--text-lg)", color: ink(45), whiteSpace: 'nowrap' }}>
              {t('albescent.askGloss')}
            </span>
          }
        />
        <div style={{ background: SHEET, border: `1px solid ${ink(10)}`, padding: '18px 20px' }}>
          <p className="content-text" style={{ fontFamily: FONT, lineHeight: 1.7, color: task.description ? ink(72) : ink(45), margin: 0, whiteSpace: 'pre-wrap' }}>
            {task.description || t('albescent.askEmpty')}
          </p>
        </div>
      </section>

      {/* Inscribed in the Register — returned accounts */}
      <section>
        <SectionHead
          title={t('albescent.registerHeading')}
          trailing={
            <div style={{ display: 'flex' }}>
              {(['score', 'recent'] as const).map((sort) => {
                const on = submissionSort === sort
                return (
                  <button
                    key={sort}
                    onClick={() => setSubmissionSort(sort)}
                    style={{
                      fontFamily: MONO,
                      fontSize: "var(--text-xs)",
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      padding: '5px 10px',
                      background: on ? INK : 'transparent',
                      color: on ? PAGE : ink(45),
                      border: `1px solid ${on ? INK : ink(14)}`,
                      cursor: 'pointer',
                    }}
                  >
                    {sort === 'score' ? t('albescent.sort.mostWitnessed') : t('albescent.sort.recent')}
                  </button>
                )
              })}
            </div>
          }
        />
        {sortedSubmissions.length === 0 ? (
          <p className="content-text" style={{ fontFamily: FONT, fontStyle: 'italic', color: ink(45), margin: 0 }}>{t('albescent.empty')}</p>
        ) : (
          <>
            <div className="flex flex-col gap-5">
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
                        gap: 6,
                        whiteSpace: 'nowrap',
                        background: INK,
                        color: PAGE,
                        fontFamily: FONT,
                        fontStyle: 'italic',
                        fontSize: "var(--text-lg)",
                        letterSpacing: '0.04em',
                        padding: '2px 12px',
                      }}
                    >
                      <span aria-hidden style={{ fontSize: "var(--text-lg)", lineHeight: 1 }}>⚜</span>
                      {t('albescent.mostWitnessed')}
                    </div>
                  )}
                  <PraxisCard praxis={s} />
                </div>
              ))}
            </div>
            {submissions.length > 4 && (
              <div style={{ marginTop: 16 }}>
                <Link
                  to={`/praxes?task_id=${task.id}`}
                  style={{ fontFamily: MONO, fontSize: "var(--text-base)", letterSpacing: '0.1em', textTransform: 'uppercase', color: ink(55), textDecoration: 'none', borderBottom: `1px solid ${ink(20)}`, paddingBottom: 2 }}
                >
                  {t('albescent.viewAll', { count: submissions.length })}
                </Link>
              </div>
            )}
          </>
        )}
      </section>

      {/* Sticky action bar — Acknowledge */}
      {canSignUp && (
        <MobileStickyBar>
          {signupError && (
            <div style={{ fontFamily: MONO, fontSize: "var(--text-lg)", color: 'var(--color-danger)', padding: '8px 12px', background: ink(3), border: `1px solid ${ink(14)}` }}>
              {signupError}
            </div>
          )}
          <button
            onClick={handleSignup}
            style={{
              width: '100%',
              background: INK,
              color: PAGE,
              fontFamily: MONO,
              fontSize: "var(--text-lg)",
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              padding: '14px 20px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t('albescent.signup.cta', { points: modifiedPoints })}
          </button>
          <MobileStickyCaption color={ink(40)}>
            {t('albescent.signup.meta', { open: slotsOpen, max: maxTaskSlots, level: task.level_required })}
          </MobileStickyCaption>
        </MobileStickyBar>
      )}

      {mySubmission && (
        <MobileStickyBar style={{ flexDirection: 'row', alignItems: 'center' }}>
          <span className="content-text" style={{ fontFamily: FONT, fontStyle: 'italic', color: ink(65), flex: 1 }}>
            {t('albescent.submitted.text')}
          </span>
          <Link
            to={`/praxes/${mySubmission.id}/edit`}
            style={{ fontFamily: MONO, fontSize: "var(--text-sm)", letterSpacing: '0.16em', textTransform: 'uppercase', padding: '10px 18px', background: INK, color: PAGE, textDecoration: 'none' }}
          >
            {t('albescent.submitted.edit')}
          </Link>
        </MobileStickyBar>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <MobileStickyBar style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleDrop}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: "var(--text-sm)", letterSpacing: '0.12em', textTransform: 'uppercase', color: ink(40) }}
          >
            {t('albescent.inProgress.drop')}
          </button>
          <Link
            to={`/praxes/${inProgressPraxisId}/edit`}
            style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: "var(--text-base)", letterSpacing: '0.16em', textTransform: 'uppercase', padding: '12px 20px', background: INK, color: PAGE, textDecoration: 'none' }}
          >
            {t('albescent.inProgress.continue')}
          </Link>
        </MobileStickyBar>
      )}
    </div>
  )
}
