/**
 * Copy edit mode: reword any string live, without a deploy. `App.tsx` mounts it
 * only for an admin in admin mode.
 *
 * While armed, `utils/copyRegistry.ts` records each rendered string's `ns:key`;
 * arming emits `languageChanged` so the page already on screen re-records.
 * The click listener is capture-phase on `document`: most copy sits in a link
 * or button that would navigate before a bubble listener heard it.
 *
 * Accepted limit (#3136): no keyboard reach while a `ConfirmDialog` traps Tab.
 * Strings are picked by pointer anyway.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import { deleteCopyOverride, putCopyOverride } from '../../api/copy'
import { extractError } from '../../utils/errors'
import { useFormFactor } from '../../hooks/useFormFactor'
import i18n, { lazyShipped, resources } from '../../i18n'
import { drawAtRoot } from '../ui/drawAtRoot'
import { candidatesShownIn } from './copyProbe'
import { isFactionScopedKey } from '../../utils/copyScope'
import {
  copyMatchForElement,
  missingPlaceholders,
  setCopyRecording,
  type CopyTarget,
} from '../../utils/copyRegistry'

/**
 * The shipped value, from the imported JSON. Pristine only because `i18n.ts`
 * hands the store a clone; reading the mutated store would make Revert a no-op.
 * Exported for `copyOverrides.test.ts`.
 */
export function shippedValue(ns: string, key: string): string {
  const table: unknown = (resources.en as Record<string, unknown>)[ns] ?? lazyShipped[ns]
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
  zero: 'copyEdit.formFor.zero',
  one: 'copyEdit.formFor.one',
  two: 'copyEdit.formFor.two',
  few: 'copyEdit.formFor.few',
  many: 'copyEdit.formFor.many',
  other: 'copyEdit.formFor.other',
} as const

/**
 * Plural forms of a bare key the click yielded (#3165); each form is its own
 * override target. Empty for e.g. a context variant. Exported for the test.
 */
export function pluralForms(target: CopyTarget): CopyTarget[] {
  return ['zero', 'one', 'two', 'few', 'many', 'other']
    .map((category) => ({ ns: target.ns, key: `${target.key}_${category}` }))
    .filter((form) => currentTemplate(form) !== null)
}

/** What Save does: store the override, then show it. Exported for the test. */
export async function saveCopy(target: CopyTarget, value: string): Promise<void> {
  const saved = await putCopyOverride({ ns: target.ns, key: target.key, value })
  // The server trims; show what it stored, not the draft.
  i18n.addResource('en', target.ns, target.key, saved.value)
}

/** What Revert does: drop the override, then show the shipped wording again. */
export async function revertCopy(target: CopyTarget): Promise<void> {
  await deleteCopyOverride(target.ns, target.key)
  i18n.addResource('en', target.ns, target.key, shippedValue(target.ns, target.key))
}

