import i18n from '../../i18n'

/**
 * The feed's two empty states (Unaffiliated sheet §2a), which are NOT the same
 * message and are never collapsed into one:
 *
 *   feed    "Nothing left to read." / "The city is quiet. Go do something."
 *   archive "The archive is empty."  / "Dismissed updates rest here"
 *
 * They say different things. An empty feed is an invitation to go and do
 * something; an empty archive is a statement that you have thrown nothing away.
 * The single message this replaced ("No updates yet…") was neither, and in the
 * Archived tab it would have been actively wrong.
 */
export default function FeedEmptyState({ archivedView }: { archivedView: boolean }) {
  return (
    <div className="sidebar-card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
      <p
        className="font-body"
        style={{
          margin: 0,
          fontSize: 'var(--text-content)',
          fontWeight: 700,
          color: 'var(--color-text-secondary)',
        }}
      >
        {i18n.t(archivedView ? 'feed:archive.emptyTitle' : 'feed:archive.feedEmptyTitle')}
      </p>
      <p
        className="font-body"
        style={{
          margin: 0,
          marginTop: 'var(--space-xs)',
          fontSize: 'var(--text-content)',
          color: 'var(--color-text-tertiary)',
        }}
      >
        {i18n.t(archivedView ? 'feed:archive.emptyBody' : 'feed:archive.feedEmptyBody')}
      </p>
    </div>
  )
}
