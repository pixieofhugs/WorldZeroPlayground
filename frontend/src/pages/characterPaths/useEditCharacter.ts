import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getCharacter,
  updateCharacter,
  uploadCharacterAvatar,
  deleteCharacter,
  type CharacterOut,
  type CharacterUpdate,
} from '../../api/characters'
import type { CurrentUser } from '../../api/auth'
import { chooseFaction, getFactionStatus, type FactionPageOut } from '../../api/factions'
import { ApiError } from '../../api/apiError'
import { useAuth } from '../../auth/AuthContext'
import i18n from '../../i18n'
import { ErrorCode, extractError, extractErrorCode } from '../../utils/errors'
import { useAvatarPicker } from './useAvatarPicker'
import { canSubmitName } from './useCreateCharacter'

/**
 * Edit Character state for every skin: fields, avatar ({@link useAvatarPicker},
 * #985), faction move (#3149), delete. `@handle` is read-only (ADR-0019).
 */

/**
 * Factions the server would accept a move to (#3149). `GET /factions/status` is
 * for the ACTIVE character, which is the edited one whenever `isOwner`. `joinable`
 * is the server's `defect_to_faction` predicate (#3168); nothing is decided here.
 */
export function offeredFactions(page: FactionPageOut): string[] {
  return page.all_factions.filter(({ joinable }) => joinable).map(({ slug }) => slug)
}

export interface SaveOutcome {
  /** Set when the faction moved, even if a later write failed. */
  moved: CurrentUser | null
  /** The move had already landed on an earlier try. */
  already?: true
  failed: { stage: 'faction' | 'avatar' | 'fields'; error: unknown } | null
}

/**
 * One save's writes, in order: faction move, portrait, fields. The move goes
 * FIRST (#3149): the server may refuse it, and a refusal must change nothing.
 * Outside the hook so the order is testable without a DOM.
 */
export async function saveCharacter(
  characterId: number,
  move: string | null,
  avatarFile: File | null,
  fields: CharacterUpdate,
): Promise<SaveOutcome> {
  let moved: CurrentUser | null = null
  let already: { already?: true } = {}
  if (move) {
    try {
      moved = await chooseFaction(move)
    } catch (error) {
      // Already a member: a lost answer from an earlier try. Carry on.
      if (!isAlreadyMember(error)) return { moved, failed: { stage: 'faction', error } }
      already = { already: true }
    }
  }
  if (avatarFile) {
    try {
      await uploadCharacterAvatar(characterId, avatarFile)
    } catch (error) {
      return { moved, ...already, failed: { stage: 'avatar', error } }
    }
  }
  try {
    await updateCharacter(characterId, fields)
  } catch (error) {
    return { moved, ...already, failed: { stage: 'fields', error } }
  }
  return { moved, ...already, failed: null }
}

/**
 * A final refusal (the statuses `defect_to_faction` raises), as opposed to a
 * timeout/offline/5xx, where the option must stay for a retry.
 */
export function isRefusedMove(error: unknown): boolean {
  return (
    error instanceof ApiError && [403, 404, 422].includes(error.status) && !isAlreadyMember(error)
  )
}

/** A 422 that means the move happened. */
function isAlreadyMember(error: unknown): boolean {
  return extractErrorCode(error) === ErrorCode.factionAlreadyMember
}

/** A changed faction is a defection: Save asks first; only the confirm sends it (#3149). */
export function submitAction(canSubmit: boolean, factionChanged: boolean): 'ignore' | 'confirm' | 'save' {
  if (!canSubmit) return 'ignore'
  return factionChanged ? 'confirm' : 'save'
}

const SAVE_FALLBACK = {
  faction: 'Could not change faction.',
  avatar: 'Could not upload avatar.',
  fields: 'Could not save changes.',
}

