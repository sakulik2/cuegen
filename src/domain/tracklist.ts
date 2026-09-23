import { type Frames, fromHMSF } from './frames'

export interface TrackEntry {
  /** 1-based, assigned after blank lines are skipped. */
  readonly track: number
  /** Empty when the line carried no performer; the global one fills in later. */
  readonly performer: string
  readonly title: string
  /** Null when the line carried no time at all. */
  readonly time: Frames | null
  /** The original line, kept for diagnostics. */
  readonly source: string
}

/**
 * How a performer is told apart from a title. Five dash characters show up in
 * tracklists copied off forums and radio show pages, and they are not
 * interchangeable — an en dash pasted from a styled page looks identical to a
 * hyphen at small sizes.
 */
const SEPARATORS = [
  ' - ', // hyphen-minus
  ' – ', // en dash
  ' ‒ ', // figure dash
  ' — ', // em dash
  ' ― ', // horizontal bar
] as const

const splitPerformerTitle = (text: string): { performer: string; title: string } => {
  for (const sep of SEPARATORS) {
    // indexOf, not search: search compiles its argument as a regex. The old
    // generator passed these separators to search and got away with it only
    // because dashes happen to be inert in a pattern.
    const at = text.indexOf(sep)
    if (at !== -1) {
      return {
        performer: text.slice(0, at).trim(),
        title: text.slice(at + sep.length).trim(),
      }
    }
  }
  return { performer: '', title: text.trim() }
}

/**
 * A leading time, in any of the shapes a hand-written tracklist uses:
 *   04:12        1:02:33        [04:12]        01. 04:12
 * The leading track number is consumed here so it does not end up in the title.
 */
const LEADING_TIME =
  /^\s*(?:\d{1,3}[)..]?\s+)?\[?\s*(?:(\d{1,3}):)?(\d{1,4}):(\d{2})(?:[.:,](\d{2}))?\s*\]?\s*/

const LEADING_NUMBER = /^\s*\d{1,3}[).]?\s+/

const stripQuotes = (text: string): string => text.replace(/"/g, '')

const takeTime = (text: string): { time: Frames | null; rest: string } => {
  const m = text.match(LEADING_TIME)
  if (!m) return { time: null, rest: text.trim() }

  // Two colon-separated fields are mm:ss. Three are hh:mm:ss — in a tracklist
  // the third field is seconds, not frames, because these times are written by
  // people. Frames only appear when a fourth field follows.
  const hours = m[1] ? Number(m[1]) : 0
  const minutes = Number(m[2])
  const seconds = Number(m[3])
  const frames = m[4] ? Number(m[4]) : 0

  return {
    time: fromHMSF(hours, minutes, seconds, frames),
    rest: text.slice(m[0].length).trim(),
  }
}

export const parseTracklist = (input: string): TrackEntry[] => {
  const entries: TrackEntry[] = []

  for (const raw of input.split('\n')) {
    const source = raw.trim()
    if (!source) continue

    const { time, rest } = takeTime(source)
    // A time may also sit between the number and the performer, or after the
    // performer on lines like "Bobina - 04:12 Miami". Strip a stray leading
    // number left over from a line that had no time at all.
    const cleaned = time === null ? rest.replace(LEADING_NUMBER, '') : rest
    const { performer, title } = splitPerformerTitle(cleaned)

    // "04:12 Artist - Title" puts the time ahead of the performer; the reverse
    // order, "Artist - 04:12 Title", hides it in the title half.
    const inTitle = time === null ? takeTime(title) : { time, rest: title }

    entries.push({
      track: entries.length + 1,
      performer: stripQuotes(performer),
      title: stripQuotes(inTitle.rest),
      time: inTitle.time,
      source,
    })
  }

  return entries
}
