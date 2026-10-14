/**
 * Copy edit mode — reword any string on any page, live, without a deploy.
 *
 * Mounted once from `App.tsx`, which gates it on `is_admin && adminMode`, so
 * this file assumes it is only ever rendered for an admin in admin mode.
 *
 * HOW A CLICK BECOMES A KEY
 * -------------------------
 * `i18n.ts`'s `copyRegistry` postProcessor records every rendered string
 * against the `ns:key` that produced it while this editor is armed
 * (`utils/copyRegistry.ts`). Arming emits `languageChanged`, which makes every
 * `useTranslation` consumer re-render and therefore re-record, so the index
 * describes the page as it currently stands rather than only what renders next.
 *
 * WHY THE CAPTURE PHASE
 * ---------------------
 * Most copy lives inside a link or a button. A listener in the bubble phase
 * would navigate away before it heard the click, so this one listens on
 * `document` in the capture phase and stops the event there: while armed, a
 * click edits a label instead of doing what the label says. That is a big thing
 * to do to a page, so the panel says so on screen and disarming undoes it
 * completely.
 *
 * ACCEPTED LIMIT: NO KEYBOARD REACH WHILE A CONFIRM IS OPEN (#3136)
 * ----------------------------------------------------------------
 * `ConfirmDialog` wraps Tab between its own first and last focusable nodes, and
 * this panel is portalled to the document root outside it, so Tab never lands
 * here while a confirm is open. Nothing is built for that, on purpose: a string
 * is chosen by pointing at it (the capture-phase click below), so keyboard
 * reach into the panel would not make the editor usable there, and widening
 * every modal's trap for an admin-only pointer tool buys nothing.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import { deleteCopyOverride, putCopyOverride } from '../../api/copy'
import { extractError } from '../../utils/errors'
import { useFormFactor } from '../../hooks/useFormFactor'
import i18n, { resources } from '../../i18n'
import { drawAtRoot } from '../ui/drawAtRoot'
import {
  copyTargetsForElement,
  missingPlaceholders,
  setCopyRecording,
  type CopyTarget,
} from '../../utils/copyRegistry'

/**
 * The value the app SHIPS with, straight out of the imported JSON.
 *
 * `resources` is the pristine catalog only because `i18n.ts` hands the store a
 * clone — the store mutates what it is given, and reading the mutated copy here
 * is what made Revert write the override straight back while reporting success.
 *
 * Exported for `__tests__/copyOverrides.test.ts`: that one reference-versus-clone
 * detail is the whole of whether Revert works, and it is invisible from outside.
 */
export function shippedValue(ns: string, key: string): string {
  const table: unknown = (resources.en as Record<string, unknown>)[ns]
  const found = key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object') return (node as Record<string, unknown>)[part]
    return undefined
  }, table)
  return typeof found === 'string' ? found : ''
}

/** The template in force right now — `{{count}}` intact, not the rendered form. */
function currentTemplate(target: CopyTarget): string | null {
  const raw = i18n.getResource('en', target.ns, target.key)
  return typeof raw === 'string' ? raw : null
}

/** i18next's plural categories, as the `_<category>` suffixes ADR-0032 uses. */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/
const FORM_LABEL = {
  zero: 'copyEdit.form_zero',
  one: 'copyEdit.form_one',
  two: 'copyEdit.form_two',
  few: 'copyEdit.form_few',
  many: 'copyEdit.form_many',
  other: 'copyEdit.form_other',
} as const

/**
 * The plural forms of a key that holds no string of its own (#3165).
 *
 * The click yields the BARE key (`…stats.members`), because that is what `t()`
 * was called with; the strings live at `…members_one` / `…members_other`. Each
 * form is its own override, stored at its own dotted key, so each is its own
 * target. Empty when the key has no plural siblings (a context variant, say).
 *
 * Exported for `__tests__/copyOverrides.test.ts`.
 */
export function pluralForms(target: CopyTarget): CopyTarget[] {
  return ['zero', 'one', 'two', 'few', 'many', 'other']
    .map((category) => ({ ns: target.ns, key: `${target.key}_${category}` }))
    .filter((form) => currentTemplate(form) !== null)
}

const PANEL: CSSProperties = {
  position: 'fixed',
  bottom: 'var(--space-md)',
  left: 'var(--space-md)',
  // Above every overlay in the app, the `1000` full-screen modals included
  // (#3094): a popup's wording can only be edited if this panel can be reached
  // while the popup is open. `__tests__/copyEditorStacking.test.tsx` derives the
  // highest layer from source and fails if this stops clearing it.
  zIndex: 1100,
  width: 'min(22rem, calc(100vw - var(--space-xl)))',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-xs)',
  padding: 'var(--space-sm)',
  background: 'var(--color-bg-page)',
  border: '1.5px solid var(--color-border)',
  borderRadius: 4,
  boxShadow: '0 2px 12px var(--color-cast-shadow-soft)',
}

