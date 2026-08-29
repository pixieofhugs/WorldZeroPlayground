/**
 * Attaching video/audio to a praxis: chunk the selection, batch each chunk into
 * one request, and hand the composer back media in selection order plus one
 * error per file that failed (#1286).
 *
 * This replaced an `await`-inside-`for` — five clips were five serial round
 * trips of file-sized requests. The batch route (`POST /praxes/{id}/media/batch`,
 * #1298) is partial-success and returns one entry per submitted file in request
 * order, which is what lets the two behaviours the old loop provided survive:
 * per-file error attribution, and gallery order taken from the request rather
 * than from whoever finished first.
 *
 * The image path is deliberately not routed through here. Images go to the
 * crop/rotate modal and are edited and uploaded one at a time by design (#514).
 */
import i18n from '../../i18n'
import { uploadPraxisMediaBatch, type MediaItemOut } from '../../api/praxis'
import { extractError } from '../../utils/errors'

/**
 * Files per request.
 *
 * ponytail: the only hard ceiling the backend documents is Starlette's
 * `max_files=1000`, and blowing it fails the WHOLE request with a bare 400
 * before the handler runs — no per-file entries, nothing to attribute. Twenty
 * sits two orders of magnitude under that, and also bounds what a single retry
 * costs. The upgrade path, if a real selection ever gets near it, is to raise
 * this once the deployed proxy's body limit has actually been measured.
 */
export const MEDIA_BATCH_MAX_FILES = 20

/**
 * Cumulative bytes per request.
 *
 * ponytail: there is no application-level total-bytes cap, and Render's edge
 * proxy limit was not discoverable from the repo (#1298) — so this is a
 * self-imposed budget, not a measured one. 100 MB matches the backend's
 * documented per-file `MEDIA_MAX_BYTES`, which is the one number the stack does
 * commit to, and it bounds the temp-file spooling Starlette does for every part
 * over 1 MB: without a budget, a 20-file selection could push ~2 GB through the
 * container's ephemeral filesystem before the handler saw a byte. The composer
 * already refuses files over 50 MB (`MAX_FILE_SIZE`), so in practice a normal
 * selection of clips is one request and only a deliberate pile of large video
 * splits. Upgrade path: measure the deployed limit, then raise or drop this.
 */
export const MEDIA_BATCH_MAX_BYTES = 100 * 1024 * 1024

interface BatchUploadOutcome {
  /** Successfully stored media, in selection order — ready to append to the gallery. */
  uploaded: MediaItemOut[]
  /** One message per failed file, in selection order. */
  errors: string[]
}

/**
 * Split a selection into requests that stay under both ceilings.
 *
 * A file larger than the byte budget still gets sent — alone, in its own chunk.
 * Silently dropping it would be worse than letting the server rule on it.
 */
export function chunkForBatchUpload(files: File[]): File[][] {
  const chunks: File[][] = []
  let current: File[] = []
  let currentBytes = 0

  for (const file of files) {
    const wouldExceed =
      current.length >= MEDIA_BATCH_MAX_FILES ||
      (current.length > 0 && currentBytes + file.size > MEDIA_BATCH_MAX_BYTES)
    if (wouldExceed) {
      chunks.push(current)
      current = []
      currentBytes = 0
    }
    current.push(file)
    currentBytes += file.size
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

/** "Could not upload clip.mp4 — Unsupported media type." */
function namedFailure(name: string, reason: string): string {
  return i18n.t('forms:editPraxis.errors.uploadNamed', { name, reason })
}

/**
 * Upload a video/audio selection, one request per chunk, sequentially.
 *
 * Chunks are NOT fired in parallel: `docs/agents/load-time.md` records what
 * simultaneous requests do to a throttled uplink, and media payloads are the
 * worst possible thing to race. Sequential chunks are already a large win over
 * one request per file.
 *
 * A chunk whose request fails outright (network, or a batch-wide 4xx) yields one
 * error per file it carried — exactly what the old per-file loop produced — and
 * the remaining chunks still go.
 */
export async function uploadMediaInChunks(
  praxisId: number,
  files: File[],
): Promise<BatchUploadOutcome> {
  const uploaded: MediaItemOut[] = []
  const errors: string[] = []

  for (const chunk of chunkForBatchUpload(files)) {
    let results
    try {
      results = await uploadPraxisMediaBatch(praxisId, chunk)
    } catch (err) {
      for (const file of chunk) {
        errors.push(
          extractError(err, i18n.t('forms:editPraxis.errors.upload', { name: file.name })),
        )
      }
      continue
    }
    // Attribute by POSITION. The response is in request order and two files in
    // one selection can share a basename (#1336), so matching on `filename`
    // could hand a failure the wrong file's name.
    results.forEach((result, index) => {
      const name = chunk[index]?.name ?? result.filename
      if (result.media_item) {
        uploaded.push(result.media_item)
      } else {
        errors.push(
          result.error
            ? namedFailure(name, result.error)
            : i18n.t('forms:editPraxis.errors.upload', { name }),
        )
      }
    })
  }

  return { uploaded, errors }
}
