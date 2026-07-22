import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import UaMandala from '../../../components/cards/UaMandala'
import { UaSigil } from '../../../components/cards/UaSigil'
import { toRoman } from '../../../components/cards/ephemeristsAtoms'
import { MobileStickyBar, MobileStickyCaption } from './shared'
import { LevelJumpBanner } from '../archetypes/shared'
import type { TaskDetailState } from '../useTaskDetail'

/**
 * University of Asthmatics MOBILE task-detail skin (#525/#852) — one sheet, read
 * top to bottom.
 *
 * The gilt-framed commission plate is gone with the salon (#788). The hero is a
 * single sun-bleached sheet on the mesa-sand ground: an eyebrow, the title in
 * Cormorant, one dashed orange rule, and the point value written inside the
 * ensō. Sections are separated by a neutral hairline instead of a gold gradient.
 * Single-column and flow-laid throughout — no fixed-px grid survives 375px
 * (SPEC-faction-ui-profile §1a).
 *
 * The mandala appears exactly once, as `texture` behind the hero — the one
 * strength a hero is entitled to. Everything below it is a dense list and asks
 * for nothing.
 *
 * Same {@link TaskDetailState}, same `ua.*` copy keys, same shared sticky bar as
 * before; only the dress changes (ADR-0016). Every colour is a
 * `--faction-ua-*` token with both themes, so this surface dims through the
 * `[data-theme="dark"]` cascade. UA dims now (#848).
 */

const PAGE = 'var(--faction-ua-page)'
const PAGE_TEXT = 'var(--faction-ua-page-text)'
const SHEET = 'var(--faction-ua-card-bg)'
const PANEL = 'var(--faction-ua-panel)'
const LIFT = 'var(--faction-ua-lift)'
const INK = 'var(--faction-ua-card-text)'
const BODY = 'var(--faction-ua-card-body)'
const MUTED = 'var(--faction-ua-card-muted)'
const ACCENT = 'var(--faction-ua-card-accent)'
const RULE = 'var(--faction-ua-rule)'
const FILL = 'var(--faction-ua)'
const ON_FILL = 'var(--faction-ua-on-fill)'
const VERMIL = 'var(--faction-ua-vermil)'
const DISPLAY = 'var(--faction-ua-card-font)'
const SERIF = 'var(--faction-ua-body-font)'

/** The label voice: EB Garamond, tracked small caps. No Cinzel, no gold. */
const smallCaps: CSSProperties = {
  fontFamily: SERIF,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: MUTED,
}

// "Anno {roman}"; level 0 shows an em-dash (matches the desktop UA convention).
const anno = (level: number) => (level > 0 ? toRoman(level) : '—')

/** The signature divider — one dashed orange rule, held back to a whisper. */
function DashedRule({ margin }: { margin: string }) {
  return <div aria-hidden style={{ height: 0, borderTop: `1.5px dashed ${FILL}`, opacity: 0.4, margin }} />
}

