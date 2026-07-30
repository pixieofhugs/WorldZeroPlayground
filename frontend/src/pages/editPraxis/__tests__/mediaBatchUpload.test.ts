/**
 * Seam: `uploadMediaInChunks` — the whole video/audio attach path between "the
 * player picked N files" and "the composer has media to merge and errors to
 * show" (#1286).
 *
 * This is the seam worth pinning because it is the one that changed shape: five
 * serial single-file round trips became one batched request whose response
 * carries a per-file outcome. Everything the old loop guaranteed — per-file
 * error attribution by name, selection order in the gallery, one failure not
 * sinking its neighbours — now has to be re-derived from that array, and this
 * file is where that derivation is asserted. The hook above it only calls
 * `setMedia` / `setError` with what comes back.
 *
 * The API client is mocked: the contract under test is how many requests are
 * issued, what each carries, and how the results are attributed — not axios.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import '../../../i18n'
import type { MediaItemOut, MediaUploadResultOut } from '../../../api/praxis'

vi.mock('../../../api/praxis', () => ({
  uploadPraxisMediaBatch: vi.fn(),
}))

import { uploadPraxisMediaBatch } from '../../../api/praxis'
import {
  MEDIA_BATCH_MAX_BYTES,
  MEDIA_BATCH_MAX_FILES,
  chunkForBatchUpload,
  uploadMediaInChunks,
} from '../mediaBatchUpload'

const batchMock = vi.mocked(uploadPraxisMediaBatch)

/** A File of a given byte size — size is what the chunker reads. */
function fakeFile(name: string, bytes = 1024): File {
  return new File([new Uint8Array(bytes)], name, { type: 'video/mp4' })
}

function ok(filename: string, id: number): MediaUploadResultOut {
  return {
    filename,
    media_item: {
      id,
      praxis_id: 7,
      type: 'video',
      file_path: `m/${id}.mp4`,
      display_order: id,
      created_at: '2026-07-30T00:00:00Z',
    } satisfies MediaItemOut,
    error: null,
    status_code: null,
  }
}

function failed(filename: string, error: string, statusCode = 422): MediaUploadResultOut {
  return { filename, media_item: null, error, status_code: statusCode }
}

beforeEach(() => {
  batchMock.mockReset()
})

