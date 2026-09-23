import { FILE_TYPES, type FileType } from '../domain/cue'

/** Guess the CUE FILE type from an audio file's extension. */
export const fileTypeFor = (filename: string): FileType => {
  const ext = filename.slice(filename.lastIndexOf('.') + 1).toUpperCase()
  const byExtension: Record<string, FileType> = {
    WAV: 'WAVE',
    WAVE: 'WAVE',
    AIF: 'AIFF',
    AIFF: 'AIFF',
    M4A: 'ALAC',
    MP4: 'AAC',
    OGA: 'OGG',
  }
  const mapped = byExtension[ext]
  if (mapped) return mapped
  return FILE_TYPES.find((t) => t === ext) ?? 'WAVE'
}

/**
 * Save the sheet as a .cue file.
 *
 * Two things old players need and modern editors forget: a UTF-8 BOM, without
 * which foobar2000 and friends read non-ASCII titles as mojibake, and CRLF line
 * endings. Neither matters on screen, so both are applied only on the way out.
 */
export const downloadCue = (text: string, filename: string): void => {
  const body = '﻿' + text.replace(/\r?\n/g, '\r\n')
  const blob = new Blob([body], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = cueName(filename)
  link.click()
  // Revoking immediately can race the download in some browsers; a task tick
  // is enough for the click to be handed off.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Swap any extension for .cue, keeping the rest of the name intact. */
export const cueName = (filename: string): string => {
  const base = filename.trim().replace(/\.[^./\\]*$/, '')
  return (base || 'untitled') + '.cue'
}

/**
 * Read an audio file's duration without decoding it.
 *
 * A media element only needs the container metadata to report duration, which
 * is fast even for a two-hour lossless file, and avoids pulling the whole thing
 * into memory the way decodeAudioData would.
 */
export const readDuration = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const audio = document.createElement('audio')
    audio.preload = 'metadata'

    const done = (fn: () => void) => {
      audio.removeAttribute('src')
      URL.revokeObjectURL(url)
      fn()
    }

    audio.onloadedmetadata = () => {
      const { duration } = audio
      done(() =>
        Number.isFinite(duration) && duration > 0
          ? resolve(duration)
          : reject(new Error('no duration')),
      )
    }
    audio.onerror = () => done(() => reject(new Error('cannot read')))
    audio.src = url
  })

export const readText = (file: File): Promise<string> => file.text()
