import { describe, expect, it } from 'vitest'
import { merge, serialize } from './cue'
import { indexLines, parseCue } from './parseCue'
import { parseTimings } from './timings'
import { parseTracklist } from './tracklist'

const SHEET = [
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
  '    INDEX 01 04:12:36',
  '',
].join('\n')

describe('parseCue', () => {
  it('reads the album fields', () => {
    const cue = parseCue(SHEET)
    expect(cue.performer).toBe('Bobina')
    expect(cue.title).toBe('Russia Goes Clubbing 249')
    expect(cue.filename).toBe('rgc249.flac')
    expect(cue.fileType).toBe('FLAC')
    expect(cue.genre).toBe('Trance')
    expect(cue.date).toBe('2013')
    expect(cue.trackCount).toBe(2)
  })

  it('writes tracks back into tracklist lines', () => {
    // A per-track performer only appears when it differs from the album one,
    // so re-opening a file does not add noise to every line.
    expect(parseCue(SHEET).tracklist).toBe('00:00 Opening\n04:12 Kaimo K - Second Light')
  })

  it('tolerates the UTF-8 BOM it wrote itself', () => {
    expect(parseCue('﻿' + SHEET).performer).toBe('Bobina')
  })

  it('tolerates CRLF line endings', () => {
    expect(parseCue(SHEET.replace(/\n/g, '\r\n')).trackCount).toBe(2)
  })

  it('takes INDEX 01 as the start and ignores the INDEX 00 pregap', () => {
    const withPregap = [
      'PERFORMER "A"',
      'TITLE "B"',
      'FILE "x.wav" WAVE',
      '  TRACK 01 AUDIO',
      '    TITLE "Late start"',
      '    INDEX 00 00:00:00',
      '    INDEX 01 00:30:00',
    ].join('\n')
    expect(parseCue(withPregap).tracklist).toBe('00:30 Late start')
  })

  it('keeps a file name that contains spaces and brackets', () => {
    const line = 'FILE "Bobina - RGC #249 [Live @ Zouk].flac" FLAC'
    const cue = parseCue(`PERFORMER "x"\nTITLE "y"\n${line}`)
    expect(cue.filename).toBe('Bobina - RGC #249 [Live @ Zouk].flac')
    expect(cue.fileType).toBe('FLAC')
  })

  it('falls back to WAVE when the file type is unknown', () => {
    expect(parseCue('FILE "x.xyz" XYZ').fileType).toBe('WAVE')
  })

  it('round-trips a sheet back to the same text', () => {
    const cue = parseCue(SHEET)
    const again = serialize(
      merge({
        performer: cue.performer,
        title: cue.title,
        filename: cue.filename,
        fileType: cue.fileType,
        date: cue.date,
        genre: cue.genre,
        tracklist: parseTracklist(cue.tracklist),
        // Exact frames survive by way of the Timings box, which is where a
        // pasted CUE keeps its precision.
        timings: parseTimings(indexLines(SHEET)),
        overrides: {},
        offset: 0,
      }),
    )
    expect(again).toBe(SHEET)
  })
})

describe('indexLines', () => {
  it('pulls the INDEX 01 timecodes out of a pasted sheet', () => {
    expect(indexLines(SHEET)).toBe('00:00:00\n04:12:36')
  })

  it('leaves out INDEX 00', () => {
    expect(indexLines('    INDEX 00 00:00:00\n    INDEX 01 00:30:00')).toBe('00:30:00')
  })
})
