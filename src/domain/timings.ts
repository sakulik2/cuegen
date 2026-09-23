import { type Frames, fromDecimalSeconds, fromHMSF } from './frames'

/**
 * Timings arrive as region or marker exports pasted straight out of an audio
 * editor, one per line, in whatever format that editor happens to write. Each
 * recognizer owns one of those formats; lines are tried against the list in
 * order and the first match wins.
 *
 * Order matters: the patterns overlap, so the most specific shapes (more
 * numeric components) come first.
 */
interface Recognizer {
  /** Shown back to the user so they can confirm we read the right format. */
  readonly name: string
  readonly pattern: RegExp
  readonly parse: (m: RegExpMatchArray) => Frames
}

const num = (s: string | undefined): number => Number(s ?? 0)

const RECOGNIZERS: readonly Recognizer[] = [
  {
    // Sound Forge and Audition region lists: hh:mm:ss.ff, also seen with
    // ':' or ',' before the frames depending on locale and version.
    name: 'Sound Forge / Audition',
    pattern: /(\d{1,3}):(\d{2}):(\d{2})[.,:](\d{2})/,
    parse: (m) => fromHMSF(num(m[1]), num(m[2]), num(m[3]), num(m[4])),
  },
  {
    // Nero and Winamp track lists: mm:ss.ff, minutes may run past 99.
    name: 'Nero / Winamp',
    pattern: /(\d{1,4}):(\d{2})[.,](\d{2})/,
    parse: (m) => fromHMSF(0, num(m[1]), num(m[2]), num(m[3])),
  },
  {
    // Audacity label export: decimal seconds, tab separated.
    //   0.000000\t252.480000\tOpening
    name: 'Audacity',
    pattern: /(\d+)\.(\d{6})/,
    parse: (m) => fromDecimalSeconds(num(m[1]), Number(`0.${m[2]}`)),
  },
  {
    // A raw CUE INDEX, or anything else written mm:ss:ff. Three
    // colon-separated fields in a timings list are minutes, seconds, frames —
    // that is how CUE itself reads them.
    name: 'CUE index',
    pattern: /(\d{1,4}):(\d{2}):(\d{2})/,
    parse: (m) => fromHMSF(0, num(m[1]), num(m[2]), num(m[3])),
  },
  {
    // Plain mm:ss, typed by hand or copied from a forum post.
    name: 'Minutes and seconds',
    pattern: /(\d{1,4}):(\d{2})/,
    parse: (m) => fromHMSF(0, num(m[1]), num(m[2])),
  },
]

export type LineResult =
  /** `line` is 1-based and counts only non-blank lines' original positions. */
  | { readonly ok: true; readonly line: number; readonly time: Frames; readonly format: string }
  /**
   * A line we could not read is a result, not a dropped value. The old
   * generator silently substituted 00:00:00 here, which produced a CUE that
   * looked fine and was entirely wrong.
   */
  | { readonly ok: false; readonly line: number; readonly text: string }

export const parseTimings = (input: string): LineResult[] => {
  const results: LineResult[] = []

  input.split('\n').forEach((raw, i) => {
    const text = raw.trim()
    if (!text) return

    const line = i + 1
    const hit = RECOGNIZERS.find((r) => r.pattern.test(text))

    if (!hit) {
      results.push({ ok: false, line, text })
      return
    }

    const m = text.match(hit.pattern)
    if (!m) {
      results.push({ ok: false, line, text })
      return
    }

    results.push({ ok: true, line, time: hit.parse(m), format: hit.name })
  })

  return results
}

/** The formats recognized across a set of results, in first-seen order. */
export const formatsSeen = (results: readonly LineResult[]): string[] => {
  const seen: string[] = []
  for (const r of results) {
    if (r.ok && !seen.includes(r.format)) seen.push(r.format)
  }
  return seen
}
