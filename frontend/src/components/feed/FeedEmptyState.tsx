import i18n from '../../i18n'

/**
 * The feed's two empty states (§2a), deliberately distinct: an empty feed
 * invites you out; an empty archive says you've dismissed nothing.
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
