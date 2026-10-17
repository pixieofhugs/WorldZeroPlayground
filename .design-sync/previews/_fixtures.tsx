// The fixtures live in the app tree so the admin copy sheet (inside the
// frontend Docker build context) and these previews share ONE copy. Re-exported
// here so the previews keep importing './_fixtures'.
export * from '../../frontend/src/pages/admin/copySheet/sheetFixtures'
