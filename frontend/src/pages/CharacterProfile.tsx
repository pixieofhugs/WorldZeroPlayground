import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getCharacter, type CharacterOut } from '../api/characters'
import { listSubmissions, type SubmissionOut } from '../api/submissions'
import SubmissionCard from '../components/SubmissionCard'
import { extractError } from '../utils/errors'
import { mediaUrl } from '../utils/media'

export default function CharacterProfile() {
  const { id } = useParams<{ id: string }>()
  const [character, setCharacter] = useState<CharacterOut | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionOut[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const cid = parseInt(id, 10)
    Promise.all([getCharacter(cid), listSubmissions({ character_id: cid })])
      .then(([c, s]) => { setCharacter(c); setSubmissions(s) })
      .catch((err) => setFetchError(extractError(err, "Couldn't load this character.")))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="page font-body text-muted">Loading...</div>
  if (fetchError) return (
    <div className="page">
      <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
        {fetchError}{' '}
        <button onClick={() => window.location.reload()} className="underline">Try refreshing.</button>
      </p>
    </div>
  )
  if (!character) return <div className="page font-body text-muted">Character not found.</div>

  return (
    <div className="page">
      <div className="card p-6 mb-6 flex gap-5 items-start">
        {character.avatar_url ? (
          <img
            src={mediaUrl(character.avatar_url)}
            alt={character.username}
            className="w-20 h-20 rounded-full border-2 border-border shadow-sketch-sm object-cover shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full border-2 border-border shadow-sketch-sm bg-paper flex items-center justify-center font-display text-3xl font-bold shrink-0">
            {character.username[0]?.toUpperCase()}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold">{character.display_name}</h1>
          <p className="font-body text-sm text-muted">@{character.username}</p>
          {character.bio && (
            <p className="font-body text-sm text-ink mt-2 leading-relaxed">{character.bio}</p>
          )}
          <div className="flex gap-4 mt-3 font-body text-xs text-muted">
            <span>Level <strong className="text-ink">{character.level}</strong></span>
            <span>Score <strong className="text-ink">{character.score}</strong></span>
            <span>All-time <strong className="text-ink">{character.all_time_score}</strong></span>
            {character.faction_slug && (
              <span>Faction <strong className="text-ink">{character.faction_slug}</strong></span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-3 mb-4 border-b-2 border-border pb-2">
        <h2 className="font-display text-2xl font-bold">Praxis</h2>
        <span className="font-body text-sm text-muted">{submissions.length}</span>
      </div>

      {submissions.length === 0 ? (
        <p className="font-body text-muted">No submissions yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {submissions.map((s) => <SubmissionCard key={s.id} submission={s} />)}
        </div>
      )}
    </div>
  )
}
