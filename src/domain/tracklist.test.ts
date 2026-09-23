import { describe, expect, it } from 'vitest'
import { toIndex } from './frames'
import { parseTracklist } from './tracklist'

describe('parseTracklist', () => {
  it('splits a performer from a title on each dash character', () => {
    // All five look nearly identical at body size, and all five turn up in
    // tracklists copied off forums and radio show pages.
    for (const dash of ['-', '–', '‒', '—', '―']) {
      const [entry] = parseTracklist(`04:12 Bobina ${dash} Miami`)
      expect(entry?.performer).toBe('Bobina')
      expect(entry?.title).toBe('Miami')
    }
  })

  it('leaves the performer empty when the line is only a title', () => {
    const [entry] = parseTracklist('04:12 Miami')
    expect(entry?.performer).toBe('')
    expect(entry?.title).toBe('Miami')
  })

  it('keeps dashes that are part of a title', () => {
    // No spaces around it, so it is not a separator.
    const [entry] = parseTracklist('00:00 Blue-Green Hours')
    expect(entry?.performer).toBe('')
    expect(entry?.title).toBe('Blue-Green Hours')
  })

  it('reads a leading track number without putting it in the title', () => {
    for (const line of ['01. 04:12 Miami', '1) 04:12 Miami', '01 04:12 Miami']) {
      const [entry] = parseTracklist(line)
      expect(entry?.title).toBe('Miami')
      expect(entry?.time && toIndex(entry.time)).toBe('04:12:00')
    }
  })

  it('reads a bracketed time', () => {
    const [entry] = parseTracklist('[04:12] Bobina - Miami')
    expect(entry?.time && toIndex(entry.time)).toBe('04:12:00')
    expect(entry?.title).toBe('Miami')
  })

  it('reads hh:mm:ss as hours, minutes, seconds', () => {
    // Three fields written by a person are clock time, not frames.
    const [entry] = parseTracklist('1:02:33 Miami')
    expect(entry?.time && toIndex(entry.time)).toBe('62:33:00')
  })

  it('finds a time that sits after the performer', () => {
    const [entry] = parseTracklist('Bobina - 04:12 Miami')
    expect(entry?.performer).toBe('Bobina')
    expect(entry?.title).toBe('Miami')
    expect(entry?.time && toIndex(entry.time)).toBe('04:12:00')
  })

  it('strips quotes, which CUE cannot escape', () => {
    const [entry] = parseTracklist('04:12 Bobina - Miami "Echoes"')
    expect(entry?.title).toBe('Miami Echoes')
  })

  it('skips blank lines and numbers tracks consecutively', () => {
    const entries = parseTracklist('04:12 One\n\n   \n09:48 Two\n')
    expect(entries.map((e) => [e.track, e.title])).toEqual([
      [1, 'One'],
      [2, 'Two'],
    ])
  })

  it('reports a missing time as null rather than zero', () => {
    const [entry] = parseTracklist('Bobina - Miami')
    expect(entry?.time).toBeNull()
    expect(entry?.title).toBe('Miami')
  })

  it('does not mistake a number in a title for a track number', () => {
    const [entry] = parseTracklist('Russia Goes Clubbing 249')
    expect(entry?.title).toBe('Russia Goes Clubbing 249')
  })

  it('keeps the original line for diagnostics', () => {
    const [entry] = parseTracklist('  04:12 Bobina - Miami  ')
    expect(entry?.source).toBe('04:12 Bobina - Miami')
  })
})