describe('uploadMediaInChunks', () => {
  it('sends five files as ONE request and returns them in selection order', async () => {
    const files = ['a', 'b', 'c', 'd', 'e'].map((n) => fakeFile(`${n}.mp4`))
    batchMock.mockResolvedValue(files.map((file, index) => ok(file.name, index + 1)))

    const outcome = await uploadMediaInChunks(7, files)

    expect(batchMock).toHaveBeenCalledTimes(1)
    expect(batchMock).toHaveBeenCalledWith(7, files)
    expect(outcome.uploaded.map((item) => item.id)).toEqual([1, 2, 3, 4, 5])
    expect(outcome.errors).toEqual([])
  })

  it('lets one file fail mid-batch, names it, and still lands the other four in order', async () => {
    const files = ['a', 'b', 'bad', 'd', 'e'].map((n) => fakeFile(`${n}.mp4`))
    batchMock.mockResolvedValue([
      ok('a.mp4', 1),
      ok('b.mp4', 2),
      failed('bad.mp4', 'Unsupported media type.'),
      ok('d.mp4', 4),
      ok('e.mp4', 5),
    ])

    const outcome = await uploadMediaInChunks(7, files)

    expect(outcome.uploaded.map((item) => item.id)).toEqual([1, 2, 4, 5])
    expect(outcome.errors).toHaveLength(1)
    expect(outcome.errors[0]).toContain('bad.mp4')
    expect(outcome.errors[0]).toContain('Unsupported media type.')
  })

  it('attributes by position, not by name, when two files share a basename (#1336)', async () => {
    const files = [fakeFile('clip.mp4'), fakeFile('clip.mp4'), fakeFile('other.mp4')]
    batchMock.mockResolvedValue([
      failed('clip.mp4', 'File too large (max 100 MB).', 413),
      ok('clip.mp4', 2),
      ok('other.mp4', 3),
    ])

    const outcome = await uploadMediaInChunks(7, files)

    // The survivor is the SECOND clip.mp4; matching on filename would have
    // dropped whichever one the lookup happened to find first.
    expect(outcome.uploaded.map((item) => item.id)).toEqual([2, 3])
    expect(outcome.errors).toHaveLength(1)
  })

  it('reports every file in a chunk when the whole request fails', async () => {
    const files = [fakeFile('a.mp4'), fakeFile('b.mp4')]
    batchMock.mockRejectedValue({ message: 'Network Error' })

    const outcome = await uploadMediaInChunks(7, files)

    expect(outcome.uploaded).toEqual([])
    expect(outcome.errors).toHaveLength(2)
  })

  it('does not abandon later chunks when an earlier chunk fails outright', async () => {
    const files = Array.from({ length: MEDIA_BATCH_MAX_FILES + 1 }, (_, index) =>
      fakeFile(`clip-${index}.mp4`),
    )
    batchMock
      .mockRejectedValueOnce({ message: 'Network Error' })
      .mockResolvedValueOnce([ok(`clip-${MEDIA_BATCH_MAX_FILES}.mp4`, 99)])

    const outcome = await uploadMediaInChunks(7, files)

    expect(batchMock).toHaveBeenCalledTimes(2)
    expect(outcome.uploaded.map((item) => item.id)).toEqual([99])
    expect(outcome.errors).toHaveLength(MEDIA_BATCH_MAX_FILES)
  })

  it('keeps selection order across chunk boundaries', async () => {
    const files = Array.from({ length: MEDIA_BATCH_MAX_FILES + 2 }, (_, index) =>
      fakeFile(`clip-${index}.mp4`),
    )
    batchMock
      .mockResolvedValueOnce(
        files.slice(0, MEDIA_BATCH_MAX_FILES).map((file, index) => ok(file.name, index)),
      )
      .mockResolvedValueOnce(
        files.slice(MEDIA_BATCH_MAX_FILES).map((file, index) => ok(file.name, MEDIA_BATCH_MAX_FILES + index)),
      )

    const outcome = await uploadMediaInChunks(7, files)

    expect(outcome.uploaded.map((item) => item.id)).toEqual(
      Array.from({ length: MEDIA_BATCH_MAX_FILES + 2 }, (_, index) => index),
    )
  })
})

describe('chunkForBatchUpload', () => {
  it('keeps a normal selection in a single chunk', () => {
    const files = ['a', 'b', 'c', 'd', 'e'].map((n) => fakeFile(`${n}.mp4`, 4 * 1024 * 1024))
    expect(chunkForBatchUpload(files)).toEqual([files])
  })

  it('splits on the file-count ceiling', () => {
    const files = Array.from({ length: MEDIA_BATCH_MAX_FILES * 2 + 1 }, (_, index) =>
      fakeFile(`clip-${index}.mp4`),
    )
    const chunks = chunkForBatchUpload(files)
    expect(chunks.map((chunk) => chunk.length)).toEqual([
      MEDIA_BATCH_MAX_FILES,
      MEDIA_BATCH_MAX_FILES,
      1,
    ])
  })

  it('splits on the cumulative-byte ceiling', () => {
    const big = Math.floor(MEDIA_BATCH_MAX_BYTES * 0.6)
    const files = [fakeFile('a.mp4', big), fakeFile('b.mp4', big), fakeFile('c.mp4', big)]
    expect(chunkForBatchUpload(files).map((chunk) => chunk.length)).toEqual([1, 1, 1])
  })

  it('never drops a file that is bigger than the byte ceiling on its own', () => {
    const files = [fakeFile('huge.mp4', MEDIA_BATCH_MAX_BYTES + 1), fakeFile('small.mp4')]
    const chunks = chunkForBatchUpload(files)
    expect(chunks.flat().map((file) => file.name)).toEqual(['huge.mp4', 'small.mp4'])
  })

  it('has nothing to send for an empty selection', () => {
    expect(chunkForBatchUpload([])).toEqual([])
  })
})
