import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import { MobileStickyBar, MobileStickyCaption } from './shared'
import type { TaskDetailState } from '../useTaskDetail'

/**
 * Warriors of Whimsy MOBILE task-detail skin (#531) — the quest.exe window on a
 * phone. A pink scrapbook window hero (traffic-light title bar, dotted board,
 * inner notepad) carries the Caveat title + sparks/level plates, then the "what
 * we're asking" brief, the love-so-far aggregate, the spells cast (completions),
 * and a sparkle-stamped **sticky action bar** ("join the party") pinned above the
 * tab bar. Single-column, no fixed-px grid. Reuses the same {@link TaskDetailState},
 * the shared mobile sticky bar, and the `wow.*` copy + `--faction-wow-*` tokens as
 * the desktop archetype and the other WOW pilots. Always-light: WOW is native-light.
 */

const PINK = 'var(--faction-wow)'
const PINK_DEEP = 'var(--faction-wow-card-accent)'
const TITLE_TEXT = 'var(--faction-wow-title-text)'
const CARD_TEXT = 'var(--faction-wow-card-text)'
const CARD_MUTED = 'var(--faction-wow-card-muted)'
const WIN_BORDER = 'var(--faction-wow-win-border)'
const NOTEPAD_BG = 'var(--faction-wow-notepad-bg)'
const NOTEPAD_BORDER = 'var(--faction-wow-notepad-border)'
const BODY_BG = 'var(--faction-wow-body-bg)'
const DOT = 'var(--faction-wow-dot)'
const SCRIPT = 'var(--faction-wow-card-font)' // Caveat
const BODY = 'var(--font-body)' // Courier Prime
const ON_ACCENT = 'var(--color-text-on-accent)'

/** The kit's four-point sparkle. */
function Sparkle({ size, color, style }: { size: number; color: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
      <path
        d="M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z"
        fill={color}
      />
    </svg>
  )
}

/** Caveat section heading with a sparkle and a dashed running rule. */
function SectionHead({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span className="content-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: SCRIPT, color: TITLE_TEXT, whiteSpace: 'nowrap' }}>
        <Sparkle size={13} color={PINK} />
        {title}
      </span>
      <span style={{ flex: 1, height: 2, background: `repeating-linear-gradient(90deg, ${PINK} 0 8px, transparent 8px 14px)` }} />
      {trailing}
    </div>
  )
}

