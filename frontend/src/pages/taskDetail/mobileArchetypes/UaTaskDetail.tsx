import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import { toRoman } from '../../../components/cards/ephemeristsAtoms'
import { MobileStickyBar, MobileStickyCaption } from './shared'
import type { TaskDetailState } from '../useTaskDetail'

/**
 * University of Asthmatics MOBILE task-detail skin (#525) — the salon
 * commission on a phone. A gilt-framed parchment hero (engraved masthead, title
 * in Cormorant italic, Anno + points plates, the commission brief), the
 * exhibited works, and a stamped **sticky action bar** ("Submit to the Salon")
 * pinned above the tab bar. Single-column, no fixed-px grid — the desktop
 * salon's wide plate would overflow a phone. Reuses the same
 * {@link TaskDetailState}, the shared mobile sticky bar, and the `ua.*` copy +
 * `--faction-ua-*` tokens as the desktop archetype. Always-light: UA never dims.
 */

const PAPER = 'var(--faction-ua-card-bg)'
const PAPER_WARM = 'var(--ua-paper-warm)'
const WALL = 'var(--ua-wall)'
const INK = 'var(--faction-ua-card-text)'
const ACCENT = 'var(--faction-ua-card-accent)'
const SUB = 'var(--faction-ua-card-muted)'
const MUTED = 'var(--ua-muted)'
const GOLD = 'var(--ua-gold)'
const GOLD_PALE = 'var(--ua-gold-pale)'
const LINE = 'var(--ua-line)'
const GILT = 'var(--ua-gilt)'
const DISPLAY = 'var(--faction-ua-card-font)'
const ENGRAVED = 'var(--font-faction-engraved)'
const MONO = 'var(--font-body)'

const kicker: CSSProperties = {
  fontFamily: MONO,
  fontSize: "var(--text-xs)",
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: MUTED,
}

// "Anno {roman}"; level 0 shows an em-dash (matches the desktop UA convention).
const anno = (level: number) => (level > 0 ? toRoman(level) : '—')

function SectionHead({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: "var(--space-md)", marginBottom: "var(--space-md)" }}>
      <h2 className="content-title" style={{ fontFamily: ENGRAVED, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, color: INK, whiteSpace: 'nowrap' }}>
        {title}
      </h2>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
      {trailing}
    </div>
  )
}

function plate(background: string, textColor: string, border: string, label: string) {
  return (
    <span className="content-title" style={{ fontFamily: ENGRAVED, letterSpacing: '0.04em', color: textColor, background, border: `1px solid ${border}`, padding: "var(--space-xs) var(--space-md)" }}>
      {label}
    </span>
  )
}

