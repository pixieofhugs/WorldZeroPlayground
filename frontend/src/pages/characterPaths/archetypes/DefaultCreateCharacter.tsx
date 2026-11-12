/**
 * Default (na) character creation: the unaffiliated kit and the fallback for any
 * unregistered slug (#2346, on the composer chassis since #2992). The dress is
 * `DefaultEditPraxis`'s (ADR-0065's reference kit); its own tree, not a merge.
 *
 * One responsive tree, no phone branch; no fixed-px grids (SPEC-faction-ui-profile
 * §1a). Section order matches the eight siblings (#2995); na keeps the inline
 * commit button, not the band (#1828).
 *
 * `useCreateCharacter` owns all state. An empty `factionSlug` means born `na` and
 * renders this, never UA or the viewer's faction (#796). `albescent` lands here
 * too: its registrations are wrappers (ADR-0027).
 *
 * Placeholder-only fields via `namedField()` (#2793); the portrait and calling
 * groups keep headings since they head buttons. `ep-drift` motion is a class so
 * the reduced-motion guard applies (#1003).
 */
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionCssVar, factionName } from '../../../utils/factions'
import CredentialCard from '../../../components/CredentialCard'
import FactionSigil from '../../../components/sigil/FactionSigil'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import PortraitPicker from '../PortraitPicker'
import { namedField } from '../characterFields'
import {
  ComposerFooter,
  ComposerHeading,
  ComposerPage,
  ComposerRule,
  ComposerSection,
  ComposerSheet,
  ErrorBanner,
  composerLabelStyle,
  useComposerSizes,
} from '../../editPraxis/archetypes/shared'
import {
  ALARM,
  EDGE,
  FAINT,
  FIELD,
  HAIR,
  INK,
  MUTED,
  TITLE_FACE,
  composerGround,
  fieldBox,
  labelStyle,
  primaryStyle,
  sheetStyle,
} from '../../editPraxis/archetypes/defaultComposerDress'
import {
  NAME_MAX,
  BIO_MAX,
  TAGLINE_MAX,
  type CreateCharacterState,
} from '../useCreateCharacter'

/* Dress shared with `DefaultEditCharacter` / `DefaultProposeTask` (#2993). The
 * ground is the washed sheet, not the page, so the app neutrals don't apply;
 * rows in `createCharacterContrast.test.ts` and `defaultComposerDressEdges.test.tsx`. */

