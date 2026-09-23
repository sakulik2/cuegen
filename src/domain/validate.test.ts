import { describe, expect, it } from 'vitest'
import { type MergeInput, merge } from './cue'
import { type Frames, fromHMSF, fromSeconds } from './frames'
import { parseTimings } from './timings'
import { parseTracklist } from './tracklist'
import { trackLengths, validate } from './validate'

const check = (over: Partial<MergeInput>, audioDuration: Frames | null = null) => {
  const input: MergeInput = {
    performer: 'Bobina',
    title: 'RGC 249',
    filename: 'rgc249.flac',
    fileType: 'FLAC',
    date: '',
    genre: '',
    tracklist: [],
    timings: [],
    overrides: {},
    offset: 0,
    ...over,
  }
  return validate({ sheet: merge(input), timings: input.timings, audioDuration })
}

const messages = (problems: { message: string }[]) => problems.map((p) => p.message)

describe('validate', () => {
  it('names the line it could not read, with the text', () => {
    const problems = check({ timings: parseTimings('04:12\nTrack 7 ??') })
    expect(problems[0]?.severity).toBe('error')
    expect(problems[0]?.line).toBe(2)
    expect(problems[0]?.message).toContain('Track 7 ??')
    expect(problems[0]?.fix).toBeTruthy()
  })

  it('flags times that go backwards', () => {
    const problems = check({
      tracklist: parseTracklist('01:00 One\n02:00 Two'),
      timings: parseTimings('10:00\n05:00'),
    })
    expect(messages(problems).join(' ')).toContain('before track 1')
  })

  it('flags two tracks starting at the same time', () => {
    const problems = check({ tracklist: parseTracklist('01:00 One\n01:00 Two') })
    expect(messages(problems).join(' ')).toMatch(/both start at/)
  })

  it('flags a track past the end of the audio file', () => {
    const problems = check(
      { tracklist: parseTracklist('00:00 One\n120:00 Two') },
      fromSeconds(7122), // 1:58:42
    )
    const problem = problems.find((p) => p.message.includes('past the end'))
    expect(problem?.severity).toBe('error')
    expect(problem?.message).toContain('1:58:42')
    expect(problem?.track).toBe(2)
  })

  it('counts a mismatch between timings and tracks', () => {
    const problems = check({
      tracklist: parseTracklist('01:00 One\n02:00 Two\n03:00 Three'),
      timings: parseTimings('10:00'),
    })
    expect(messages(problems).join(' ')).toContain('1 timing for 3 tracks')
  })

  it('says nothing about counts when they agree', () => {
    const problems = check({
      tracklist: parseTracklist('01:00 One\n02:00 Two'),
      timings: parseTimings('10:00\n20:00'),
    })
    expect(messages(problems).join(' ')).not.toContain('timing')
  })

  it('flags a track with no time of its own', () => {
    const problems = check({ tracklist: parseTracklist('One') })
    expect(messages(problems).join(' ')).toContain('has no time')
  })

  it('flags a missing title', () => {
    const problems = check({ tracklist: parseTracklist('04:12') })
    expect(messages(problems).join(' ')).toContain('no title')
  })

  it('flags a missing file name only once there are tracks', () => {
    expect(messages(check({ filename: '' })).join(' ')).not.toContain('file name')
    const problems = check({ filename: '', tracklist: parseTracklist('00:00 One') })
    expect(messages(problems).join(' ')).toContain('No audio file name')
  })

  it('warns past the 99-track limit of a disc', () => {
    const many = Array.from({ length: 100 }, (_, i) => `${i}:00 Track ${i + 1}`).join('\n')
    expect(messages(check({ tracklist: parseTracklist(many) })).join(' ')).toContain('A CD holds 99')
  })

  it('finds nothing wrong with a clean sheet', () => {
    const problems = check(
      {
        tracklist: parseTracklist('00:00 Opening\n04:12 Second Light'),
        timings: parseTimings('00:00:00\n04:12:36'),
      },
      fromSeconds(600),
    )
    expect(problems).toEqual([])
  })
})

describe('trackLengths', () => {
  it('measures each track from the next one', () => {
    const lengths = trackLengths([{ time: fromHMSF(0, 0, 0) }, { time: fromHMSF(0, 4, 12) }], null)
    expect(lengths[0]).toBe(fromHMSF(0, 4, 12))
  })

  it('needs the audio duration to measure the last track', () => {
    const tracks = [{ time: fromHMSF(0, 0, 0) }]
    expect(trackLengths(tracks, null)[0]).toBeNull()
    expect(trackLengths(tracks, fromHMSF(0, 10, 0))[0]).toBe(fromHMSF(0, 10, 0))
  })
})
