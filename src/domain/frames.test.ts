import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  FPS,
  frames,
  fromDecimalSeconds,
  fromHMSF,
  fromSeconds,
  parseIndex,
  toClock,
  toIndex,
} from './frames'

describe('toIndex', () => {
  it('pads every field to two digits', () => {
    expect(toIndex(frames(0))).toBe('00:00:00')
    expect(toIndex(fromHMSF(0, 4, 12, 15))).toBe('04:12:15')
  })

  it('folds hours into minutes, since INDEX has no hours field', () => {
    expect(toIndex(fromHMSF(1, 2, 33))).toBe('62:33:00')
    expect(toIndex(fromHMSF(2, 0, 0))).toBe('120:00:00')
  })

  it('does not truncate minutes past 99', () => {
    // A 3h47m radio archive: the field has to grow, not wrap.
    expect(toIndex(fromHMSF(3, 47, 6))).toBe('227:06:00')
  })

  it('never emits a frame field above the frame rate', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 60 * 60 * FPS }), (n) => {
        const ff = Number(toIndex(frames(n)).split(':')[2])
        return ff >= 0 && ff < FPS
      }),
    )
  })
})

describe('parseIndex', () => {
  it('round-trips any timecode through toIndex', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 400 * 60 * FPS }), (n) => {
        const t = frames(n)
        return parseIndex(toIndex(t)) === t
      }),
    )
  })

  it('rejects text that is not a timecode', () => {
    expect(parseIndex('')).toBeNull()
    expect(parseIndex('4:12')).toBeNull()
    expect(parseIndex('Track 7 ??')).toBeNull()
  })
})

describe('fromDecimalSeconds', () => {
  it('floors the fraction, because frame 75 does not exist', () => {
    // 0.999 * 75 = 74.9: rounding would produce 75 and roll into the next second.
    expect(fromDecimalSeconds(4, 0.999999)).toBe(frames(4 * FPS + 74))
    expect(fromDecimalSeconds(0, 0.5)).toBe(frames(37))
  })
})

describe('toClock', () => {
  it('drops the hours field until there are hours', () => {
    expect(toClock(fromSeconds(252))).toBe('4:12')
    expect(toClock(fromSeconds(7122))).toBe('1:58:42')
  })
})

describe('frames', () => {
  it('clamps below zero, since no CUE time is negative', () => {
    expect(frames(-500)).toBe(0)
  })
})