export default function DefaultCreateCharacter({ state }: { state: CreateCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const sizes = useComposerSizes()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    displayName,
    setDisplayName,
    bio,
    setBio,
    tagline,
    setTagline,
    factionSlug,
    setFactionSlug,
    invited,
    avatarFile,
    avatarPreview,
    avatarSource,
    setAvatarSource,
    avatarError,
    setAvatarError,
    handleAvatarChange,
    handleAvatarConfirm,
    error,
    submitting,
    canSubmit,
    handleSubmit,
    handle,
    showPicker,
  } = state

  const counter = (used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : FAINT }}>
        {t('createCharacter.charsLeft', { count: max - used })}
      </span>
    </div>
  )

  const optionalHead = (label: string, tail: string) => (
    <>
      {label} <span style={{ textTransform: 'none', letterSpacing: 0 }}>{tail}</span>
    </>
  )

  return (
    <ComposerPage sizes={sizes} style={{ fontFamily: TITLE_FACE, color: INK }}>
      {/* Real `<form>` so Enter commits; `handleSubmit` prevents default. */}
      <form onSubmit={handleSubmit} data-skin="default">
        {/* `reserveHead` (#2995): the page reskins as a calling is picked, so
            the column must start where the tallest masthead's does. */}
        <ComposerSheet sizes={sizes} style={sheetStyle} reserveHead ground={composerGround}>
          <ComposerHeading sizes={sizes}>
            <h1
              style={{
                fontFamily: TITLE_FACE,
                fontStyle: 'italic',
                fontWeight: 700,
                fontSize: sizes.titleSize,
                lineHeight: 1.1,
                color: INK,
                margin: 0,
              }}
            >
              {t('createCharacter.heading')}
            </h1>
          </ComposerHeading>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CredentialCard
              displayName={displayName || t('createCharacter.previewFallbackName')}
              handle={handle}
              factionSlug={factionSlug || null}
              level={0}
              score={0}
              avatarUrl={avatarPreview}
              onAvatarClick={() => fileInputRef.current?.click()}
            />
          </div>

          <ComposerSection rule={false}>
            <input
              data-composer-field
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_MAX}
              {...namedField(t('character.namePlaceholder'))}
              autoFocus
              style={{ ...fieldBox, fontFamily: TITLE_FACE, fontStyle: 'italic', fontSize: 'var(--text-title)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)' }}>
              <span style={{ color: FAINT }}>@{handle}</span>
              <span style={{ color: displayName.length >= NAME_MAX ? ALARM : FAINT }}>
                {t('createCharacter.charsLeft', { count: NAME_MAX - displayName.length })}
              </span>
            </div>
          </ComposerSection>

          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={BIO_MAX}
              {...namedField(t('character.bioPlaceholder'))}
              rows={3}
              style={fieldBox}
            />
            {counter(bio.length, BIO_MAX)}
          </ComposerSection>

          {/* Tagline: a slogan line, not a short bio (#1628). */}
          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={TAGLINE_MAX}
              {...namedField(t('character.taglinePlaceholder'))}
              rows={2}
              style={fieldBox}
            />
            {counter(tagline.length, TAGLINE_MAX)}
          </ComposerSection>

          {/* Picker owns the hidden input (#1149); the card opens it too. */}
          <ComposerSection
            rule={false}
            label={optionalHead(t('character.portrait'), t('createCharacter.optional'))}
            labelStyle={labelStyle}
          >
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              error={avatarError}
              buttonStyle={composerLabelStyle({
                cursor: 'pointer',
                borderRadius: 10,
                padding: 'var(--space-sm) var(--space-lg)',
                background: FIELD,
                color: INK,
                border: `1px solid ${EDGE}`,
              })}
              statusStyle={{ color: FAINT }}
              errorStyle={{ color: ALARM }}
            />
          </ComposerSection>

          {/* Only with invitations (ADR-0019). Single column: a grid went ragged. */}
          {showPicker && (
            <ComposerSection
              rule={false}
              label={optionalHead(t('createCharacter.callingLabel'), t('createCharacter.callingOptional'))}
              labelStyle={labelStyle}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {invited.map((slug) => {
                  const selected = factionSlug === slug
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => setFactionSlug(selected ? '' : slug)}
                      /* Not `composerLabelStyle`: its uppercase would leak in. */
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        width: '100%',
                        cursor: 'pointer',
                        textAlign: 'left',
                        background: FIELD,
                        border: `1px solid ${EDGE}`,
                        borderRadius: 10,
                        padding: 'var(--space-md) var(--space-lg)',
                        // Faction hue as a ring, never ink (§3).
                        boxShadow: selected ? `0 0 0 2px ${factionCssVar(slug)}` : 'none',
                      }}
                    >
                      <FactionSigil slug={slug} size={18} />
                      <span
                        style={{
                          fontFamily: factionCssVar(slug, 'card-font'),
                          fontSize: 'var(--text-content)',
                          color: MUTED,
                        }}
                      >
                        {factionName(slug)}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)', color: FAINT, margin: 0, lineHeight: 1.6 }}>
                {t('createCharacter.callingHint')}
              </p>
            </ComposerSection>
          )}

          {/* What being born `na` means (#2992). */}
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)', color: FAINT, margin: 0, lineHeight: 1.6 }}>
            {t('createCharacter.help')}
          </p>

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {/* The one rule (#1707), right above the footer. */}
          <ComposerRule style={{ background: HAIR }} />

          {/* [Cancel] … [Create] (#646); inline button, not band (#1828). */}
          <ComposerFooter
            start={
              <>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  style={composerLabelStyle({
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: FAINT,
                    textDecoration: 'underline',
                  })}
                >
                  {t('common:actions.cancel')}
                </button>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)', color: FAINT }}>
                  {t('createCharacter.startsAt')}
                </span>
              </>
            }
            end={
              <button
                type="submit"
                disabled={!canSubmit}
                /* `.control-off`, not an opacity fade (#2486). */
                className="control-off"
                style={{ ...primaryStyle, cursor: submitting ? 'wait' : 'pointer' }}
              >
                {submitting ? t('createCharacter.submitBusy') : t('createCharacter.submitIdle')}
              </button>
            }
          />
        </ComposerSheet>
      </form>

      {/* Locked square (#514). */}
      {avatarSource && (
        <ImageEditModal
          key={`${avatarSource.name}-${avatarSource.lastModified}`}
          file={avatarSource}
          aspect={AVATAR_ASPECT}
          onConfirm={handleAvatarConfirm}
          onCancel={() => setAvatarSource(null)}
          onError={setAvatarError}
        />
      )}
    </ComposerPage>
  )
}