const PANEL: CSSProperties = {
  position: 'fixed',
  bottom: 'var(--space-md)',
  left: 'var(--space-md)',
  // Above every overlay (#3094), so a popup's wording is editable while it is
  // open. `copyEditorStacking.test.tsx` enforces it.
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
 * The panel's box. On a phone it rests above `MobileTabBar` (#1566), and until
 * a string is open it hugs its control so bottom-pinned controls stay tappable
 * (#3136). `min-content` so the armed hint wraps instead of widening the panel.
 * Exported for `copyEditorStacking.test.tsx`.
 */
export function panelStyle(isMobile: boolean, editing: boolean): CSSProperties {
  if (!isMobile) return editing ? { ...PANEL, width: EDITING_WIDTH } : PANEL
  const phone = { ...PANEL, bottom: 'calc(var(--space-md) + var(--tab-bar-clearance))' }
  return editing ? phone : { ...phone, width: 'min-content', maxWidth: PANEL.width }
}

/**
 * While a string is open, Escape stays in the panel so it does not close the
 * popup being edited (#3094, #3245). Popups listen bubble-phase on
 * `document`/`window`; React delegates a portal's events from `document.body`,
 * so a synthetic `stopPropagation` stops it short of them.
 * Exported for `copyEditorStacking.test.tsx`.
 */
export function keepEscapeInPanel(
  event: { key: string; stopPropagation: () => void },
  stringOpen: boolean,
): void {
  if (event.key === 'Escape' && stringOpen) event.stopPropagation()
}

/** Room for a multi-paragraph description on desktop, so spellcheck marks can be seen. */
const EDITING_WIDTH = 'min(40rem, calc(100vw - var(--space-xl)))'

/** Narrower than this and a box over the spot is a sliver; the panel's textarea is kinder. */
const MIN_SPOT_WIDTH = 40

/** The spot's own typography, so the box reads as the text itself. No `text-transform`: it shows what is stored. */
function spotLook(el: Element): CSSProperties {
  const cs = getComputedStyle(el)
  return {
    font: cs.font,
    letterSpacing: cs.letterSpacing,
    color: cs.color,
    textAlign: cs.textAlign as CSSProperties['textAlign'],
    whiteSpace: cs.whiteSpace === 'nowrap' ? 'pre-wrap' : cs.whiteSpace,
    padding: cs.padding,
  }
}

/** The spot's viewport box, kept current on scroll and resize; null once it is off screen or too narrow. */
function useSpotRect(spot: Element | null): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useLayoutEffect(() => {
    if (!spot) return setRect(null)
    const measure = () => {
      const r = spot.getBoundingClientRect()
      const seen = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth
      setRect(seen && r.width >= MIN_SPOT_WIDTH ? r : null)
    }
    measure()
    addEventListener('scroll', measure, true)
    addEventListener('resize', measure)
    return () => {
      removeEventListener('scroll', measure, true)
      removeEventListener('resize', measure)
    }
  }, [spot])
  return rect
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
  /** The clicked element, set only for a direct open: the choosers keep the panel textarea. */
  const [spot, setSpot] = useState<HTMLElement | null>(null)
  const spotRect = useSpotRect(isMobile ? null : spot)
  const look = useMemo(() => (spot ? spotLook(spot) : {}), [spot])
  const lastSpot = useRef<HTMLElement | null>(null)
  if (spot) lastSpot.current = spot
  useEffect(() => {
    if (target) return
    setSpot(null)
    lastSpot.current?.focus({ preventScroll: true })
    lastSpot.current = null
  }, [target])
  const box = useRef<HTMLTextAreaElement>(null)
  const placed = spotRect !== null
  // Not `autoFocus`: the box mounts before `useSpotRect` has measured, and autoFocus only fires on mount.
  useEffect(() => {
    if (placed && target) box.current?.focus()
  }, [placed, target])

  /**
   * `t` in a ref, load-bearing: react-i18next hands back a new `t` on every store
   * change and the effect below emits one, so `t` in its deps loops ("Maximum
   * update depth exceeded"). Deps stay `[armed]`.
   */
  const translate = useRef(t)
  translate.current = t

  /** For the click listener, which closes over the first render: a stray click must not discard a draft. */
  const unsaved = useRef(false)
  unsaved.current = target !== null && draft !== currentTemplate(target)

  /** Reads only refs and setState, so it is safe to leave out of the effect's deps. */
  const openTarget = (found: CopyTarget, el: HTMLElement | null = null) => {
    setSpot(el)
    const template = currentTemplate(found)
    if (template === null) {
      // A plural key holds no string itself; offer each form.
      const forms = pluralForms(found)
      if (forms.length > 0) {
        setTarget(null)
        setChoices(forms)
        setNotice(translate.current('copyEdit.pickForm'))
        return
      }
      // Context variants and `<Trans>` copy: saving would change nothing on screen.
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
    // Re-record the page already on screen. Once per arm (see the ref above).
    i18n.emit('languageChanged', i18n.language)

    const onClick = (event: MouseEvent) => {
      const node = event.target as Element | null
      if (node && panel.current?.contains(node)) return
      event.preventDefault()
      event.stopPropagation()
      if (unsaved.current) {
        setNotice(translate.current('copyEdit.unsaved'))
        return
      }
      const match = copyMatchForElement(node)
      const found =
        match && match.targets.length > 1
          ? candidatesShownIn(match.el, match.targets)
          : (match?.targets ?? [])
      if (found.length === 0) {
        setTarget(null)
        setChoices([])
        setNotice(translate.current('copyEdit.notCopy'))
        return
      }
      if (found.length > 1) {
        // Several keys render that wording; guessing could reword another screen.
        setTarget(null)
        setChoices(found)
        setNotice(translate.current('copyEdit.pickKey'))
        return
      }
      openTarget(found[0], match?.el instanceof HTMLElement ? match.el : null)
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
      await saveCopy(target, draft)
      setTarget(null)
      setNotice(null)
    } catch (err) {
      setNotice(extractError(err, t('copyEdit.saveError')))
    }
  }

  const revert = async () => {
    if (!target) return
    try {
      await revertCopy(target)
      setTarget(null)
      setNotice(null)
    } catch (err) {
      setNotice(extractError(err, t('copyEdit.revertError')))
    }
  }

  // Drawn at the root (#3094): under `Layout` it would sit in `ShellContent`'s
  // stacking context, below every overlay. See `drawAtRoot`.
  return drawAtRoot(
    <div
      ref={panel}
      data-modal-free
      style={panelStyle(isMobile, target !== null)}
      className="font-body"
      onKeyDown={(event) => keepEscapeInPanel(event, target !== null)}
    >
      <button
        type="button"
        onClick={armed ? disarm : () => setArmed(true)}
        className="label-caption"
        style={{
          ...BUTTON,
          // This label sizes the idle phone panel (`panelStyle`).
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
          <p className="card-meta">
            {isFactionScopedKey(target) ? t('copyEdit.scopeFaction') : t('copyEdit.scopeShared')}
          </p>
          <textarea
            className="font-body"
            value={draft}
            ref={box}
            // Firefox lacks field-sizing: one row per line, or a multi-paragraph template is a one-line box.
            rows={spotRect ? draft.split('\n').length : 4}
            spellCheck
            onChange={(event) => setDraft(event.target.value)}
            aria-label={t('copyEdit.textareaLabel')}
            style={
              spotRect
                ? {
                    ...look,
                    position: 'fixed',
                    top: spotRect.top,
                    left: spotRect.left,
                    minWidth: spotRect.width,
                    maxWidth: `calc(100vw - ${spotRect.left}px)`,
                    background: 'var(--color-bg-page)',
                    border: 0,
                    outline: '1px dashed var(--color-accent-primary)',
                    resize: 'none',
                    fieldSizing: 'content',
                    boxSizing: 'border-box',
                  }
                : {
                    width: '100%',
                    padding: 'var(--space-xs)',
                    background: 'var(--color-bg-surface-alt)',
                    border: '1.5px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    // Grows to its text (no Firefox yet: it keeps rows=4 and a resize handle).
                    fieldSizing: 'content',
                    minHeight: '4lh',
                    maxHeight: '50vh',
                  }
            }
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
              onClick={() => {
                setTarget(null)
                setNotice(null)
              }}
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
