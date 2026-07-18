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
 * Singularity MOBILE composer (#526) — "TRANSMIT SIGNAL" on a phone. The same
 * single-column composer as the Default mobile skin (Write/Preview toggle, fluid
 * media grid, sticky submit bar) dressed as a dark terminal: bracketed readout
 * panels, `//`-prompted labels, phosphor-green text on a void field. Ported from
 * the desktop Singularity terminal archetype; consumes `useEditPraxis` verbatim —
 * no editor, upload, or submit logic lives here.
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
  display: 'block',
  fontFamily: FONT,
  fontSize: "var(--text-xs)",
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: signal(60),
}

/** Void readout panel headed by a prompt label. */
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ background: VOID, border: `1px solid ${signal(42)}`, padding: 14 }}>
      <div style={{ fontFamily: FONT, fontSize: "var(--text-sm)", letterSpacing: '0.13em', textTransform: 'uppercase', color: PHOSPHOR, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </section>
  )
}

export default function SingularityComposer({ state }: { state: EditPraxisState }) {
  const { t } = useTranslation('forms')
  const [tab, setTab] = useState<ComposerTab>('write')
  const praxis = state.praxis!
  const task = state.task

  return (
    <div data-skin="singularity" style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT, color: PHOSPHOR, background: VOID }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h1 style={{ fontFamily: FONT, fontSize: "var(--text-title)", lineHeight: 1, color: PHOSPHOR, letterSpacing: '0.03em', margin: 0 }}>
            {t('editPraxis.singularity.mobile.pageTitle')}
          </h1>
          <span style={{ ...kicker, marginLeft: 'auto' }}>
            {state.autosaveAt
              ? t('editPraxis.singularity.mobile.autosaveSaved', { ago: formatAutosave(state.autosaveAt) })
              : t('editPraxis.singularity.mobile.autosaveUnsaved')}
          </span>
        </div>

        <SegToggle
          tab={tab}
          setTab={setTab}
          skin={{
            containerStyle: { gap: 4, padding: 3, background: VOID, border: `1px solid ${signal(38)}` },
            buttonStyle: (active) => ({
              padding: '9px 10px',
              border: 'none',
              fontFamily: FONT,
              fontSize: "var(--text-md)",
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              background: active ? PHOSPHOR : 'transparent',
              color: active ? VOID : signal(60),
            }),
          }}
        />
      </header>

      {/* For-function reference */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 14px', background: VOID, border: `1px solid ${signal(38)}` }}>
        <span style={kicker}>{t('editPraxis.singularity.mobile.taskRefLabel')}</span>
        <span style={{ fontFamily: FONT, fontSize: "var(--text-content)", color: PHOSPHOR, textAlign: 'right', flex: 1, lineHeight: 1.2 }}>
          {praxis.task_title}
        </span>
      </div>
      <div style={{ ...kicker, color: SIGNAL }}>
        {factionName(task?.primary_faction_slug ?? null)}
        {task ? ` · ${t('taskMeta.points', { points: task.point_value })}` : ''}
      </div>

      {tab === 'write' ? (
        <>
          <Panel title={t('editPraxis.singularity.mobile.titleLabel')}>
            <TitleField
              state={state}
              skin={{
                placeholder: t('editPraxis.singularity.titlePlaceholder'),
                inputStyle: {
                  width: '100%',
                  fontFamily: FONT,
                  color: PHOSPHOR,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  borderBottom: `1px solid ${signal(38)}`,
                  padding: '2px 0 8px',
                },
              }}
            />
          </Panel>

          <Panel title={t('editPraxis.singularity.mobile.bodyLabel', { words: state.wordCount })}>
            <BodyTextarea
              state={state}
              skin={{
                rows: 10,
                placeholder: t('editPraxis.singularity.bodyPlaceholder'),
                textareaStyle: {
                  width: '100%',
                  fontFamily: FONT,
                  lineHeight: 1.6,
                  color: PHOSPHOR,
                  background: signal(6),
                  border: `1px solid ${signal(38)}`,
                  padding: '13px 15px',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: 180,
                },
              }}
            />
          </Panel>

          {state.showInviteBox && (
            <Panel title={state.duelMode ? t('editPraxis.singularity.mobile.inviteLabelDuel') : t('editPraxis.singularity.mobile.inviteLabel')}>
              <InviteSearch
                state={state}
                skin={{
                  fontFamily: FONT,
                  inputBg: signal(6),
                  inputColor: PHOSPHOR,
                  inputBorder: `1px solid ${signal(38)}`,
                  acceptedBg: PHOSPHOR,
                  acceptedColor: VOID,
                  placeholder: t('editPraxis.singularity.invitePlaceholder'),
                }}
              />
            </Panel>
          )}

          <Panel title={t('editPraxis.singularity.mobile.filesLabel')}>
            <MediaGrid state={state} />
          </Panel>

          {state.showMetatasks && (
            <Panel title={t('editPraxis.singularity.mobile.metatasksLabel')}>
              <MetatasksList
                state={state}
                skin={{
                  containerStyle: { display: 'flex', flexDirection: 'column', gap: 4 },
                  rowStyle: (selected) => ({
                    padding: '10px 12px',
                    background: selected ? signal(12) : 'transparent',
                    border: `1px solid ${selected ? PHOSPHOR : signal(30)}`,
                  }),
                  titleColor: PHOSPHOR,
                  descColor: signal(60),
                  pointsActiveColor: PHOSPHOR,
                  pointsIdleColor: SIGNAL,
                }}
              />
            </Panel>
          )}
        </>
      ) : (
        <Panel title={t('editPraxis.singularity.mobile.previewLabel')}>
          <div style={{ fontFamily: FONT, fontSize: "var(--text-content)", color: PHOSPHOR, marginBottom: 10 }}>
            {'> '}
            {state.title || t('editPraxis.singularity.titlePlaceholder')}
          </div>
          {state.media.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <MediaGrid state={state} readOnly />
            </div>
          )}
          <BodyPreview
            state={state}
            skin={{
              markdownStyle: { fontFamily: FONT, lineHeight: 1.6, color: phosphor(80) },
            }}
          />
        </Panel>
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
          borderTop: `1px solid ${BORDER_HARD}`,
        }}
      >
        <PublishButton
          state={state}
          skin={{
            idleLabel: t('editPraxis.singularity.publishIdle'),
            busyLabel: t('editPraxis.singularity.publishBusy'),
            style: {
              flex: 1,
              background: PHOSPHOR,
              color: VOID,
              fontFamily: FONT,
              fontSize: "var(--text-lg)",
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '13px 18px',
              border: `1px solid ${PHOSPHOR}`,
              boxShadow: `0 0 16px ${phosphor(30)}`,
              cursor: state.submitting ? 'wait' : 'pointer',
            },
          }}
        />
        {!state.isPublished && (
          <DropButton
            state={state}
            skin={{
              label: t('editPraxis.singularity.dropLabel'),
              style: {
                background: 'transparent',
                border: 'none',
                color: signal(60),
                fontFamily: FONT,
                fontSize: "var(--text-lg)",
                cursor: 'pointer',
              },
            }}
          />
        )}
      </MobileStickyBar>
    </div>
  )
}

/** Fluid 3-column media grid in the terminal readout idiom. */
function MediaGrid({ state, readOnly = false }: { state: EditPraxisState; readOnly?: boolean }) {
  const { t } = useTranslation('forms')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {state.media.map((item) => {
        const filename = item.file_path.split('/').pop() ?? item.file_path
        const src = mediaUrl(item.file_path)
        return (
          <div key={item.id} style={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden', border: `1px solid ${signal(38)}`, background: signal(6) }}>
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
                  background: VOID,
                  border: `1px solid ${PHOSPHOR}`,
                  color: PHOSPHOR,
                  fontSize: "var(--text-lg)",
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
              background: signal(6),
              border: `1.5px dashed ${signal(38)}`,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontFamily: FONT,
              fontSize: "var(--text-base)",
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: PHOSPHOR,
            },
            buttonLabel: t('editPraxis.singularity.fileButton'),
          }}
        />
      )}
    </div>
  )
}