/** A 422 on `location` (#2798), keyed off `loc`, never the English `msg`. */
function isLocationRejected(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 422) return false
  const detail = (error.data as { detail?: unknown } | undefined)?.detail
  return (
    Array.isArray(detail) &&
    detail.some((d) => Array.isArray(d?.loc) && d.loc[d.loc.length - 1] === 'location')
  )
}

/** If the move landed but a later write failed, say so: a bare reason reads as "nothing saved". */
export function saveFailureMessage({ moved, failed }: SaveOutcome): string {
  if (!failed) return ''
  const reason = isLocationRejected(failed.error)
    ? i18n.t('forms:editCharacter.locationInvalid')
    : extractError(failed.error, SAVE_FALLBACK[failed.stage])
  return moved ? i18n.t('forms:editCharacter.factionMovedRestFailed', { reason }) : reason
}

/** Faction row model (#3149). In the hook because a pick mounts a different
 * archetype, which would discard row-local state. */
export interface FactionPicker {
  /** As saved. */
  current: string
  /** After Save; equals `current` until a pick. */
  picked: string
  /** Empty means the row is a link. */
  offered: string[]
  pick: (slug: string) => void
  /** A pick was made: the remounted row restores focus (never on arrival). */
  touched: boolean
  confirming: boolean
  cancelConfirm: () => void
  /** The only thing that sends a move. */
  confirm: () => Promise<void>
  saving: boolean
}

export interface EditCharacterState {
  id: string | undefined
  /** Wears the PICKED faction so the whole page re-dresses (#3149); the saved
   * one is {@link FactionPicker.current}. */
  character: CharacterOut | null
  loading: boolean
  isOwner: boolean
  displayName: string
  setDisplayName: (value: string) => void
  bio: string
  setBio: (value: string) => void
  tagline: string
  setTagline: (value: string) => void
  location: string
  setLocation: (value: string) => void
  avatarFile: File | null
  avatarSource: File | null
  setAvatarSource: (file: File | null) => void
  avatarPreview: string | null
  avatarError: string
  /** The crop modal reports failures here (#1527). */
  setAvatarError: (message: string) => void
  handleAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleAvatarConfirm: (blob: Blob) => void
  saving: boolean
  /** See {@link canSubmitName}. */
  canSubmit: boolean
  error: string
  handleSubmit: (event: React.FormEvent) => void | Promise<void>
  deleting: boolean
  handleDelete: () => void | Promise<void>
  faction: FactionPicker
}