export default function WowTaskDetail({ state }: { state: TaskDetailState }) {
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
    <div
      data-skin="wow"
      className="py-4"
      style={{
        fontFamily: BODY,
        color: CARD_TEXT,
        background: BODY_BG,
        backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
        backgroundSize: '15px 15px',
        marginLeft: -16,
        marginRight: -16,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      {/* Breadcrumb */}
      <nav className="mb-3" style={{ fontSize: "var(--text-sm)", letterSpacing: '0.12em', textTransform: 'uppercase', color: CARD_MUTED }}>
        <Link to="/tasks" style={{ color: PINK_DEEP, textDecoration: 'none' }}>
          {t('wow.breadcrumb')}
        </Link>
        <span aria-hidden style={{ margin: '0 6px', color: PINK }}>›</span>
        <span style={{ fontFamily: SCRIPT, fontSize: "var(--text-xl)", color: TITLE_TEXT }}>{task.title}</span>
      </nav>

      {/* Hero — quest.exe window */}
      <section
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          border: `2px solid ${WIN_BORDER}`,
          boxShadow: `0 8px 22px color-mix(in srgb, ${PINK} 22%, transparent)`,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 12px',
            background: 'linear-gradient(180deg, var(--faction-wow-title-from), var(--faction-wow-title-to))',
            borderBottom: `2px solid ${WIN_BORDER}`,
          }}
        >
          {['var(--faction-wow-scrap-deep)', 'var(--faction-wow-tape)', 'var(--faction-wow-ivy-leaf)'].map((c) => (
            <span key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, border: '1.2px solid rgba(255,255,255,0.7)' }} />
          ))}
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: SCRIPT, fontSize: "var(--text-content)", color: TITLE_TEXT }}>
            <Sparkle size={11} color={TITLE_TEXT} />
            {t('wow.window')}
          </span>
        </div>
        <div
          style={{
            position: 'relative',
            padding: 12,
            background: BODY_BG,
            backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
            backgroundSize: '13px 13px',
          }}
        >
          <div style={{ background: NOTEPAD_BG, border: `1.5px solid ${NOTEPAD_BORDER}`, borderRadius: 9, padding: '18px 18px 20px' }}>
            <div style={{ fontSize: "var(--text-sm)", letterSpacing: '0.16em', textTransform: 'uppercase', color: CARD_MUTED, marginBottom: 8 }}>
              {task.status === 'active' ? t('wow.statusOpen') : task.status}
            </div>
            <h1 className="content-title" style={{ fontFamily: SCRIPT, lineHeight: 0.95, color: TITLE_TEXT, margin: '0 0 14px', overflowWrap: 'anywhere' }}>
              {task.title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: "var(--text-base)", letterSpacing: '0.06em', textTransform: 'uppercase', color: CARD_TEXT, background: BODY_BG, border: `1.5px solid ${NOTEPAD_BORDER}`, borderRadius: 999, padding: '6px 13px' }}>
                <Sparkle size={10} color={PINK} />
                {t('wow.level', { level: task.level_required })}
              </span>
              <span className="content-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: SCRIPT, color: PINK }}>
                {t('wow.sparks', { points: modifiedPoints })}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* What we're asking — brief */}
      <section style={{ marginBottom: 20 }}>
        <SectionHead title={t('wow.askingHeading')} />
        <div style={{ background: NOTEPAD_BG, border: `1.5px solid ${NOTEPAD_BORDER}`, borderRadius: 9, padding: '16px 18px' }}>
          <p className="content-text" style={{ fontFamily: BODY, lineHeight: 1.75, color: task.description ? CARD_TEXT : CARD_MUTED, margin: 0, whiteSpace: 'pre-wrap' }}>
            {task.description || t('wow.askingEmpty')}
          </p>
        </div>
      </section>

      {/* The love so far — read-only aggregate */}
      <section style={{ marginBottom: 20 }}>
        <SectionHead title={t('wow.loveHeading')} />
        {voteCount > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <span className="content-title" style={{ fontFamily: SCRIPT, lineHeight: 0.8, color: PINK }}>{topScore}</span>
            <div style={{ paddingBottom: 5 }}>
              <div className="content-text" style={{ fontFamily: SCRIPT, color: TITLE_TEXT }}>{t('wow.love.top')}</div>
              <div style={{ fontSize: "var(--text-base)", color: CARD_MUTED, marginTop: 2 }}>{t('wow.love.adored', { count: voteCount })}</div>
            </div>
          </div>
        ) : (
          <p className="content-text" style={{ fontFamily: SCRIPT, color: PINK, margin: 0 }}>{t('wow.love.none')}</p>
        )}
      </section>

      {/* Spells cast (completions) */}
      <section>
        <SectionHead
          title={t('wow.spellsHeading', { count: submissions.length })}
          trailing={
            <div style={{ display: 'flex' }}>
              {(['score', 'recent'] as const).map((sort) => {
                const on = submissionSort === sort
                return (
                  <button
                    key={sort}
                    onClick={() => setSubmissionSort(sort)}
                    style={{
                      fontFamily: BODY,
                      fontSize: "var(--text-xs)",
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      padding: '5px 10px',
                      borderRadius: on ? 8 : 0,
                      background: on ? `linear-gradient(180deg, ${PINK}, ${PINK_DEEP})` : 'transparent',
                      color: on ? ON_ACCENT : CARD_MUTED,
                      border: `1.5px solid ${on ? PINK_DEEP : NOTEPAD_BORDER}`,
                      cursor: 'pointer',
                    }}
                  >
                    {sort === 'score' ? t('wow.sort.mostLoved') : t('wow.sort.recent')}
                  </button>
                )
              })}
            </div>
          }
        />
        {sortedSubmissions.length === 0 ? (
          <p className="content-text" style={{ fontFamily: SCRIPT, color: PINK, margin: 0 }}>{t('wow.empty')}</p>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {sortedSubmissions.slice(0, 4).map((s) => (
                <div key={s.id} style={{ position: 'relative', paddingTop: s.id === topId ? 18 : 0 }}>
                  {s.id === topId && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -4,
                        left: '50%',
                        transform: 'translateX(-50%) rotate(-2deg)',
                        zIndex: 3,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        whiteSpace: 'nowrap',
                        background: PINK,
                        color: ON_ACCENT,
                        fontFamily: SCRIPT,
                        fontSize: "var(--text-xl)",
                        padding: '2px 14px',
                        borderRadius: 14,
                        boxShadow: '2px 3px 0 var(--faction-wow-scrap-deep)',
                      }}
                    >
                      <span style={{ fontSize: "var(--text-lg)", lineHeight: 1 }}>⚜</span>
                      {t('wow.mostLoved')}
                    </div>
                  )}
                  <PraxisCard praxis={s} />
                </div>
              ))}
            </div>
            {submissions.length > 4 && (
              <div style={{ marginTop: 16 }}>
                <Link to={`/praxes?task_id=${task.id}`} className="content-text" style={{ fontFamily: SCRIPT, color: PINK, textDecoration: 'none' }}>
                  {t('wow.viewAll', { count: submissions.length })}
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
            <div style={{ fontFamily: BODY, fontSize: "var(--text-lg)", color: 'var(--color-danger)', padding: '8px 12px', background: 'var(--faction-wow-light)', border: `1.5px solid ${NOTEPAD_BORDER}`, borderRadius: 9 }}>
              {signupError}
            </div>
          )}
          <button
            onClick={handleSignup}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: `linear-gradient(180deg, ${PINK}, ${PINK_DEEP})`,
              color: ON_ACCENT,
              fontFamily: BODY,
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '14px 20px',
              border: `1.5px solid ${PINK_DEEP}`,
              borderRadius: 14,
              cursor: 'pointer',
            }}
          >
            <Sparkle size={13} color={ON_ACCENT} />
            {t('wow.signup.cta', { points: modifiedPoints })}
          </button>
          <MobileStickyCaption color={CARD_MUTED}>
            {t('wow.signup.slots', { open: slotsOpen, max: maxTaskSlots })}
          </MobileStickyCaption>
        </MobileStickyBar>
      )}

      {mySubmission && (
        <MobileStickyBar style={{ flexDirection: 'row', alignItems: 'center' }}>
          <span className="content-text" style={{ fontFamily: SCRIPT, color: PINK, flex: 1 }}>{t('wow.submitted.text')}</span>
          <Link
            to={`/praxes/${mySubmission.id}/edit`}
            style={{ fontFamily: BODY, fontSize: "var(--text-base)", letterSpacing: '0.12em', textTransform: 'uppercase', padding: '10px 18px', color: ON_ACCENT, background: `linear-gradient(180deg, ${PINK}, ${PINK_DEEP})`, border: `1.5px solid ${PINK_DEEP}`, borderRadius: 12, textDecoration: 'none' }}
          >
            {t('wow.submitted.edit')}
          </Link>
        </MobileStickyBar>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <MobileStickyBar style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleDrop}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: SCRIPT, fontSize: "var(--text-content)", color: CARD_MUTED }}
          >
            {t('wow.inProgress.drop')}
          </button>
          <Link
            to={`/praxes/${inProgressPraxisId}/edit`}
            style={{ marginLeft: 'auto', fontFamily: BODY, fontSize: "var(--text-md)", letterSpacing: '0.12em', textTransform: 'uppercase', padding: '12px 20px', color: ON_ACCENT, background: `linear-gradient(180deg, ${PINK}, ${PINK_DEEP})`, border: `1.5px solid ${PINK_DEEP}`, borderRadius: 14, textDecoration: 'none' }}
          >
            {t('wow.inProgress.continue')}
          </Link>
        </MobileStickyBar>
      )}
    </div>
  )
}