/**
 * The panel's box for a form factor, and for whether a string is open.
 *
 * On a phone the bottom-left corner is `MobileTabBar`, and out at the root the
 * panel paints over it — so it rests above the bar, by the one token that says
 * how tall the bar is (#1566).
 *
 * That strip is also where bottom-pinned controls live (the faction join bar,
 * the filter sheet's Done row, the character switcher's last row), so until a
 * string is open the phone panel is only as wide as its "edit copy" control
 * (#3136, owner ruling). `min-content` rather than `fit-content`: the armed
 * hint has to wrap under the button, not widen the panel back over the very
 * controls she is about to tap to reword. `maxWidth` keeps a long `ns:key` in
 * the pick list inside the viewport.
 *
 * Exported for `__tests__/copyEditorStacking.test.tsx`, which cannot click a
 * string open.
 */
export function panelStyle(isMobile: boolean, editing: boolean): CSSProperties {
  if (!isMobile) return PANEL
  const phone = { ...PANEL, bottom: 'calc(var(--space-md) + var(--tab-bar-clearance))' }
  return editing ? phone : { ...phone, width: 'min-content', maxWidth: PANEL.width }
}

/**
 * Escape pressed in the textarea goes no further (#3094).
 *
 * Every popup closes on Escape from a bubble-phase `keydown` listener on
 * `document` or `window`. Now that the panel can be used over an open popup,
 * Escape in the textarea would close the popup whose wording is being edited.
 * The editor itself does nothing on Escape, so nothing of its own is lost.
 *
 * Only the textarea (#3136). Clicking "edit copy" leaves focus on that button,
 * and swallowing Escape there meant the popup beneath stopped closing until
 * focus left the panel. The panel has one textarea, so the tag is the test.
 *
 * A React `onKeyDown` is enough, and that rests on where React listens: for a
 * portal it delegates from the portal's container (`document.body` here), and
 * a synthetic `stopPropagation` stops the native event there — below
 * `document` and `window`. A capture-phase listener up there would still hear
 * it; no popup uses one.
 *
 * Exported for `__tests__/copyEditorStacking.test.tsx`.
 */
export function keepEscapeInPanel(event: {
  key: string
  target: EventTarget | null
  stopPropagation: () => void
}): void {
  const inTextarea = (event.target as Partial<Element> | null)?.tagName === 'TEXTAREA'
  if (event.key === 'Escape' && inTextarea) event.stopPropagation()
}

const ROW: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-xs)',
  flexWrap: 'wrap',
}

const BUTTON: CSSProperties = {
  background: 'none',
  border: '1.5px solid var(--color-border-strong)',
  borderRadius: 2,
  cursor: 'pointer',
  padding: 'var(--space-xs) var(--space-sm)',
  color: 'var(--color-text-primary)',
}

