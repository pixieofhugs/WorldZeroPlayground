/**
 * Video/audio upload: chunk the selection, one batch request per chunk, media
 * back in selection order plus one error per failed file (#1286). The batch
 * route is partial-success, one entry per file in request order (#1298).
 * Images don't come here; they go through the edit modal one at a time (#514).
 */
import i18n from '../../i18n'
import { uploadPraxisMediaBatch, type MediaItemOut, type MediaUploadResultOut } from '../../api/praxis'
import { extractError } from '../../utils/errors'

/**
 * Files per request.
 *
 * ponytail: well under Starlette's `max_files=1000` (exceeding it 400s the whole
 * request, unattributable). Upgrade: raise once the proxy body limit is measured.
 */
export const MEDIA_BATCH_MAX_FILES = 20

/**
 * Cumulative bytes per request.
 *
 * ponytail: self-imposed, unmeasured (proxy limit unknown, #1298); matches the
 * per-file `MEDIA_MAX_BYTES` and bounds Starlette's temp-file spooling. Upgrade:
 * measure the deployed limit, then raise or drop this.
 */
export const MEDIA_BATCH_MAX_BYTES = 100 * 1024 * 1024

interface BatchUploadOutcome {
  /** Successfully stored media, in selection order — ready to append to the gallery. */
  uploaded: MediaItemOut[]
  /** One message per failed file, in selection order. */
  errors: string[]
}

/**
 * Split a selection under both ceilings. An oversize file goes alone in its own
 * chunk; the server rules on it.
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
 * Batch answer → tiles and error lines, attributed by POSITION (basenames can
 * collide, #1336). Google Photos ingests (#559) pass no `names`, so fall back to
 * the server's `filename`.
 */
export function settleBatchResults(
  results: MediaUploadResultOut[],
  names: string[] = [],
): BatchUploadOutcome {
  const uploaded: MediaItemOut[] = []
  const errors: string[] = []
  results.forEach((result, index) => {
    const name = names[index] ?? result.filename
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
  return { uploaded, errors }
}

/**
 * Upload chunks sequentially, never in parallel (throttled uplinks; see
 * `docs/agents/load-time.md`). A chunk that fails outright yields one error per
 * file and the rest still go.
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
    const settled = settleBatchResults(results, chunk.map((f) => f.name))
    uploaded.push(...settled.uploaded)
    errors.push(...settled.errors)
  }

  return { uploaded, errors }
}
