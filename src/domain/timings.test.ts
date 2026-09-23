import { describe, expect, it } from 'vitest'
import { FPS, fromHMSF, toIndex } from './frames'
import { formatsSeen, parseTimings } from './timings'

/** Reads the times out of a paste, for tests that only care about values. */
const times = (input: string): string[] =>
  parseTimings(input)
    .filter((r) => r.ok)
    .map((r) => toIndex(r.time))

describe('parseTimings', () => {
  it('reads Audacity label exports', () => {
    const paste = ['0.000000\t252.480000\tOpening', '252.480000\t588.000000\tSecond Light'].join(
      '\n',
    )
    expect(times(paste)).toEqual(['00:00:00', '04:12:36'])
    expect(formatsSeen(parseTimings(paste))).toEqual(['Audacity'])
  })

  it('reads Sound Forge and Audition region lists', () => {
    expect(times('00:04:12.15\n01:02:33.00')).toEqual(['04:12:15', '62:33:00'])
  })

  it('accepts a comma or colon before the frames', () => {
    expect(times('00:04:12,15')).toEqual(['04:12:15'])
    expect(times('00:04:12:15')).toEqual(['04:12:15'])
  })

  it('reads Nero and Winamp track lists', () => {
    expect(times('04:12.15\n09:48.60')).toEqual(['04:12:15', '09:48:60'])
  })

  it('reads minutes past 99 without wrapping', () => {
    expect(times('227:06.00')).toEqual(['227:06:00'])
  })

  it('reads a raw CUE index as minutes, seconds, frames', () => {
    expect(times('04:12:15')).toEqual(['04:12:15'])
  })

  it('reads a hand-typed mm:ss', () => {
    expect(times('4:12')).toEqual(['04:12:00'])
  })

  it('ignores blank lines but keeps original line numbers', () => {
    const results = parseTimings('\n\n04:12\n\n09:48\n')
    expect(results.map((r) => r.line)).toEqual([3, 5])
  })

  it('reports a line it cannot read instead of substituting zero', () => {
    // This is the whole point of the rewrite: the old generator turned an
    // unreadable line into 00:00:00 and produced a CUE that looked correct.
    const results = parseTimings('04:12\nTrack 7 ??\n09:48')
    expect(results).toHaveLength(3)
    expect(results[1]).toEqual({ ok: false, line: 2, text: 'Track 7 ??' })
    expect(results.filter((r) => r.ok)).toHaveLength(2)
  })

  it('never yields a NaN or undefined component', () => {
    // The old parser leaked `var` bindings between format branches and could
    // build the string "05:undefined:undefined".
    for (const line of ['05:30', '05:30.20', '00:05:30.20', '5.500000', '05:30:20']) {
      const [first] = parseTimings(line)
      expect(first?.ok).toBe(true)
      if (first?.ok) {
        expect(Number.isFinite(first.time)).toBe(true)
        expect(toIndex(first.time)).toMatch(/^\d{2,}:\d{2}:\d{2}$/)
      }
    }
  })

  it('keeps frames inside the legal range for every recognizer', () => {
    const paste = ['0.999999\t1.0\tx', '00:00:04.74', '04:12.74', '04:12:74'].join('\n')
    for (const r of parseTimings(paste)) {
      if (r.ok) expect(r.time % FPS).toBeLessThan(FPS)
    }
  })

  it('prefers the most specific format when shapes overlap', () => {
    // hh:mm:ss.ff must not be read as mm:ss by the looser pattern.
    const [first] = parseTimings('01:02:33.50')
    expect(first?.ok && first.format).toBe('Sound Forge / Audition')
    expect(first?.ok && first.time).toBe(fromHMSF(1, 2, 33, 50))
  })
})
