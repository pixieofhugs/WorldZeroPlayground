import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import MediaArt from '../blocks/MediaArt'
import { pickArtKey } from '../blocks/useMediaArt'
import { ErrorBanner, formatAutosave } from '../archetypes/shared'
import {
  BodyPreview,
  BodyTextarea,
  DropButton,
  FilePicker,
  InviteSearch,
  MetatasksList,
  PublishButton,
  TitleField,
} from '../archetypes/controls'
import type { EditPraxisState } from '../useEditPraxis'
import { MobileStickyBar, SegToggle, type ComposerTab } from './shared'

/**
 * S.N.I.D.E. MOBILE composer (#530) — "FILE IT & RUN" on a phone. The same
 * single-column composer as the Default mobile skin (Write/Preview toggle, fluid
 * media grid, sticky submit bar) dressed as a ransom-note zine: dark taped
 * cards, acid kickers, Bebas headers, a hot-pink primary. Ported from the desktop
 * SNIDE zine archetype; grounds on the `--faction-snide-*` tokens (native-dark).
 * Consumes `useEditPraxis` verbatim — no editor, upload, or submit logic lives
 * here.
 */

const WALL = 'var(--faction-snide-wall)'
const WALL_TEXT = 'var(--faction-snide-wall-text)'
const INK = 'var(--faction-snide-card-bg)'
const TEXT = 'var(--faction-snide-card-text)'
const MUTED = 'var(--faction-snide-card-muted)'
const ACID = 'var(--faction-snide-card-accent)'
const PINK = 'var(--faction-snide-pink)'
const TAPE = 'var(--faction-snide-tape)'
const LINE = 'var(--faction-snide-border)'
const PAPER = 'var(--faction-snide-paper)'
const COND = 'var(--faction-snide-font-cond)'
const BLACK = 'var(--faction-snide-font-black)'
const TYPE = 'var(--faction-snide-font-type)'

const CARD_SHADOW = '5px 6px 0 rgba(0,0,0,.5)'

const kicker: CSSProperties = {
  display: 'block',
  fontFamily: TYPE,
  fontSize: "var(--text-xs)",
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: MUTED,
}

/** A dark taped card headed by an acid kicker. */
function Plate({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ position: 'relative', background: INK, color: TEXT, border: `1px solid ${LINE}`, boxShadow: CARD_SHADOW, padding: 14, overflow: 'hidden' }}>
      <span aria-hidden style={{ position: 'absolute', top: -10, left: 18, width: 56, height: 22, background: TAPE, transform: 'rotate(-4deg)', opacity: 0.92 }} />
      <div style={{ fontFamily: COND, fontSize: "var(--text-lg)", letterSpacing: '0.08em', textTransform: 'uppercase', color: ACID, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </section>
  )
}

