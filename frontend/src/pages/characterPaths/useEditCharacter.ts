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
import { useAuth } from '../../auth/AuthContext'
import { extractError } from '../../utils/errors'
import { ALBESCENT_FACTION_SLUG } from '../../utils/factions'
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
 * The statuses already rank the way `defect_to_faction` does: `defected`
 * outranks an open letter, so a burned faction never reads `invited`; the
 * current faction reads `member`; and `na` is never invitable. `can_return` is
 * a `can_always_rejoin` faction this life left, which needs no letter.
 *
 * ALBESCENT IS THE ONE ROW THE STATUS CANNOT ANSWER FOR. No letter is ever
 * delivered for it, so it reads `not_invited` for a life that is welcome and
 * `can_return` for one that may not be; its door is the account's earned unlock
 * plus the level ceiling, which the caller resolves from `/auth/me` and passes
 * in. A slug comparison because the server's own rule is one
 * (`defect_to_faction`), not because this file decides anything by faction.
 *
 * ponytail: a FUTURE `can_always_rejoin` faction that is not Albescent would be
 * joinable without a letter while still reading `not_invited`, and is not
 * offered here. Era 1 has none. Upgrade path: a per-faction `joinable` on
 * `FactionStatusOut`, answered by the service that enforces it.
 */
export function offeredFactions(page: FactionPageOut, albescentOpen: boolean): string[] {
  return page.all_factions
    .filter(({ slug, status }) =>
      slug === ALBESCENT_FACTION_SLUG
        ? albescentOpen && status !== 'member'
        : status === 'invited' || status === 'can_return',
    )
    .map((faction) => faction.slug)
}

/** What a save wrote before it stopped, and where it stopped. */
export interface SaveOutcome {
  /** The refreshed viewer, when the faction moved — even if a later write failed. */
  moved: CurrentUser | null
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
  if (move) {
    try {
      moved = await chooseFaction(move)
    } catch (error) {
      return { moved, failed: { stage: 'faction', error } }
    }
  }
  if (avatarFile) {
    try {
      await uploadCharacterAvatar(characterId, avatarFile)
    } catch (error) {
      return { moved, failed: { stage: 'avatar', error } }
    }
  }
  try {
    await updateCharacter(characterId, fields)
  } catch (error) {
    return { moved, failed: { stage: 'fields', error } }
  }
  return { moved, failed: null }
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

  // Albescent's door, the half `GET /factions/status` cannot answer: the account
  // must have earned it, and THIS life must still be below the ceiling (#2399).
  // A non-positive bar means "no ceiling known", the same defensive read
  // `AlbescentInvitation` makes — over-permissive at worst, and the server
  // refuses at the door regardless.
  const albescentBar = user?.albescent_level_required ?? 0
  const albescentOpen =
    Boolean(user?.can_start_as_albescent) &&
    character !== null &&
    (albescentBar <= 0 || character.level < albescentBar)

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
        if (!cancelled) setOffered(offeredFactions(page, albescentOpen))
      })
      // Nothing to offer is the honest answer to "could not ask": the row falls
      // back to the link it always was.
      .catch(() => {
        if (!cancelled) setOffered([])
      })
    return () => {
      cancelled = true
    }
  }, [ownedId, savedFaction, albescentOpen])

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
    const { moved, failed } = await saveCharacter(characterId, move, avatarFile, {
      display_name: trimmedName,
      bio: bio.trim(),
      tagline: tagline.trim(),
      location: location.trim(),
    })
    // The move landed, whatever came after it: the whole app re-skins off
    // `/auth/me`, and the POST answered that object (#1383). The saved record
    // follows, so retrying a later write does not ask to defect twice.
    if (moved && move) {
      applyUser(moved)
      setCharacter({ ...character, faction_slug: move })
    }
    setConfirmingFaction(false)
    if (failed) {
      if (failed.stage === 'faction') {
        // REFUSED: the rules moved between load and save. The server's reason
        // is shown, the pick goes back to where the character still is, and
        // the refused faction stops being offered.
        setError(extractError(failed.error, 'Could not change faction.'))
        setPickedFaction(character.faction_slug)
        setOffered((slugs) => slugs.filter((slug) => slug !== move))
      } else if (failed.stage === 'avatar') {
        // Avatar upload failures are avatar-scoped, not a generic save error
        // (#985), so they surface next to the portrait rather than at the
        // bottom of the form.
        setAvatarError(extractError(failed.error, 'Could not upload avatar.'))
      } else {
        setError(extractError(failed.error, 'Could not save changes.'))
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
    if (!canSubmit) return
    // A changed faction is a DEFECTION, so Save asks first and only the
    // confirm's own button sends it (#3149). Pressing Save again — or Enter in
    // a field — while the question is up re-asks; it never answers.
    if (factionChanged) {
      setConfirmingFaction(true)
      return
    }
    await save()
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
        setPickedFaction(slug)
        setFactionTouched(true)
        setConfirmingFaction(false)
      },
      touched: factionTouched,
      confirming: confirmingFaction,
      cancelConfirm: () => setConfirmingFaction(false),
      confirm: save,
      saving,
    },
  }
}
