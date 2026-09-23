import type { CueSheet } from './cue'
import { type Frames, FPS, frameField, toClock } from './frames'
import type { LineResult } from './timings'

/**
 * What the editor can tell the user is wrong. Every problem carries enough
 * detail to act on — a line number, a track number, the value it read — because
 * "something is off" is not worth interrupting anyone for.
 */
export interface Problem {
  readonly severity: 'error' | 'warning'
  /** One sentence: what happened. */
  readonly message: string
  /** One sentence: what to do about it. Omitted when it would state the obvious. */
  readonly fix?: string
  /** 1-based line in the Timings box, when the problem came from there. */
  readonly line?: number
  /** 1-based track number, when the problem came from the table. */
  readonly track?: number
}

export interface ValidateInput {
  readonly sheet: CueSheet
  readonly timings: readonly LineResult[]
  /** Real duration of the dropped audio file, when there is one. */
  readonly audioDuration: Frames | null
}

export const validate = ({ sheet, timings, audioDuration }: ValidateInput): Problem[] => {
  const problems: Problem[] = []
  const tracks = sheet.tracks

  for (const result of timings) {
    if (!result.ok) {
      problems.push({
        severity: 'error',
        line: result.line,
        message: `Line ${result.line} is not a timecode: "${truncate(result.text)}"`,
        fix: 'Delete the line, or write it as mm:ss, mm:ss:ff or hh:mm:ss.ff.',
      })
    }
  }

  const recognized = timings.filter((r) => r.ok).length
  if (recognized > 0 && tracks.length > 0 && recognized !== tracks.length) {
    problems.push({
      severity: 'warning',
      message: `${recognized} ${plural(recognized, 'timing')} for ${tracks.length} ${plural(
        tracks.length,
        'track',
      )}.`,
      fix:
        recognized < tracks.length
          ? 'Tracks past the last timing fall back to the time in the tracklist.'
          : 'Extra timings are ignored. Timings pair with tracks in order.',
    })
  }

  tracks.forEach((track, i) => {
    const previous = tracks[i - 1]

    if (previous && track.time < previous.time) {
      problems.push({
        severity: 'error',
        track: track.track,
        message: `Track ${track.track} starts at ${toClock(track.time)}, before track ${
          previous.track
        } at ${toClock(previous.time)}.`,
        fix: 'Times have to climb. Check whether two timings are swapped.',
      })
    } else if (previous && track.time === previous.time) {
      problems.push({
        severity: 'warning',
        track: track.track,
        message: `Tracks ${previous.track} and ${track.track} both start at ${toClock(track.time)}.`,
        fix: 'Track ' + previous.track + ' would have no length.',
      })
    }

    if (frameField(track.time) > FPS - 1) {
      problems.push({
        severity: 'error',
        track: track.track,
        message: `Track ${track.track} has an out-of-range frame count.`,
        fix: `A frame is 1/${FPS}s, so the frames field runs 00–${FPS - 1}.`,
      })
    }

    if (!track.title) {
      problems.push({
        severity: 'warning',
        track: track.track,
        message: `Track ${track.track} has no title.`,
      })
    }

    if (track.timeFrom === 'missing') {
      problems.push({
        severity: 'warning',
        track: track.track,
        message: `Track ${track.track} has no time and starts at 0:00.`,
        fix: 'Add a time to the line, or paste a region export into Timings.',
      })
    }

    if (audioDuration !== null && track.time > audioDuration) {
      problems.push({
        severity: 'error',
        track: track.track,
        message: `Track ${track.track} starts at ${toClock(
          track.time,
        )}, past the end of the audio file at ${toClock(audioDuration)}.`,
        fix: 'Check that the timings came from this recording.',
      })
    }
  })

  if (tracks.length > 0 && !sheet.filename) {
    problems.push({
      severity: 'warning',
      message: 'No audio file name is set.',
      fix: 'Players use the FILE line to find the audio next to the sheet.',
    })
  }

  if (tracks.length > 99) {
    problems.push({
      severity: 'warning',
      message: `${tracks.length} tracks. A CD holds 99.`,
      fix: 'Fine for file playback, but a disc will not take this sheet.',
    })
  }

  return problems
}

/** Track lengths, derived from the next track's start. Last one needs the audio. */
export const trackLengths = (
  tracks: readonly { time: Frames }[],
  audioDuration: Frames | null,
): (Frames | null)[] =>
  tracks.map((track, i) => {
    const next = tracks[i + 1]
    if (next) return (next.time - track.time) as Frames
    if (audioDuration !== null && audioDuration > track.time)
      return (audioDuration - track.time) as Frames
    return null
  })

const truncate = (text: string, max = 40): string =>
  text.length <= max ? text : text.slice(0, max - 1) + '…'

const plural = (n: number, word: string): string => (n === 1 ? word : `${word}s`)
