/**
 * CD-DA timecode, counted in frames.
 *
 * The Red Book spec runs at 75 frames per second, and a CUE sheet's INDEX
 * command is the only place that number surfaces. Keeping every time as a
 * single integer means all the arithmetic — offsets, durations, sorting — is
 * plain integer math, and string formats only exist at the parse and
 * serialize boundaries.
 */
export type Frames = number & { readonly __brand: 'Frames' }

/** Frames per second, fixed by the Red Book spec. */
export const FPS = 75

/** No CUE time is negative, so construction clamps at zero. */
export const frames = (n: number): Frames => (n > 0 ? Math.round(n) : 0) as Frames

export const fromHMSF = (h: number, m: number, s: number, f = 0): Frames =>
  frames((h * 3600 + m * 60 + s) * FPS + f)

export const fromSeconds = (seconds: number): Frames => frames(seconds * FPS)

/**
 * Seconds plus a fractional part, as Audacity writes them (`4.512000`).
 *
 * A frame is 1/75s, so a fraction always floors: rounding up can produce 75,
 * which is not a valid frame number.
 */
export const fromDecimalSeconds = (seconds: number, fraction: number): Frames =>
  frames(seconds * FPS + Math.floor(fraction * FPS))

export const toSeconds = (t: Frames): number => t / FPS

const pad = (n: number, width = 2): string => String(n).padStart(width, '0')

/**
 * Format for a CUE `INDEX` command: `MM:SS:FF`.
 *
 * There is no hours field — hours fold into minutes, and minutes are allowed
 * past 99 for long recordings, so the field is padded but never truncated.
 */
export const toIndex = (t: Frames): string => {
  const mm = Math.floor(t / (60 * FPS))
  const ss = Math.floor(t / FPS) % 60
  const ff = t % FPS
  return `${pad(mm)}:${pad(ss)}:${pad(ff)}`
}

/** Parse a CUE `INDEX` timecode (`MM:SS:FF`), or return null. */
export const parseIndex = (text: string): Frames | null => {
  const m = text.trim().match(/^(\d+):(\d{2}):(\d{2})$/)
  if (!m) return null
  return fromHMSF(0, Number(m[1]), Number(m[2]), Number(m[3]))
}

/** Format for people to read: `1:58:42` or `4:12`. Frames are dropped. */
export const toClock = (t: Frames): string => {
  const total = Math.floor(t / FPS)
  const h = Math.floor(total / 3600)
  const m = Math.floor(total / 60) % 60
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** The frame part of a timecode, for spotting values that exceed 74. */
export const frameField = (t: Frames): number => t % FPS
