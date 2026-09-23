import { type Frames, frames, toIndex } from './frames'
import type { LineResult } from './timings'
import type { TrackEntry } from './tracklist'

/** File types a CUE `FILE` command accepts, plus the ones players tolerate. */
export const FILE_TYPES = [
  'WAVE',
  'MP3',
  'FLAC',
  'AIFF',
  'APE',
  'AAC',
  'ALAC',
  'OGG',
  'WMA',
  'BINARY',
  'MOTOROLA',
] as const

export type FileType = (typeof FILE_TYPES)[number]

export interface Track {
  readonly track: number
  readonly performer: string
  readonly title: string
  readonly time: Frames
  /** Which layer supplied this time, for the "edited" marker in the table. */
  readonly timeFrom: 'override' | 'timings' | 'tracklist' | 'missing'
  readonly titleOverridden: boolean
}

export interface CueSheet {
  readonly performer: string
  readonly title: string
  readonly filename: string
  readonly fileType: FileType
  readonly date: string
  readonly genre: string
  readonly tracks: readonly Track[]
}

/** Per-track edits made in the table. Indexed by 0-based track position. */
export interface Override {
  readonly time?: Frames
  readonly title?: string
  readonly performer?: string
}

export interface MergeInput {
  readonly performer: string
  readonly title: string
  readonly filename: string
  readonly fileType: FileType
  readonly date: string
  readonly genre: string
  readonly tracklist: readonly TrackEntry[]
  readonly timings: readonly LineResult[]
  readonly overrides: Readonly<Record<number, Override>>
  /** Applied to every track, in frames. Lets a whole sheet slide at once. */
  readonly offset: Frames | number
}

/**
 * Three sources can name a track's start time. They stack, most specific last:
 * the tracklist's own inline times, then the timings paste, then whatever was
 * typed into the table.
 *
 * Timings line up with tracks by position — the Nth recognized timing belongs
 * to the Nth track. That is the rule the original generator used and it is what
 * people expect when they paste a region export next to a tracklist.
 */
export const merge = (input: MergeInput): CueSheet => {
  const times = input.timings.filter((r) => r.ok)
  const offset = Number(input.offset)

  const tracks = input.tracklist.map((entry, i): Track => {
    const override = input.overrides[i]
    const timing = times[i]

    let time: Frames
    let timeFrom: Track['timeFrom']

    if (override?.time !== undefined) {
      time = override.time
      timeFrom = 'override'
    } else if (timing) {
      time = timing.time
      timeFrom = 'timings'
    } else if (entry.time !== null) {
      time = entry.time
      timeFrom = 'tracklist'
    } else {
      time = frames(0)
      timeFrom = 'missing'
    }

    return {
      track: i + 1,
      performer: override?.performer ?? entry.performer ?? '',
      title: override?.title ?? entry.title,
      time: offset === 0 ? time : frames(time + offset),
      timeFrom,
      titleOverridden: override?.title !== undefined,
    }
  })

  return {
    performer: input.performer.trim(),
    title: input.title.trim(),
    filename: input.filename.trim(),
    fileType: input.fileType,
    date: input.date.trim(),
    genre: input.genre.trim(),
    tracks,
  }
}

/**
 * CUE has no escape sequence for a quote inside a quoted string, so a stray
 * one has to go. Dropping it is what every other tool does too.
 */
const quoted = (value: string): string => `"${value.replace(/"/g, '')}"`

export const serialize = (sheet: CueSheet): string => {
  const lines: string[] = []

  if (sheet.genre) lines.push(`REM GENRE ${quoted(sheet.genre)}`)
  if (sheet.date) lines.push(`REM DATE ${quoted(sheet.date)}`)
  lines.push(`PERFORMER ${quoted(sheet.performer)}`)
  lines.push(`TITLE ${quoted(sheet.title)}`)
  lines.push(`FILE ${quoted(sheet.filename)} ${sheet.fileType}`)

  sheet.tracks.forEach((track, i) => {
    lines.push(`  TRACK ${String(track.track).padStart(2, '0')} AUDIO`)
    lines.push(`    PERFORMER ${quoted(track.performer || sheet.performer)}`)
    lines.push(`    TITLE ${quoted(track.title)}`)
    // When the first track starts late, the gap before it still belongs to
    // track 1, and players need an INDEX 00 to know that. Without it some
    // reject the sheet outright.
    if (i === 0 && track.time > 0) lines.push('    INDEX 00 00:00:00')
    lines.push(`    INDEX 01 ${toIndex(track.time)}`)
  })

  return lines.join('\n') + '\n'
}