export default function SnideComposer({ state }: { state: EditPraxisState }) {
  const { t } = useTranslation('forms')
  const [tab, setTab] = useState<ComposerTab>('write')
  const praxis = state.praxis!
  const task = state.task

  return (
    <div data-skin="snide" style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: TYPE, color: WALL_TEXT, background: WALL }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h1 style={{ fontFamily: COND, fontSize: "var(--text-heading)", letterSpacing: '0.03em', lineHeight: 1, color: WALL_TEXT, margin: 0, textTransform: 'uppercase' }}>
            {t('editPraxis.snide.pageTitle')}
          </h1>
          <span style={{ ...kicker, marginLeft: 'auto' }}>
            {state.autosaveAt
              ? t('editPraxis.snide.autosaveSaved', { ago: formatAutosave(state.autosaveAt) })
              : t('editPraxis.snide.autosaveUnsaved')}
          </span>
        </div>

        <SegToggle
          tab={tab}
          setTab={setTab}
          skin={{
            containerStyle: { gap: 4, padding: 3, background: INK, border: `1px solid ${LINE}` },
            buttonStyle: (active) => ({
              padding: '9px 10px',
              border: 'none',
              fontFamily: BLACK,
              fontSize: "var(--text-md)",
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: active ? ACID : 'transparent',
              color: active ? INK : MUTED,
            }),
          }}
        />
      </header>

      {/* For-completion reference */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 14px', background: INK, color: TEXT, border: `1px solid ${LINE}` }}>
        <span style={kicker}>{t('editPraxis.snide.taskRefLabel')}</span>
        <span style={{ fontFamily: COND, fontSize: "var(--text-content)", letterSpacing: '0.03em', color: TEXT, textAlign: 'right', flex: 1, lineHeight: 1.1 }}>
          {praxis.task_title}
        </span>
      </div>
      <div style={{ ...kicker, color: ACID }}>
        {factionName(task?.primary_faction_slug ?? null)}
        {task ? ` · ${t('taskMeta.points', { points: task.point_value })}` : ''}
      </div>

      {tab === 'write' ? (
        <>
          <Plate title={t('editPraxis.snide.titleLabel')}>
            <TitleField
              state={state}
              skin={{
                placeholder: t('editPraxis.snide.titlePlaceholder'),
                inputStyle: {
                  width: '100%',
                  fontFamily: COND,
                  letterSpacing: '0.02em',
                  color: TEXT,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  borderBottom: `1px solid ${LINE}`,
                  padding: '2px 0 8px',
                },
              }}
            />
          </Plate>

          <Plate title={t('editPraxis.snide.bodyLabel', { words: state.wordCount })}>
            <BodyTextarea
              state={state}
              skin={{
                rows: 10,
                placeholder: t('editPraxis.snide.bodyPlaceholder'),
                textareaStyle: {
                  width: '100%',
                  fontFamily: TYPE,
                  lineHeight: 1.6,
                  color: TEXT,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${LINE}`,
                  padding: '13px 15px',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: 180,
                },
              }}
            />
          </Plate>

          {state.showInviteBox && (
            <Plate title={state.duelMode ? t('editPraxis.snide.inviteLabelDuel') : t('editPraxis.snide.inviteLabel')}>
              <InviteSearch
                state={state}
                skin={{
                  fontFamily: TYPE,
                  inputBg: 'rgba(255,255,255,0.04)',
                  inputColor: TEXT,
                  inputBorder: `1px solid ${LINE}`,
                  acceptedBg: ACID,
                  acceptedColor: INK,
                  placeholder: t('editPraxis.snide.invitePlaceholder'),
                }}
              />
            </Plate>
          )}

          <Plate title={t('editPraxis.snide.filesLabel')}>
            <MediaGrid state={state} />
          </Plate>

          {state.showMetatasks && (
            <Plate title={t('editPraxis.snide.metatasksLabel')}>
              <MetatasksList
                state={state}
                skin={{
                  containerStyle: { display: 'flex', flexDirection: 'column', gap: 4 },
                  rowStyle: (selected) => ({
                    padding: '10px 12px',
                    background: selected ? 'rgba(182,255,46,0.08)' : 'transparent',
                    border: `1px solid ${selected ? ACID : LINE}`,
                  }),
                  titleColor: TEXT,
                  descColor: MUTED,
                  pointsActiveColor: ACID,
                  pointsIdleColor: MUTED,
                }}
              />
            </Plate>
          )}
        </>
      ) : (
        <Plate title={t('editPraxis.snide.previewLabel')}>
          <div style={{ fontFamily: COND, fontSize: "var(--text-title)", letterSpacing: '0.02em', color: TEXT, marginBottom: 10 }}>
            {state.title || t('editPraxis.snide.titlePlaceholder')}
          </div>
          {state.media.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <MediaGrid state={state} readOnly />
            </div>
          )}
          <BodyPreview
            state={state}
            skin={{
              markdownStyle: { fontFamily: TYPE, lineHeight: 1.6, color: TEXT },
            }}
          />
        </Plate>
      )}

      <ErrorBanner message={state.error} />

      <MobileStickyBar
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 0 4px',
          background: 'var(--color-nav-bg)',
          backdropFilter: 'blur(var(--nav-blur))',
          borderTop: `1px solid ${ACID}`,
        }}
      >
        <PublishButton
          state={state}
          skin={{
            idleLabel: t('editPraxis.snide.publishIdle'),
            busyLabel: t('editPraxis.snide.publishBusy'),
            style: {
              flex: 1,
              background: PINK,
              color: PAPER,
              fontFamily: BLACK,
              fontSize: "var(--text-lg)",
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '13px 18px',
              border: 'none',
              boxShadow: '2px 3px 0 rgba(0,0,0,.4)',
              cursor: state.submitting ? 'wait' : 'pointer',
            },
          }}
        />
        {!state.isPublished && (
          <DropButton
            state={state}
            skin={{
              label: t('editPraxis.snide.dropLabel'),
              style: {
                background: 'transparent',
                border: 'none',
                color: MUTED,
                fontFamily: TYPE,
                fontSize: "var(--text-lg)",
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                cursor: 'pointer',
              },
            }}
          />
        )}
      </MobileStickyBar>
    </div>
  )
}

/** Fluid 3-column media grid in the paste-up idiom. */
function MediaGrid({ state, readOnly = false }: { state: EditPraxisState; readOnly?: boolean }) {
  const { t } = useTranslation('forms')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {state.media.map((item) => {
        const filename = item.file_path.split('/').pop() ?? item.file_path
        const src = mediaUrl(item.file_path)
        return (
          <div key={item.id} style={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden', border: `1px solid ${ACID}`, background: 'rgba(255,255,255,0.04)' }}>
            {item.type === 'image' ? (
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : item.type === 'video' ? (
              <video src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <MediaArt art={pickArtKey(filename, 'audio')} width={120} height={120} />
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={() => void state.removeMedia(item)}
                aria-label={t('media.removeAria', { name: filename })}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 24,
                  height: 24,
                  background: INK,
                  border: `1px solid ${ACID}`,
                  color: ACID,
                  fontSize: "var(--text-lg)",
                  fontWeight: 700,
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ×
              </button>
            )}
          </div>
        )
      })}
      {!readOnly && (
        <FilePicker
          state={state}
          skin={{
            buttonStyle: {
              aspectRatio: '1 / 1',
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: `1.5px dashed ${ACID}`,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontFamily: TYPE,
              fontSize: "var(--text-base)",
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: ACID,
            },
            buttonLabel: t('editPraxis.snide.fileButton'),
          }}
        />
      )}
    </div>
  )
}
