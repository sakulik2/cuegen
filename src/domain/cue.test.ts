import { describe, expect, it } from 'vitest'
import { type MergeInput, merge, serialize } from './cue'
import { frames, fromHMSF } from './frames'
import { parseTimings } from './timings'
import { parseTracklist } from './tracklist'

const base = (over: Partial<MergeInput> = {}): MergeInput => ({
  performer: 'Bobina',
  title: 'Russia Goes Clubbing 249',
  filename: 'rgc249.flac',
  fileType: 'FLAC',
  date: '',
  genre: '',
  tracklist: [],
  timings: [],
  overrides: {},
  offset: 0,
  ...over,
})

describe('merge', () => {
  it('prefers an override, then a timing, then the tracklist time', () => {
    const input = base({
      tracklist: parseTracklist('01:00 One\n02:00 Two\n03:00 Three'),
      timings: parseTimings('10:00\n20:00\n30:00'),
      overrides: { 0: { time: fromHMSF(0, 55, 0) } },
    })
    const sheet = merge(input)
    expect(sheet.tracks.map((t) => t.time)).toEqual([
      fromHMSF(0, 55, 0),
      fromHMSF(0, 20, 0),
      fromHMSF(0, 30, 0),
    ])
    expect(sheet.tracks.map((t) => t.timeFrom)).toEqual(['override', 'timings', 'timings'])
  })

  it('pairs timings with tracks by position', () => {
    // Two timings, three tracks: the third keeps its own time.
    const sheet = merge(
      base({
        tracklist: parseTracklist('01:00 One\n02:00 Two\n03:00 Three'),
        timings: parseTimings('10:00\n20:00'),
      }),
    )
    expect(sheet.tracks.map((t) => t.timeFrom)).toEqual(['timings', 'timings', 'tracklist'])
  })

  it('does not let an unreadable timing line shift the pairing', () => {
    // The bad line is dropped from pairing but still reported by validate, so
    // track 2 takes the second *recognized* timing.
    const sheet = merge(
      base({
        tracklist: parseTracklist('01:00 One\n02:00 Two'),
        timings: parseTimings('10:00\nTrack ??\n20:00'),
      }),
    )
    expect(sheet.tracks.map((t) => t.time)).toEqual([fromHMSF(0, 10, 0), fromHMSF(0, 20, 0)])
  })

  it('marks a track with no time at all', () => {
    const sheet = merge(base({ tracklist: parseTracklist('One') }))
    expect(sheet.tracks[0]?.timeFrom).toBe('missing')
    expect(sheet.tracks[0]?.time).toBe(frames(0))
  })

  it('shifts every track by the offset and never goes negative', () => {
    const sheet = merge(
      base({ tracklist: parseTracklist('00:10 One\n01:00 Two'), offset: -750 }), // -10s
    )
    expect(sheet.tracks.map((t) => t.time)).toEqual([frames(0), fromHMSF(0, 0, 50)])
  })
})

describe('serialize', () => {
  it('writes a sheet that matches the CUE layout byte for byte', () => {
    const sheet = merge(
      base({
        tracklist: parseTracklist('00:00 Opening\n04:12 Kaimo K - Second Light'),
        genre: 'Trance',
        date: '2013',
      }),
    )
    expect(serialize(sheet)).toBe(
      [
        'REM GENRE "Trance"',
        'REM DATE "2013"',
        'PERFORMER "Bobina"',
        'TITLE "Russia Goes Clubbing 249"',
        'FILE "rgc249.flac" FLAC',
        '  TRACK 01 AUDIO',
        '    PERFORMER "Bobina"',
        '    TITLE "Opening"',
        '    INDEX 01 00:00:00',
        '  TRACK 02 AUDIO',
        '    PERFORMER "Kaimo K"',
        '    TITLE "Second Light"',
        '    INDEX 01 04:12:00',
        '',
      ].join('\n'),
    )
  })

  it('adds INDEX 00 when the first track starts late', () => {
    // The gap before track 1 still belongs to track 1, and some players reject
    // a sheet whose first index is not zero.
    const sheet = merge(base({ tracklist: parseTracklist('00:30 Opening') }))
    const lines = serialize(sheet).split('\n')
    expect(lines).toContain('    INDEX 00 00:00:00')
    expect(lines.indexOf('    INDEX 00 00:00:00')).toBeLessThan(
      lines.indexOf('    INDEX 01 00:30:00'),
    )
  })

  it('omits INDEX 00 when the first track starts at zero', () => {
    const sheet = merge(base({ tracklist: parseTracklist('00:00 Opening') }))
    expect(serialize(sheet)).not.toContain('INDEX 00')
  })

  it('falls back to the album performer per track', () => {
    const sheet = merge(base({ tracklist: parseTracklist('00:00 Opening') }))
    expect(serialize(sheet)).toContain('    PERFORMER "Bobina"')
  })

  it('leaves out REM lines that have no value', () => {
    const sheet = merge(base({ tracklist: parseTracklist('00:00 One') }))
    expect(serialize(sheet)).not.toContain('REM')
  })

  it('drops quotes instead of emitting an unparseable string', () => {
    const sheet = merge(base({ title: 'Live @ "Zouk"', tracklist: [] }))
    expect(serialize(sheet)).toContain('TITLE "Live @ Zouk"')
  })

  it('pads the track number but not past two digits', () => {
    const many = Array.from({ length: 10 }, (_, i) => `${i}:00 Track ${i + 1}`).join('\n')
    const out = serialize(merge(base({ tracklist: parseTracklist(many) })))
    expect(out).toContain('  TRACK 09 AUDIO')
    expect(out).toContain('  TRACK 10 AUDIO')
  })
})
