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
import AlbescentSigil from '../../../components/cards/AlbescentSigil'
import type { EditPraxisState } from '../useEditPraxis'
import { MobileStickyBar, SegToggle, type ComposerTab } from './shared'

/**
 * Albescent MOBILE composer (#528) — "File an Account" on a phone. The same
 * single-column composer as the Default mobile skin (Write/Preview toggle, fluid
 * media grid, sticky submit bar) dressed as quiet cotton correspondence: the
 * surveyor's Mark, hairline sheets, Cormorant-italic titles, one hue of ink.
 * Ported from the desktop Albescent archetype; grounds on the
 * `--faction-albescent-*` tokens (always-light). Consumes `useEditPraxis`
 * verbatim — no editor, upload, or submit logic lives here.
 */

const INK = 'var(--faction-albescent-card-text)'
const SHEET = 'var(--faction-albescent-card-bg)'
const PAGE = 'var(--faction-albescent-page)'
const FONT = 'var(--faction-albescent-card-font)'
const MONO = 'var(--faction-albescent-mono)'
/** A near-black ink wash at the given opacity — the whole palette is one hue. */
const ink = (pct: number) => `color-mix(in srgb, ${INK} ${pct}%, transparent)`

const kicker: CSSProperties = {
  display: 'block',
  fontFamily: MONO,
  fontSize: 8,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: ink(30),
}

/** A cotton sheet headed by a quiet mono title. */
function Sheet({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ background: SHEET, border: `1px solid ${ink(10)}`, padding: 14 }}>
      <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: ink(40), marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </section>
  )
}

