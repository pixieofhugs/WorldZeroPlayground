/**
 * Live @mention typeahead for the comment composer (#229).
 *
 * Reuses the existing search endpoint (`listCharacters`, backed by
 * `GET /characters?search=`) and renders below the textarea. Neutral chrome
 * (ADR-0006 keeps the thread container neutral; a transient popup is not an
 * enumerated faction surface) — per-row identity comes from `FactionAvatar`.
 *
 * The pure token helpers (`getActiveMention`, `insertMention`) are exported so
 * the fiddly detection + caret math can be unit-tested without React/network.
 */
import { useCallback, useRef, useState } from 'react'
import type React from 'react'
import { listCharacters, type CharacterOut } from '../../api/characters'
import { useAuth } from '../../auth/AuthContext'
import FactionAvatar from '../avatar/FactionAvatar'

// Token charset matches the backend MENTION_RE ([A-Za-z0-9_]).
const TOKEN_CHAR = /[A-Za-z0-9_]/
const WHITESPACE = /\s/
const DEBOUNCE_MS = 200
const RESULT_LIMIT = 8

interface ActiveMention {
  /** Text between '@' and the token end (empty for a bare '@'). */
  query: string
  /** Index of the '@'. */
  start: number
  /** Index just past the token (exclusive) — the replace range is [start, end). */
  end: number
}

/**
 * The @mention token the caret currently sits inside, or null. The '@' must be
 * at input start or preceded by whitespace, so `email@x` never triggers.
 */
export function getActiveMention(value: string, caret: number): ActiveMention | null {
  let runStart = caret
  while (runStart > 0 && TOKEN_CHAR.test(value[runStart - 1])) runStart--
  const atIndex = runStart - 1
  if (atIndex < 0 || value[atIndex] !== '@') return null
  const before = atIndex > 0 ? value[atIndex - 1] : ''
  if (before !== '' && !WHITESPACE.test(before)) return null
  let end = caret
  while (end < value.length && TOKEN_CHAR.test(value[end])) end++
  return { query: value.slice(atIndex + 1, end), start: atIndex, end }
}

/** Replace the active token with `@username ` (trailing space); return new value + caret. */
export function insertMention(
  value: string,
  active: ActiveMention,
  username: string,
): { next: string; caret: number } {
  const inserted = `@${username} `
  const next = value.slice(0, active.start) + inserted + value.slice(active.end)
  return { next, caret: active.start + inserted.length }
}

export function useMentionAutocomplete(
  value: string,
  onChange: (value: string) => void,
) {
  const { user } = useAuth()
  const selfId = user?.character?.id ?? null
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const activeRef = useRef<ActiveMention | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [results, setResults] = useState<CharacterOut[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const close = useCallback(() => {
    setOpen(false)
    setResults([])
    activeRef.current = null
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const evaluate = useCallback(
    (nextValue: string, caret: number) => {
      const active = getActiveMention(nextValue, caret)
      activeRef.current = active
      if (debounceRef.current) clearTimeout(debounceRef.current)
      // Bare '@' (no chars yet) shows nothing; fire at >=1 char.
      if (!active || active.query.length < 1) {
        setOpen(false)
        setResults([])
        return
      }
      debounceRef.current = setTimeout(() => {
        listCharacters({ search: active.query, limit: RESULT_LIMIT })
          .then((chars) => {
            const filtered = chars.filter((c) => c.id !== selfId)
            setResults(filtered)
            setHighlight(0)
            setOpen(filtered.length > 0)
          })
          .catch(() => {
            setOpen(false)
            setResults([])
          })
      }, DEBOUNCE_MS)
    },
    [selfId],
  )

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = event.target.value
      const caret = event.target.selectionStart ?? nextValue.length
      onChange(nextValue)
      evaluate(nextValue, caret)
    },
    [onChange, evaluate],
  )

  const pick = useCallback(
    (username: string) => {
      const active = activeRef.current
      if (!active) return
      const { next, caret } = insertMention(value, active, username)
      onChange(next)
      close()
      // Restore focus + caret after the controlled re-render.
      requestAnimationFrame(() => {
        const el = textareaRef.current
        if (el) {
          el.focus()
          el.setSelectionRange(caret, caret)
        }
      })
    },
    [value, onChange, close],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!open || results.length === 0) return
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setHighlight((h) => (h + 1) % results.length)
          break
        case 'ArrowUp':
          event.preventDefault()
          setHighlight((h) => (h - 1 + results.length) % results.length)
          break
        case 'Enter':
        case 'Tab':
          event.preventDefault()
          pick(results[highlight].username)
          break
        case 'Escape':
          event.preventDefault()
          close()
          break
      }
    },
    [open, results, highlight, pick, close],
  )

  const activeOptionId =
    open && results[highlight] ? `mention-option-${results[highlight].id}` : undefined

  return {
    textareaRef,
    open,
    results,
    highlight,
    activeOptionId,
    handleChange,
    handleKeyDown,
    pick,
    close,
  }
}

/** Neutral-chrome dropdown rendered below the textarea (full-width). */
export function MentionDropdown({
  results,
  highlight,
  onPick,
}: {
  results: CharacterOut[]
  highlight: number
  onPick: (username: string) => void
}) {
  return (
    <ul
      id="mention-listbox"
      role="listbox"
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        margin: 'var(--space-xs) 0 0',
        padding: 'var(--space-xs)',
        listStyle: 'none',
        background: 'var(--color-surface-scrim)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 6,
        boxShadow: 'var(--dropdown-shadow)',
        maxHeight: 240,
        overflowY: 'auto',
        zIndex: 30,
      }}
    >
      {results.map((character, index) => (
        <li
          key={character.id}
          id={`mention-option-${character.id}`}
          role="option"
          aria-selected={index === highlight}
          // preventDefault on mousedown keeps textarea focus so the click still inserts.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(character.username)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: 'var(--space-sm)',
            borderRadius: 4,
            cursor: 'pointer',
            background: index === highlight ? 'var(--color-border)' : 'transparent',
          }}
        >
          <FactionAvatar character={character} size="sm" />
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {character.display_name}
          </span>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-lg)' }}>
            @{character.username}
          </span>
        </li>
      ))}
    </ul>
  )
}
