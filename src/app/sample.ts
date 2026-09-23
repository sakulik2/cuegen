/**
 * A worked example, loaded by the "Load sample" button.
 *
 * It is a continuous two-hour set with named tracks and inline times — the
 * shape of thing people actually bring to a CUE editor, and enough tracks for
 * the ladder to show its slope.
 */
export const SAMPLE = {
  performer: 'Sable Coast',
  title: 'Night Ferry 041',
  filename: 'night-ferry-041.flac',
  fileType: 'FLAC' as const,
  date: '2024',
  genre: 'Ambient',
  tracklist: [
    '00:00 Coastal Static - Harbour Lights',
    '04:12 Meridian Bell - Slow Ascent',
    '09:48 Tide Machine - Quartz Hours',
    '16:03 Low Atlas - Drift Correction',
    '21:30 Ferry Signals - Last Crossing',
    '27:55 Meridian Bell - Night Water',
    '34:20 Coastal Static - Breakwater',
    '41:44 Tide Machine - Blue Hour',
    '48:10 Low Atlas - Anchor Chain',
    '55:36 Ferry Signals - Deckhand',
    '01:02:18 Sable Coast - Ninety Fathoms',
    '01:09:05 Meridian Bell - Slow Descent',
  ].join('\n'),
} as const

/** Shown under the Timings box as an example of what to paste there. */
export const TIMINGS_PLACEHOLDER = `0.000000\t252.480000\tHarbour Lights
252.480000\t588.000000\tSlow Ascent`
