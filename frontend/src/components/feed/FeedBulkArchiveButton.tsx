import i18n from '../../i18n'

/**
 * `Archive all` and `Restore all` (Unaffiliated sheet §2a).
 *
 * Deliberately two different WEIGHTS, because the sheet draws them that way and
 * they are not the same kind of act. Archiving is the thing the header offers, so
 * it is a pill. Restoring everything undoes work the player chose to do, so it is
 * an underlined text button that does not compete with the archive it sits above.
 *
 * Both are hidden when there is nothing to act on: an empty feed offers no
 * "Archive all", an empty archive offers no "Restore all". Repo convention is to
 * hide a control the player cannot use rather than render it disabled.
 */
export default function FeedBulkArchiveButton({
  archivedView,
  onAct,
  pending,
}: {
  archivedView: boolean
  onAct: () => void
  pending: boolean
}) {
  const label = i18n.t(archivedView ? 'feed:archive.restoreAll' : 'feed:archive.archiveAll')

  return (
    <button
      type="button"
      onClick={onAct}
      className="label-caption"
      data-feed-bulk={archivedView ? 'restore-all' : 'archive-all'}
      style={{
        cursor: pending ? 'progress' : 'pointer',
        background: 'transparent',
        color: 'var(--color-text-secondary)',
        ...(archivedView
          ? { border: 'none', padding: 0, textDecoration: 'underline' }
          : {
              border: '1px solid var(--color-border-strong)',
              borderRadius: 999,
              padding: 'var(--space-xs) var(--space-md)',
            }),
      }}
    >
      {label}
    </button>
  )
}