export default function CopyEditor() {
  const { t } = useTranslation('admin')
  const panel = useRef<HTMLDivElement>(null)
  const isMobile = useFormFactor() === 'mobile'
  const [armed, setArmed] = useState(false)
  const [target, setTarget] = useState<CopyTarget | null>(null)
  const [choices, setChoices] = useState<CopyTarget[]>([])
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  /**
   * `t` for the listener, held in a ref — and this is load-bearing, not tidying.
   *
   * react-i18next v17 hands back a NEW `t` whenever the store changes, and the
   * effect below EMITS a store event. With `t` in the deps that is a loop:
   * emit → new `t` → deps differ → cleanup (which removes the listener and
   * clears the whole index) → effect re-runs → emit → "Maximum update depth
   * exceeded". `bindI18nStore: 'added'` widens it, since every `addResource` —
   * the boot load, every save — would tear the armed session down and rebuild
   * it. The deps are `[armed]` alone, so the effect runs once per arm, and the
   * emit with it.
   */
  const translate = useRef(t)
  translate.current = t

  /**
   * Open one key for editing. Reads only refs and setState, both stable for the
   * life of the component, so the effect's captured copy behaves exactly like a
   * fresh one — which is why it is safe to leave out of the deps above.
   */
  const openTarget = (found: CopyTarget) => {
    const template = currentTemplate(found)
    if (template === null) {
      // Plural keys resolve through sibling keys (`_one`, `_other`), so the key
      // the click yields holds no string of its own. Offer each form: they are
      // ordinary keys, edited and reverted one at a time.
      const forms = pluralForms(found)
      if (forms.length > 0) {
        setTarget(null)
        setChoices(forms)
        setNotice(translate.current('copyEdit.pickForm'))
        return
      }
      // Context variants (`_male`) and `<Trans>` copy stay out of reach: saving
      // to a key with no string of its own would change nothing on screen.
      setTarget(null)
      setChoices([])
      setNotice(translate.current('copyEdit.notSimpleKey', { key: `${found.ns}:${found.key}` }))
      return
    }
    setNotice(null)
    setChoices([])
    setTarget(found)
    setDraft(template)
  }

  useEffect(() => {
    if (!armed) return
    setCopyRecording(true)
    // Re-render every translated string so the index covers the page already on
    // screen, not just whatever renders after this point. Once per arm: see the
    // ref above for why that matters.
    i18n.emit('languageChanged', i18n.language)

    const onClick = (event: MouseEvent) => {
      const node = event.target as Element | null
      // Our own controls stay live; everything else is a copy target.
      if (node && panel.current?.contains(node)) return
      event.preventDefault()
      event.stopPropagation()
      const found = copyTargetsForElement(node)
      if (found.length === 0) {
        setTarget(null)
        setChoices([])
        setNotice(translate.current('copyEdit.notCopy'))
        return
      }
      if (found.length > 1) {
        // Several keys render that same wording. Guessing would reword a screen
        // she is not looking at, so she picks.
        setTarget(null)
        setChoices(found)
        setNotice(translate.current('copyEdit.pickKey'))
        return
      }
      openTarget(found[0])
    }

    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      setCopyRecording(false)
    }
  }, [armed])

  /** "for a count of 1 — " ahead of a plural form's key, nothing ahead of any other. */
  const formLabel = (key: string) => {
    const category = PLURAL_SUFFIX.exec(key)?.[1] as keyof typeof FORM_LABEL | undefined
    return category ? `${t(FORM_LABEL[category])} — ` : ''
  }

  const disarm = () => {
    setArmed(false)
    setTarget(null)
    setChoices([])
    setNotice(null)
  }

  const save = async () => {
    if (!target) return
    const template = currentTemplate(target) ?? ''
    const missing = missingPlaceholders(template, draft)
    if (missing.length > 0) {
      setNotice(t('copyEdit.missingPlaceholder', { placeholders: missing.join(' ') }))
      return
    }
    try {
      await putCopyOverride({ ns: target.ns, key: target.key, value: draft })
      i18n.addResource('en', target.ns, target.key, draft)
      setTarget(null)
      setNotice(null)
    } catch (err) {
      setNotice(extractError(err, t('copyEdit.saveError')))
    }
  }

  const revert = async () => {
    if (!target) return
    try {
      await deleteCopyOverride(target.ns, target.key)
      // Put the shipped wording back on screen, so what she sees matches what
      // the server will now serve.
      i18n.addResource('en', target.ns, target.key, shippedValue(target.ns, target.key))
      setTarget(null)
      setNotice(null)
    } catch (err) {
      setNotice(extractError(err, t('copyEdit.revertError')))
    }
  }

  // Drawn at the document root (#3094). `App.tsx` mounts this under `Layout`,
  // inside `ShellContent`'s `z-index: 5` stacking context, where the z-index
  // above is fiction and every root-level overlay paints over the panel — so a
  // click on "edit copy" hit the popup's backdrop and dismissed it. See
  // `drawAtRoot`. The armed listener is unaffected: it tests DOM containment
  // against the `panel` ref, which follows the node wherever it is drawn.
  return drawAtRoot(
    <div
      ref={panel}
      style={panelStyle(isMobile, target !== null)}
      className="font-body"
      onKeyDown={keepEscapeInPanel}
    >
      <button
        type="button"
        onClick={armed ? disarm : () => setArmed(true)}
        className="label-caption"
        style={{
          ...BUTTON,
          // This label is what sizes the idle phone panel (`panelStyle`), so it
          // must not break onto two lines to make the panel narrower still.
          whiteSpace: 'nowrap',
          borderColor: armed ? 'var(--color-accent-primary)' : 'var(--color-border-strong)',
        }}
      >
        {armed ? t('copyEdit.disarm') : t('copyEdit.arm')}
      </button>

      {armed && (
        <p className="card-meta" style={{ color: 'var(--color-accent-primary)' }}>
          {t('copyEdit.armedHint')}
        </p>
      )}

      {notice && (
        <p className="card-meta" role="status">
          {notice}
        </p>
      )}

      {choices.length > 0 && (
        <div style={{ ...ROW, flexDirection: 'column' }}>
          {choices.map((choice) => (
            <button
              key={`${choice.ns}:${choice.key}`}
              type="button"
              onClick={() => openTarget(choice)}
              style={BUTTON}
              className="card-meta"
            >
              {`${formLabel(choice.key)}${choice.ns}:${choice.key}`}
            </button>
          ))}
        </div>
      )}

      {target && (
        <>
          <p className="card-meta">{`${formLabel(target.key)}${target.ns}:${target.key}`}</p>
          <textarea
            className="font-body"
            value={draft}
            rows={4}
            onChange={(event) => setDraft(event.target.value)}
            aria-label={t('copyEdit.textareaLabel')}
            style={{
              width: '100%',
              padding: 'var(--space-xs)',
              background: 'var(--color-bg-surface-alt)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          <div style={ROW}>
            <button type="button" onClick={save} style={BUTTON} className="label-caption">
              {t('copyEdit.save')}
            </button>
            <button type="button" onClick={revert} style={BUTTON} className="label-caption">
              {t('copyEdit.revert')}
            </button>
            <button
              type="button"
              onClick={() => setTarget(null)}
              style={BUTTON}
              className="label-caption"
            >
              {t('copyEdit.cancel')}
            </button>
          </div>
        </>
      )}
    </div>,
  )
}
