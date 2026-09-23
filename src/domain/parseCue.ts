import { FILE_TYPES, type FileType } from './cue'
import { parseIndex } from './frames'

/**
 * A CUE sheet read back into the editor's own inputs.
 *
 * Opening a file writes into the left-hand fields and the tracklist box rather
 * than into a separate model, so there stays exactly one source of truth and
 * the file can be edited the same way as anything typed by hand.
 */
export interface ImportedCue {
  readonly performer: string
  readonly title: string
  readonly filename: string
  readonly fileType: FileType
  readonly date: string
  readonly genre: string
  /** Lines shaped `MM:SS:FF Performer - Title`, ready for the tracklist box. */
  readonly tracklist: string
  readonly trackCount: number
}

const unquote = (text: string): string => {
  const m = text.match(/^"(.*)"$/)
  return (m?.[1] ?? text).trim()
}

/** Pull the first quoted string, or everything up to the first space. */
const firstValue = (rest: string): string => {
  const quoted = rest.match(/^"([^"]*)"/)
  if (quoted) return quoted[1] ?? ''
  return unquote(rest.split(/\s+/)[0] ?? '')
}

export const parseCue = (input: string): ImportedCue => {
  let performer = ''
  let title = ''
  let filename = ''
  let fileType: FileType = 'WAVE'
  let date = ''
  let genre = ''

  interface Pending {
    performer: string
    title: string
    time: string
  }
  const tracks: Pending[] = []
  let current: Pending | null = null

  // The BOM the old generator wrote (and this one still writes) is a real
  // character once the file is read back, so it has to come off the first line.
  for (const raw of input.replace(/^﻿/, '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue

    const [head = '', ...tail] = line.split(/\s+/)
    const keyword = head.toUpperCase()
    const rest = line.slice(head.length).trim()

    switch (keyword) {
      case 'REM': {
        const sub = (tail[0] ?? '').toUpperCase()
        const value = firstValue(rest.slice(sub.length).trim())
        if (sub === 'DATE') date = value
        else if (sub === 'GENRE') genre = value
        break
      }
      case 'PERFORMER': {
        const value = firstValue(rest)
        if (current) current.performer = value
        else performer = value
        break
      }
      case 'TITLE': {
        const value = firstValue(rest)
        if (current) current.title = value
        else title = value
        break
      }
      case 'FILE': {
        filename = firstValue(rest)
        const declared = rest
          .slice(rest.lastIndexOf('"') + 1)
          .trim()
          .toUpperCase()
        const match = FILE_TYPES.find((t) => t === declared)
        if (match) fileType = match
        break
      }
      case 'TRACK': {
        current = { performer: '', title: '', time: '' }
        tracks.push(current)
        break
      }
      case 'INDEX': {
        // INDEX 00 marks the pregap that belongs to track 1; INDEX 01 is the
        // actual start. Only 01 is a track time.
        if (current && (tail[0] === '01' || tail[0] === '1')) {
          current.time = tail[1] ?? ''
        }
        break
      }
      default:
        break
    }
  }

  const tracklist = tracks
    .map((t) => {
      const time = parseIndex(t.time)
      // Round frames off to whole seconds: the tracklist box is for people, and
      // exact frames stay available by pasting the same file into Timings.
      const clock = time === null ? '' : formatMinutesSeconds(time)
      // Only carry a per-track performer when it actually differs from the
      // album one, otherwise every line gains noise it did not have.
      const named = t.performer && t.performer !== performer ? `${t.performer} - ` : ''
      return `${clock} ${named}${t.title}`.trim()
    })
    .join('\n')

  return { performer, title, filename, fileType, date, genre, tracklist, trackCount: tracks.length }
}

const formatMinutesSeconds = (t: number): string => {
  const total = Math.floor(t / 75)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * A CUE file pasted into the Timings box is a common move, so the frames stay
 * reachable there. This is the exact-precision counterpart to `tracklist`.
 */
export const indexLines = (input: string): string =>
  input
    .split(/\r?\n/)
    .map((l) => l.trim().match(/^INDEX\s+0?1\s+(\d+:\d{2}:\d{2})/i)?.[1])
    .filter((v): v is string => Boolean(v))
    .join('\n')
