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
  PublishButton,
  SaveDraftButton,
  TitleField,
} from '../archetypes/controls'
import { MetataskSealStack } from '../MetataskSealStack'
import type { EditPraxisState } from '../useEditPraxis'
import {
  DefaultModePicker,
  MobileStickyBar,
  SegToggle,
  type ComposerTab,
} from './shared'

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
    <section style={{ position: 'relative', background: INK, color: TEXT, border: `1px solid ${LINE}`, boxShadow: CARD_SHADOW, padding: "var(--space-md)", overflow: 'hidden' }}>
      <span aria-hidden style={{ position: 'absolute', top: -10, left: 18, width: 56, height: 22, background: TAPE, transform: 'rotate(-4deg)', opacity: 0.92 }} />
      <div style={{ fontFamily: COND, fontSize: "var(--text-lg)", letterSpacing: '0.08em', textTransform: 'uppercase', color: ACID, marginBottom: "var(--space-sm)" }}>
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
    <div data-skin="snide" style={{ display: 'flex', flexDirection: 'column', gap: "var(--space-md)", fontFamily: TYPE, color: WALL_TEXT, background: WALL }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: "var(--space-md)" }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: "var(--space-sm)" }}>
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
            containerStyle: { gap: "var(--space-xs)", padding: "var(--space-xs)", background: INK, border: `1px solid ${LINE}` },
            buttonStyle: (active) => ({
              padding: 'var(--space-sm)',
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: "var(--space-sm)", padding: 'var(--space-md)', background: INK, color: TEXT, border: `1px solid ${LINE}` }}>
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
          {/* Mode — Solo · Collab · Duel, above the title (scrolls with content) */}
          <DefaultModePicker state={state} />

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
                  padding: 'var(--space-xs) 0 var(--space-sm)',
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
                  padding: 'var(--space-md) var(--space-lg)',
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

          {state.showSealStack && (
            <Plate title={t('editPraxis.snide.metatasksLabel')}>
              <MetataskSealStack state={state} />
            </Plate>
          )}

          <Plate title={t('editPraxis.snide.filesLabel')}>
            <MediaGrid state={state} />
          </Plate>
        </>
      ) : (
        <Plate title={t('editPraxis.snide.previewLabel')}>
          <div style={{ fontFamily: COND, fontSize: "var(--text-title)", letterSpacing: '0.02em', color: TEXT, marginBottom: "var(--space-sm)" }}>
            {state.title || t('editPraxis.snide.titlePlaceholder')}
          </div>
          {state.media.length > 0 && (
            <div style={{ marginBottom: "var(--space-md)" }}>
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
          gap: "var(--space-md)",
          padding: 'var(--space-md) 0 var(--space-xs)',
          background: 'var(--color-nav-bg)',
          backdropFilter: 'blur(var(--nav-blur))',
          borderTop: `1px solid ${ACID}`,
        }}
      >
        <SaveDraftButton state={state} />
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
              padding: 'var(--space-md) var(--space-lg)',
              border: 'none',
              boxShadow: '2px 3px 0 rgba(0,0,0,.4)',
              cursor: state.submitting ? 'wait' : 'pointer',
            },
          }}
        />
      </MobileStickyBar>
    </div>
  )
}

/** Fluid 3-column media grid in the paste-up idiom. */
function MediaGrid({ state, readOnly = false }: { state: EditPraxisState; readOnly?: boolean }) {
  const { t } = useTranslation('forms')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: "var(--space-sm)" }}>
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
              gap: "var(--space-xs)",
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