export function useEditCharacter(): EditCharacterState {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, refetch, applyUser } = useAuth()
  const [character, setCharacter] = useState<CharacterOut | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [tagline, setTagline] = useState('')
  const [location, setLocationRaw] = useState('')
  // Uppercased as typed (#2798).
  const setLocation = (value: string) => setLocationRaw(value.toUpperCase())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [pickedFaction, setPickedFaction] = useState('')
  const [offered, setOffered] = useState<string[]>([])
  const [factionTouched, setFactionTouched] = useState(false)
  const [confirmingFaction, setConfirmingFaction] = useState(false)

  const {
    avatarFile,
    avatarSource,
    setAvatarSource,
    avatarPreview,
    avatarError,
    setAvatarError,
    handleAvatarChange,
    handleAvatarConfirm,
  } = useAvatarPicker()

  useEffect(() => {
    if (!id) return
    getCharacter(parseInt(id, 10))
      .then((c) => {
        setCharacter(c)
        setPickedFaction(c.faction_slug)
        setDisplayName(c.display_name)
        setBio(c.bio || '')
        setTagline(c.tagline || '')
        setLocationRaw(c.location || '')
      })
      .catch((err) => setError(extractError(err, 'Could not load character.')))
      .finally(() => setLoading(false))
  }, [id])

  const isOwner = user?.character?.id === character?.id

  // Re-asked when the saved faction moves (a partial save changes the offer).
  const ownedId = isOwner ? character?.id : undefined
  const savedFaction = character?.faction_slug
  useEffect(() => {
    if (!ownedId) return
    let cancelled = false
    getFactionStatus()
      .then((page) => {
        if (!cancelled) setOffered(offeredFactions(page))
      })
      // Could not ask: offer nothing; the row is a link.
      .catch(() => {
        if (!cancelled) setOffered([])
      })
    return () => {
      cancelled = true
    }
  }, [ownedId, savedFaction])

  // Create's gate (#1697).
  const trimmedName = displayName.trim()
  const canSubmit = canSubmitName(displayName, saving)

  const factionChanged = character !== null && pickedFaction !== character.faction_slug

  const save = async () => {
    if (!id || !character || !canSubmit) return
    setSaving(true)
    setError('')
    const characterId = parseInt(id, 10)
    const move = factionChanged ? pickedFaction : null
    // Send every field, empty or not: an omitted key is "leave alone" server-side
    // (`exclude_unset`), so `|| undefined` could never clear a field (#1644).
    const outcome = await saveCharacter(characterId, move, avatarFile, {
      display_name: trimmedName,
      bio: bio.trim(),
      tagline: tagline.trim(),
      location: location.trim(),
    })
    const { moved, failed } = outcome
    // The move landed: adopt the viewer (#1383) and the saved record, so a retry
    // doesn't ask to defect twice.
    if (move && (moved || outcome.already)) {
      // `already` has no viewer to adopt; a clean save refetches below.
      if (moved) applyUser(moved)
      setCharacter({ ...character, faction_slug: move })
    }
    setConfirmingFaction(false)
    if (failed) {
      const message = saveFailureMessage(outcome)
      if (failed.stage === 'avatar' && !moved) {
        // Avatar-scoped (#985), unless the faction moved — that's the banner's.
        setAvatarError(message)
      } else {
        setError(message)
      }
      if (failed.stage === 'faction' && isRefusedMove(failed.error)) {
        // Refused: revert the pick, drop the option, and clear `touched` so the
        // re-dress doesn't pull focus from the banner. Transient failures keep both.
        setPickedFaction(character.faction_slug)
        setOffered((slugs) => slugs.filter((slug) => slug !== move))
        setFactionTouched(false)
      }
      setSaving(false)
      return
    }
    // The edited life may be the carried one; a CharacterOut can't be adopted
    // as a CurrentUser (#1349 ledger).
    await refetch()
    setSaving(false)
    navigate(`/characters/${characterId}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Save/Enter while the question is up re-asks; it never answers.
    const action = submitAction(canSubmit, factionChanged)
    if (action === 'confirm') setConfirmingFaction(true)
    else if (action === 'save') await save()
  }

  const handleDelete = async () => {
    if (!id || !character) return
    setDeleting(true)
    setError('')
    try {
      await deleteCharacter(parseInt(id, 10))
      await refetch() // server re-resolves the active life (or none)
      navigate('/')
    } catch (err) {
      setError(extractError(err, 'Could not delete character.'))
      setDeleting(false)
    }
  }

  return {
    id,
    character: character && { ...character, faction_slug: pickedFaction },
    loading,
    isOwner,
    displayName,
    setDisplayName,
    bio,
    setBio,
    tagline,
    setTagline,
    location,
    setLocation,
    avatarFile,
    avatarSource,
    setAvatarSource,
    avatarPreview,
    avatarError,
    setAvatarError,
    handleAvatarChange,
    handleAvatarConfirm,
    saving,
    canSubmit,
    error,
    handleSubmit,
    deleting,
    handleDelete,
    faction: {
      current: character?.faction_slug ?? '',
      picked: pickedFaction,
      offered,
      pick: (slug) => {
        if (saving) return
        setPickedFaction(slug)
        setFactionTouched(true)
        setConfirmingFaction(false)
      },
      touched: factionTouched,
      // Emptying the name takes the confirm down; `saving` keeps it up as busy.
      confirming: confirmingFaction && (saving || canSubmit),
      cancelConfirm: () => setConfirmingFaction(false),
      confirm: save,
      saving,
    },
  }
}