function SectionHead({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
      <h2 style={{ ...smallCaps, color: INK, margin: 0 }}>{title}</h2>
      <span aria-hidden style={{ flex: 1, minWidth: 'var(--space-xl)', height: 1, background: RULE }} />
      {trailing}
    </div>
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
    <div
      className="py-4"
      style={{
        fontFamily: SERIF,
        color: PAGE_TEXT,
        background: PAGE,
        marginLeft: 'calc(-1 * var(--space-lg))',
        marginRight: 'calc(-1 * var(--space-lg))',
        paddingLeft: 'var(--space-lg)',
        paddingRight: 'var(--space-lg)',
      }}
    >
      {/* Breadcrumb */}
      <nav className="mb-3" style={smallCaps}>
        <Link to="/tasks" style={{ color: ACCENT, textDecoration: 'none' }}>
          {t('default.breadcrumb')}
        </Link>
        <span aria-hidden style={{ margin: '0 var(--space-sm)', color: MUTED }}>
          ›
        </span>
        <span style={{ color: BODY }}>{task.title}</span>
      </nav>

      {/* Hero — one sheet, the mandala felt rather than read behind it */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: SHEET,
          border: `1px solid ${RULE}`,
          borderRadius: 6,
          padding: 'var(--space-xl)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        <UaMandala
          size={240}
          strength="texture"
          style={{ position: 'absolute', right: -72, top: -64, pointerEvents: 'none' }}
        />

        <div style={{ position: 'relative' }}>
          <div className="flex items-center justify-between flex-wrap" style={{ gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <span style={{ ...smallCaps, color: ACCENT }}>{t('ua.masthead')}</span>
            <span style={smallCaps}>{t('ua.statusOpen')}</span>
          </div>

          <h1
            className="content-title"
            style={{ fontFamily: DISPLAY, fontWeight: 600, lineHeight: 1.08, color: INK, margin: 0, overflowWrap: 'anywhere' }}
          >
            {task.title}
          </h1>

          <DashedRule margin="var(--space-lg) 0" />

          <div className="flex items-center flex-wrap" style={{ gap: 'var(--space-lg)' }}>
            <span style={{ position: 'relative', width: 76, height: 76, flex: 'none' }}>
              <UaSigil width={76} height={76} />
              <span
                className="content-title"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: DISPLAY,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: VERMIL,
                }}
              >
                {modifiedPoints}
              </span>
            </span>
            <div>
              <div style={{ ...smallCaps, color: INK }}>{t('ua.stats.honoraria')}</div>
              <div style={{ ...smallCaps, marginTop: 'var(--space-xs)' }}>
                {`${t('ua.stats.anno')} ${anno(task.level_required)}`}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The brief */}
      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <SectionHead title={t('ua.commissionHeading')} />
        <div style={{ background: SHEET, border: `1px solid ${RULE}`, borderRadius: 6, padding: 'var(--space-lg)' }}>
          <p
            className="content-text"
            style={{ fontFamily: SERIF, lineHeight: 1.7, color: task.description ? BODY : MUTED, margin: 0, whiteSpace: 'pre-wrap' }}
          >
            {task.description || t('ua.commissionEmpty')}
          </p>
        </div>
      </section>

      {/* The reading — read-only aggregate */}
      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <SectionHead title={t('ua.critiqueHeading')} />
        {voteCount > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <span
              className="content-title"
              style={{ fontFamily: DISPLAY, fontWeight: 600, lineHeight: 0.85, color: VERMIL }}
            >
              {topScore}
            </span>
            <div style={{ paddingBottom: 'var(--space-xs)' }}>
              <div style={{ ...smallCaps, color: INK }}>{t('ua.critique.finest')}</div>
              <div style={{ ...smallCaps, marginTop: 'var(--space-xs)' }}>
                {t('ua.critique.appraised', { count: voteCount })}
              </div>
            </div>
          </div>
        ) : (
          <p className="content-text" style={{ fontFamily: SERIF, color: MUTED, margin: 0 }}>
            {t('ua.critique.none')}
          </p>
        )}
      </section>

      {/* Sealed work */}
      <section>
        <SectionHead
          title={t('ua.salonWallHeading')}
          trailing={
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {(['score', 'recent'] as const).map((sort) => {
                const on = submissionSort === sort
                return (
                  <button
                    key={sort}
                    onClick={() => setSubmissionSort(sort)}
                    style={{
                      fontFamily: SERIF,
                      fontSize: 'var(--text-md)',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      padding: 'var(--space-xs) var(--space-md)',
                      background: on ? FILL : 'transparent',
                      color: on ? ON_FILL : MUTED,
                      border: `1px solid ${on ? FILL : RULE}`,
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
          <p className="content-text" style={{ fontFamily: SERIF, color: MUTED, margin: 0 }}>
            {t('ua.empty')}
          </p>
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
                        background: FILL,
                        color: ON_FILL,
                        fontFamily: SERIF,
                        fontSize: 'var(--text-md)',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        padding: 'var(--space-xs) var(--space-md)',
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
              <div style={{ marginTop: 'var(--space-lg)' }}>
                <Link to={`/praxes?task_id=${task.id}`} style={{ ...smallCaps, color: ACCENT, textDecoration: 'none' }}>
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
          <LevelJumpBanner state={state} />
          {signupError && (
            /* #848 turned --faction-ua-light opaque, so it can no longer whisper
               behind an error line. A failure is lifted, not tinted: the raised
               surface plus the shared danger ink, both themed. */
            <div
              className="content-text"
              style={{
                fontFamily: SERIF,
                color: 'var(--color-danger)',
                padding: 'var(--space-sm) var(--space-md)',
                background: LIFT,
                borderLeft: '3px solid var(--color-danger)',
              }}
            >
              {signupError}
            </div>
          )}
          <button
            onClick={handleSignup}
            style={{
              width: '100%',
              background: FILL,
              color: ON_FILL,
              fontFamily: SERIF,
              fontSize: 'var(--text-xl)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: 'var(--space-lg)',
              border: 'none',
              borderRadius: 3,
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
        <MobileStickyBar style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="content-text" style={{ fontFamily: DISPLAY, fontWeight: 600, color: ACCENT, flex: 1 }}>
            {t('ua.submitted.text')}
          </span>
          <Link
            to={`/praxes/${mySubmission.id}/edit`}
            style={{
              fontFamily: SERIF,
              fontSize: 'var(--text-md)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              padding: 'var(--space-md) var(--space-lg)',
              background: PANEL,
              color: INK,
              border: `1px solid ${RULE}`,
              textDecoration: 'none',
            }}
          >
            {t('ua.submitted.edit')}
          </Link>
        </MobileStickyBar>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <MobileStickyBar style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <button
            onClick={handleDrop}
            style={{ background: 'none', border: 'none', cursor: 'pointer', ...smallCaps }}
          >
            {t('ua.inProgress.drop')}
          </button>
          <Link
            to={`/praxes/${inProgressPraxisId}/edit`}
            style={{
              marginLeft: 'auto',
              fontFamily: SERIF,
              fontSize: 'var(--text-md)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              padding: 'var(--space-md) var(--space-xl)',
              background: FILL,
              color: ON_FILL,
              textDecoration: 'none',
            }}
          >
            {t('ua.inProgress.continue')}
          </Link>
        </MobileStickyBar>
      )}
    </div>
  )
}