export default function AlbescentComposer({ state }: { state: EditPraxisState }) {
  const { t } = useTranslation('forms')
  const [tab, setTab] = useState<ComposerTab>('write')
  const praxis = state.praxis!
  const task = state.task

  return (
    <div data-skin="albescent" style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: MONO, color: INK, background: PAGE }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlbescentSigil size={22} />
          <h1 style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 27, lineHeight: 1, color: INK, margin: 0 }}>
            {t('editPraxis.albescent.pageTitle')}
          </h1>
          <span style={{ ...kicker, marginLeft: 'auto' }}>
            {state.autosaveAt
              ? t('editPraxis.albescent.autosaveSaved', { ago: formatAutosave(state.autosaveAt) })
              : t('editPraxis.albescent.autosaveUnsaved')}
          </span>
        </div>

        <SegToggle
          tab={tab}
          setTab={setTab}
          skin={{
            containerStyle: { gap: 0, border: `1px solid ${ink(14)}` },
            buttonStyle: (active) => ({
              padding: '9px 10px',
              border: 'none',
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              background: active ? INK : 'transparent',
              color: active ? PAGE : ink(45),
            }),
          }}
        />
      </header>

      {/* In-answer-to reference */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 14px', background: SHEET, border: `1px solid ${ink(10)}` }}>
        <span style={kicker}>{t('editPraxis.albescent.taskRefLabel')}</span>
        <span style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 16, color: INK, textAlign: 'right', flex: 1, lineHeight: 1.15 }}>
          {praxis.task_title}
        </span>
      </div>
      <div style={{ ...kicker, letterSpacing: '0.14em', color: ink(45) }}>
        {factionName(task?.primary_faction_slug ?? null)}
        {task ? ` · ${t('taskMeta.points', { points: task.point_value })}` : ''}
      </div>

      {tab === 'write' ? (
        <>
          <Sheet title={t('editPraxis.albescent.titleLabel')}>
            <TitleField
              state={state}
              skin={{
                placeholder: t('editPraxis.albescent.titlePlaceholder'),
                inputStyle: {
                  width: '100%',
                  fontFamily: FONT,
                  fontStyle: 'italic',
                  fontSize: 22,
                  fontWeight: 300,
                  color: INK,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  borderBottom: `1px solid ${ink(12)}`,
                  padding: '2px 0 8px',
                },
              }}
            />
          </Sheet>

          <Sheet title={t('editPraxis.albescent.bodyLabel')}>
            <BodyTextarea
              state={state}
              skin={{
                rows: 10,
                placeholder: t('editPraxis.albescent.bodyPlaceholder'),
                textareaStyle: {
                  width: '100%',
                  fontFamily: FONT,
                  fontStyle: 'italic',
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: INK,
                  background: ink(2),
                  border: `1px solid ${ink(10)}`,
                  padding: '13px 15px',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: 180,
                },
              }}
            />
          </Sheet>

          {state.showInviteBox && (
            <Sheet title={state.duelMode ? t('editPraxis.albescent.inviteLabelDuel') : t('editPraxis.albescent.inviteLabel')}>
              <InviteSearch
                state={state}
                skin={{
                  fontFamily: MONO,
                  inputBg: ink(2),
                  inputColor: INK,
                  inputBorder: `1px solid ${ink(10)}`,
                  acceptedBg: INK,
                  acceptedColor: PAGE,
                  placeholder: t('editPraxis.albescent.invitePlaceholder'),
                }}
              />
            </Sheet>
          )}

          <Sheet title={t('editPraxis.albescent.filesLabel')}>
            <MediaGrid state={state} />
          </Sheet>

          {state.showMetatasks && (
            <Sheet title={t('editPraxis.albescent.metatasksLabel')}>
              <MetatasksList
                state={state}
                skin={{
                  containerStyle: { display: 'flex', flexDirection: 'column', gap: 4 },
                  rowStyle: (selected) => ({
                    padding: '10px 12px',
                    background: selected ? ink(3) : 'transparent',
                    border: `1px solid ${selected ? ink(24) : ink(10)}`,
                  }),
                  titleColor: INK,
                  descColor: ink(45),
                  pointsActiveColor: ink(60),
                  pointsIdleColor: ink(40),
                }}
              />
            </Sheet>
          )}
        </>
      ) : (
        <Sheet title={t('editPraxis.albescent.previewLabel')}>
          <div style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 22, color: INK, marginBottom: 10 }}>
            {state.title || t('editPraxis.albescent.titlePlaceholder')}
          </div>
          {state.media.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <MediaGrid state={state} readOnly />
            </div>
          )}
          <BodyPreview
            state={state}
            skin={{
              markdownStyle: { fontFamily: FONT, fontStyle: 'italic', fontSize: 15, lineHeight: 1.65, color: ink(72) },
            }}
          />
        </Sheet>
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
          borderTop: `1px solid ${ink(14)}`,
        }}
      >
        <PublishButton
          state={state}
          skin={{
            idleLabel: t('editPraxis.albescent.publishIdle'),
            busyLabel: t('editPraxis.albescent.publishBusy'),
            style: {
              flex: 1,
              background: INK,
              color: PAGE,
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              padding: '13px 18px',
              border: `1px solid ${INK}`,
              cursor: state.submitting ? 'wait' : 'pointer',
            },
          }}
        />
        {!state.isPublished && (
          <DropButton
            state={state}
            skin={{
              label: t('editPraxis.albescent.dropLabel'),
              style: {
                background: 'transparent',
                border: 'none',
                color: ink(40),
                fontFamily: FONT,
                fontStyle: 'italic',
                fontSize: 14,
                cursor: 'pointer',
              },
            }}
          />
        )}
      </MobileStickyBar>
    </div>
  )
}

/** Fluid 3-column media grid in the filed-plates idiom. */
function MediaGrid({ state, readOnly = false }: { state: EditPraxisState; readOnly?: boolean }) {
  const { t } = useTranslation('forms')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {state.media.map((item) => {
        const filename = item.file_path.split('/').pop() ?? item.file_path
        const src = mediaUrl(item.file_path)
        return (
          <div key={item.id} style={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden', border: `1px solid ${ink(12)}`, background: ink(3) }}>
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
                  borderRadius: '50%',
                  background: SHEET,
                  border: `1px solid ${ink(20)}`,
                  color: ink(55),
                  fontSize: 12,
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
              background: ink(2),
              border: `1.5px dashed ${ink(16)}`,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: ink(50),
            },
            buttonLabel: t('editPraxis.albescent.fileButton'),
          }}
        />
      )}
    </div>
  )
}