export default function UaTaskDetail({ state }: { state: TaskDetailState }) {
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
    <div className="py-4" style={{ fontFamily: MONO, color: INK, background: WALL, marginLeft: -16, marginRight: -16, paddingLeft: "var(--space-lg)", paddingRight: "var(--space-lg)" }}>
      {/* Breadcrumb */}
      <nav className="mb-3" style={{ fontFamily: MONO, fontSize: "var(--text-sm)", letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}>
        <Link to="/tasks" style={{ color: ACCENT, textDecoration: 'none' }}>
          {t('default.breadcrumb')}
        </Link>
        <span aria-hidden style={{ margin: "0 var(--space-sm)", color: GOLD }}>›</span>
        <span style={{ color: SUB }}>{task.title}</span>
      </nav>

      {/* Hero — gilt-framed commission plate */}
      <div style={{ padding: "var(--space-sm)", background: GILT, boxShadow: '0 12px 28px rgba(60,40,10,.2), inset 0 0 0 1px rgba(255,255,255,0.45)', marginBottom: "var(--space-xl)" }}>
        <div style={{ padding: "var(--space-xs)", background: `linear-gradient(135deg, ${GOLD}, ${GOLD_PALE})` }}>
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: PAPER,
              backgroundImage: 'radial-gradient(rgba(60,40,10,.03) 1px, transparent 1px)',
              backgroundSize: '5px 5px',
              border: `1px solid ${LINE}`,
              padding: "var(--space-xl) var(--space-xl) var(--space-xl)",
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-md)" }}>
              <span style={{ fontFamily: ENGRAVED, fontSize: "var(--text-sm)", letterSpacing: '0.13em', textTransform: 'uppercase', color: ACCENT }}>
                {t('ua.masthead')}
              </span>
              <span style={kicker}>{t('ua.statusOpen')}</span>
            </div>

            <h1 className="content-title" style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, lineHeight: 1.05, color: INK, margin: 0, overflowWrap: 'anywhere' }}>
              {task.title}
            </h1>
            <div style={{ height: 1, margin: "var(--space-lg) 0 var(--space-lg)", background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />

            <div className="flex items-center gap-2 flex-wrap">
              {plate(PAPER_WARM, INK, GOLD, `${t('ua.stats.anno')} ${anno(task.level_required)}`)}
              {plate(ACCENT, PAPER_WARM, ACCENT, t('mobile.points', { points: modifiedPoints }))}
            </div>
          </div>
        </div>
      </div>

      {/* The Commission — brief */}
      <section style={{ marginBottom: "var(--space-xl)" }}>
        <SectionHead title={t('ua.commissionHeading')} />
        <div style={{ background: PAPER, border: `1px solid ${LINE}`, padding: "var(--space-lg) var(--space-xl)" }}>
          <p className="content-text" style={{ fontFamily: DISPLAY, fontStyle: 'italic', lineHeight: 1.75, color: task.description ? INK : SUB, margin: 0, whiteSpace: 'pre-wrap' }}>
            {task.description || t('ua.commissionEmpty')}
          </p>
        </div>
      </section>

      {/* The Standing — read-only aggregate */}
      <section style={{ marginBottom: "var(--space-xl)" }}>
        <SectionHead title={t('ua.critiqueHeading')} />
        {voteCount > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: "var(--space-md)" }}>
            <span className="content-title" style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, lineHeight: 0.85, color: ACCENT }}>
              {topScore}
            </span>
            <div style={{ paddingBottom: "var(--space-xs)" }}>
              <div style={{ fontFamily: ENGRAVED, fontSize: "var(--text-lg)", letterSpacing: '0.06em', textTransform: 'uppercase', color: INK }}>
                {t('ua.critique.finest')}
              </div>
              <div style={{ ...kicker, marginTop: "var(--space-xs)" }}>{t('ua.critique.appraised', { count: voteCount })}</div>
            </div>
          </div>
        ) : (
          <p className="content-text" style={{ fontFamily: DISPLAY, fontStyle: 'italic', color: SUB, margin: 0 }}>{t('ua.critique.none')}</p>
        )}
      </section>

      {/* Works exhibited (completions) */}
      <section>
        <SectionHead
          title={t('ua.salonWallHeading')}
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
                      padding: "var(--space-xs) var(--space-md)",
                      background: on ? ACCENT : 'transparent',
                      color: on ? PAPER_WARM : MUTED,
                      border: `1px solid ${on ? ACCENT : LINE}`,
                      cursor: 'pointer',
                    }}
                  >
                    {sort === 'score' ? t('ua.sort.finest') : t('ua.sort.recent')}
                  </button>
                )
              })}
            </div>
          }
        />
        {sortedSubmissions.length === 0 ? (
          <p className="content-text" style={{ fontFamily: DISPLAY, fontStyle: 'italic', color: SUB, margin: 0 }}>{t('ua.empty')}</p>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {sortedSubmissions.slice(0, 4).map((s) => (
                <div key={s.id} style={{ position: 'relative', paddingTop: s.id === topId ? 'var(--space-lg)' : 0 }}>
                  {s.id === topId && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 3,
                        whiteSpace: 'nowrap',
                        background: GOLD,
                        color: PAPER_WARM,
                        fontFamily: ENGRAVED,
                        fontSize: "var(--text-base)",
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: "var(--space-xs) var(--space-md)",
                        boxShadow: '0 3px 8px rgba(60,40,10,0.3)',
                      }}
                    >
                      {t('ua.finestHand')}
                    </div>
                  )}
                  <PraxisCard praxis={s} />
                </div>
              ))}
            </div>
            {submissions.length > 4 && (
              <div style={{ marginTop: "var(--space-lg)" }}>
                <Link to={`/praxes?task_id=${task.id}`} style={{ fontFamily: ENGRAVED, fontSize: "var(--text-lg)", letterSpacing: '0.06em', color: ACCENT, textDecoration: 'none' }}>
                  {t('ua.viewAll', { count: submissions.length })}
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
            <div style={{ fontFamily: MONO, fontSize: "var(--text-lg)", color: 'var(--color-danger)', padding: "var(--space-sm) var(--space-md)", background: 'var(--faction-ua-light)', border: `1px solid ${LINE}` }}>
              {signupError}
            </div>
          )}
          <button
            onClick={handleSignup}
            style={{
              width: '100%',
              background: ACCENT,
              color: PAPER_WARM,
              fontFamily: ENGRAVED,
              fontSize: "var(--text-xl)",
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: "var(--space-lg) var(--space-xl)",
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t('ua.signup.cta', { points: modifiedPoints })}
          </button>
          <MobileStickyCaption color={MUTED}>
            {t('ua.signup.meta', { open: slotsOpen, max: maxTaskSlots, level: task.level_required })}
          </MobileStickyCaption>
        </MobileStickyBar>
      )}

      {mySubmission && (
        <MobileStickyBar style={{ flexDirection: 'row', alignItems: 'center' }}>
          <span className="content-text" style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, color: GOLD, flex: 1 }}>
            {t('ua.submitted.text')}
          </span>
          <Link
            to={`/praxes/${mySubmission.id}/edit`}
            style={{ fontFamily: ENGRAVED, fontSize: "var(--text-base)", letterSpacing: '0.12em', textTransform: 'uppercase', padding: "var(--space-md) var(--space-lg)", background: INK, color: PAPER_WARM, textDecoration: 'none' }}
          >
            {t('ua.submitted.edit')}
          </Link>
        </MobileStickyBar>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <MobileStickyBar style={{ flexDirection: 'row', alignItems: 'center', gap: "var(--space-md)" }}>
          <button
            onClick={handleDrop}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: "var(--text-base)", letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}
          >
            {t('ua.inProgress.drop')}
          </button>
          <Link
            to={`/praxes/${inProgressPraxisId}/edit`}
            style={{ marginLeft: "auto", fontFamily: ENGRAVED, fontSize: "var(--text-md)", letterSpacing: '0.12em', textTransform: 'uppercase', padding: "var(--space-md) var(--space-xl)", background: ACCENT, color: PAPER_WARM, textDecoration: 'none' }}
          >
            {t('ua.inProgress.continue')}
          </Link>
        </MobileStickyBar>
      )}
    </div>
  )
}
