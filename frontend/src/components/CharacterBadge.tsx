import { Link } from 'react-router-dom'
import type { CharacterOut } from '../api/auth'
import { mediaUrl } from '../utils/media'

interface Props {
  character: CharacterOut
  size?: 'sm' | 'md'
}

export default function CharacterBadge({ character, size = 'md' }: Props) {
  const isSmall = size === 'sm'
  return (
    <Link
      to={`/characters/${character.id}`}
      className="inline-flex items-center gap-2 hover:underline"
    >
      {character.avatar_url ? (
        <img
          src={mediaUrl(character.avatar_url)}
          alt={character.username}
          className={`rounded-full border-2 border-border object-cover ${isSmall ? 'w-6 h-6' : 'w-8 h-8'}`}
        />
      ) : (
        <span
          className={`rounded-full border-2 border-border bg-paper flex items-center justify-center font-display font-bold text-ink ${
            isSmall ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'
          }`}
        >
          {character.username[0]?.toUpperCase()}
        </span>
      )}
      <span className={`font-body text-ink ${isSmall ? 'text-xs' : 'text-sm'}`}>
        {character.username}
      </span>
    </Link>
  )
}
