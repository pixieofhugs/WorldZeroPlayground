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
 * Shared read/write model for Edit Character, lifted out of EditCharacter so the
 * desktop screen and the mobile skin (#516) share one persist path. The three
 * editable fields (display_name, bio, location), the avatar upload, the faction
 * move (#3149), delete, and validation live here; skins are presentation-only.
 * `@handle` is the auto-derived unique username (ADR-0019) — read-only, never an
 * input.
 *
 * Avatar pick/crop/preview/validate is delegated to {@link useAvatarPicker}, the
 * single source shared with create so the preview can't drift away again (#985).
 */

/**
 * The factions the server would accept a move to for THIS character (#3149) —
 * the picker offers these and nothing else.
 *
 * Read off `GET /factions/status`, which is computed for the ACTIVE character.
 * That is the edited one whenever this matters: `isOwner` below is "the edited
 * life is the carried life", and nothing is offered otherwise. It is NOT Create
 * Character's list — that one is per-account ("may a new life be born here").
 *
 * `joinable` is the server's own answer (#3168): the same predicate
 * `defect_to_faction` enforces, letters, burned bridges and Albescent's two
 * locks included. This file decides nothing by faction.
 */
export function offeredFactions(page: FactionPageOut): string[] {
  return page.all_factions.filter(({ joinable }) => joinable).map(({ slug }) => slug)
}

/** What a save wrote before it stopped, and where it stopped. */
export interface SaveOutcome {
  /** The refreshed viewer, when the faction moved — even if a later write failed. */
  moved: CurrentUser | null
  /** The server says the character is ALREADY in the faction: the move landed on an earlier try. */
  already?: true
  failed: { stage: 'faction' | 'avatar' | 'fields'; error: unknown } | null
}

/**
 * The writes of one save, in order: the faction move, the portrait, the fields.
 *
 * THE MOVE GOES FIRST (#3149). It is the one write the server may refuse for a
 * reason the form could not have known — a letter withdrawn, a bridge burned
 * between load and save — and a refusal has to change NOTHING. Sent last it
 * would leave a new name under the old faction and a confirm that had already
 * been answered. `move` is null for an ordinary save, which then never touches
 * the join endpoint at all.
 *
 * Lifted out of the hook because this harness has no DOM: an order of writes
 * inlined in `handleSubmit` is an order no test can hold.
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
      // A retry after a move that landed (the answer was lost): not a refusal,
      // so carry on with the rest of the save.
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
 * Did the server REFUSE this move, as opposed to never answering it? Only the
 * statuses `defect_to_faction` raises count: a refusal is final, so the faction
 * stops being offered. A timeout, an offline tab or a 5xx says nothing about
 * the rules, and the option has to stay for the retry.
 */
export function isRefusedMove(error: unknown): boolean {
  return (
    error instanceof ApiError && [403, 404, 422].includes(error.status) && !isAlreadyMember(error)
  )
}

/** `faction_already_member` is a 422, but it says the move HAPPENED, not that it was refused. */
function isAlreadyMember(error: unknown): boolean {
  return extractErrorCode(error) === ErrorCode.factionAlreadyMember
}

/**
 * What pressing Save does (#3149): a changed faction is a DEFECTION, so Save
 * asks first and only the confirm's own button sends it. Lifted out of
 * `handleSubmit` so the gate can be pinned without a DOM.
 */
export function submitAction(canSubmit: boolean, factionChanged: boolean): 'ignore' | 'confirm' | 'save' {
  if (!canSubmit) return 'ignore'
  return factionChanged ? 'confirm' : 'save'
}

const SAVE_FALLBACK = {
  faction: 'Could not change faction.',
  avatar: 'Could not upload avatar.',
  fields: 'Could not save changes.',
}

/**
 * What the player is told about a save that stopped. A defection cannot be
 * undone, so when the move landed and a later write did not, the message says
 * so first — the bare reason would read as "nothing was saved".
 */
export function saveFailureMessage({ moved, failed }: SaveOutcome): string {
  if (!failed) return ''
  const reason = extractError(failed.error, SAVE_FALLBACK[failed.stage])
  return moved ? i18n.t('forms:editCharacter.factionMovedRestFailed', { reason }) : reason
}

/**
 * The faction row's model (#3149). Lives in the hook rather than in the slot
 * because a pick RE-DRESSES the page — the dispatcher mounts a different
 * archetype — and state local to the row would be thrown away by its own
 * effect.
 */
export interface FactionPicker {
  /** The faction the character is in, as saved. */
  current: string
  /** The faction it will be in after Save. Equal to `current` until a pick. */
  picked: string
  /** {@link offeredFactions}. Empty means the row is a link, as it always was. */
  offered: string[]
  pick: (slug: string) => void
  /**
   * True once a pick has been made. The re-dress remounts the row, which drops
   * keyboard focus on the floor; the row uses this to put it back on the
   * selected option, and never grabs focus on arrival.
   */
  touched: boolean
  /** Save was pressed with a changed faction, and the question is on the page. */
  confirming: boolean
  cancelConfirm: () => void
  /** The confirm's affirmative — the only thing that sends a move. */
  confirm: () => Promise<void>
  saving: boolean
}

export interface EditCharacterState {
  id: string | undefined
  /**
   * The life being edited, WEARING THE PICKED FACTION (#3149). Every archetype
   * dresses off `character.faction_slug` — the dispatcher, the credential card,
   * the alarm ink — so this is the one place a pick has to land for the whole
   * page to follow it, as Create Character's does. The faction it is actually
   * in is {@link FactionPicker.current}.
   */
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
  /** Set the avatar-scoped error — the crop modal reports failures here (#1527). */
  setAvatarError: (message: string) => void
  handleAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleAvatarConfirm: (blob: Blob) => void
  saving: boolean
  /** False while the name is blank or a save is in flight — see {@link canSubmitName}. */
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
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [pickedFaction, setPickedFaction] = useState('')
  const [offered, setOffered] = useState<string[]>([])
  const [factionTouched, setFactionTouched] = useState(false)
  const [confirmingFaction, setConfirmingFaction] = useState(false)

  // Avatar pick/crop/preview/validate — shared with create (#985).
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
        setLocation(c.location || '')
      })
      .catch((err) => setError(extractError(err, 'Could not load character.')))
      .finally(() => setLoading(false))
  }, [id])

  // Only allow editing your own character
  const isOwner = user?.character?.id === character?.id

  // Asked only for a life this viewer may edit, and again whenever its saved
  // faction moves — a move that landed before a later write failed changes what
  // is on offer.
  const ownedId = isOwner ? character?.id : undefined
  const savedFaction = character?.faction_slug
  useEffect(() => {
    if (!ownedId) return
    let cancelled = false
    getFactionStatus()
      .then((page) => {
        if (!cancelled) setOffered(offeredFactions(page))
      })
      // Nothing to offer is the honest answer to "could not ask": the row falls
      // back to the link it always was.
      .catch(() => {
        if (!cancelled) setOffered([])
      })
    return () => {
      cancelled = true
    }
  }, [ownedId, savedFaction])

  // The same gate create has carried all along (#1697) — a blank name is a 422
  // whose Pydantic prose has never seen the i18n catalogue, so the control that
  // would spend the request is closed instead.
  const trimmedName = displayName.trim()
  const canSubmit = canSubmitName(displayName, saving)

  const factionChanged = character !== null && pickedFaction !== character.faction_slug

  const save = async () => {
    if (!id || !character || !canSubmit) return
    setSaving(true)
    setError('')
    const characterId = parseInt(id, 10)
    const move = factionChanged ? pickedFaction : null
    // Every editable field is sent unconditionally, empty or not. `|| undefined`
    // omits the key, and an omitted key is "leave it alone" server-side
    // (`exclude_unset=True`), so a field sent that way can be set but never
    // cleared — #1644, which is how a player emptied a bio, saved, and got the
    // old one back. Emptying these three is a state the player is entitled to,
    // so "" has to reach the server as "". `exclude_unset` stays: it is what
    // makes a partial update partial for callers that genuinely send a subset.
    const outcome = await saveCharacter(characterId, move, avatarFile, {
      display_name: trimmedName,
      bio: bio.trim(),
      tagline: tagline.trim(),
      location: location.trim(),
    })
    const { moved, failed } = outcome
    // The move landed, whatever came after it: the whole app re-skins off
    // `/auth/me`, and the POST answered that object (#1383). The saved record
    // follows, so retrying a later write does not ask to defect twice.
    if (move && (moved || outcome.already)) {
      // `already` has no viewer to adopt; a clean save refetches below.
      if (moved) applyUser(moved)
      setCharacter({ ...character, faction_slug: move })
    }
    setConfirmingFaction(false)
    if (failed) {
      const message = saveFailureMessage(outcome)
      if (failed.stage === 'avatar' && !moved) {
        // Avatar upload failures are avatar-scoped, not a generic save error
        // (#985), so they surface next to the portrait rather than at the
        // bottom of the form — unless the faction already moved, which is the
        // banner's to say.
        setAvatarError(message)
      } else {
        setError(message)
      }
      if (failed.stage === 'faction' && isRefusedMove(failed.error)) {
        // REFUSED: the rules moved between load and save. The pick goes back
        // to where the character still is and the refused faction stops being
        // offered. `touched` is cleared so the re-dress this causes does not
        // pull focus onto an option and away from the banner saying why. Any
        // other failure is transient: the pick and the option stay for a retry.
        setPickedFaction(character.faction_slug)
        setOffered((slugs) => slugs.filter((slug) => slug !== move))
        setFactionTouched(false)
      }
      setSaving(false)
      return
    }
    // The edited life may BE the carried one, whose name/bio/avatar the rail
    // and every byline draw from `/auth/me`. The saved record is a
    // CharacterOut, not a CurrentUser, so it cannot be adopted wholesale
    // (#1349 ledger).
    await refetch()
    setSaving(false)
    navigate(`/characters/${characterId}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Pressing Save again — or Enter in a field — while the question is up
    // re-asks; it never answers.
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
      // A confirm that cannot act is not offered: emptying the name while the
      // question is up takes it down. `saving` keeps it up as the busy state.
      confirming: confirmingFaction && (saving || canSubmit),
      cancelConfirm: () => setConfirmingFaction(false),
      confirm: save,
      saving,
    },
  }
}
