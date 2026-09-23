import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { type FileType, type Override, merge, serialize } from '../domain/cue'
import { FPS, type Frames, fromSeconds } from '../domain/frames'
import { indexLines, parseCue } from '../domain/parseCue'
import { formatsSeen, parseTimings } from '../domain/timings'
import { parseTracklist } from '../domain/tracklist'
import { trackLengths, validate } from '../domain/validate'
import { fileTypeFor } from './files'
import { SAMPLE } from './sample'

export interface AudioInfo {
  readonly name: string
  readonly duration: Frames
}

interface State {
  readonly performer: string
  readonly title: string
  readonly filename: string
  readonly fileType: FileType
  readonly date: string
  readonly genre: string
  readonly tracklistText: string
  readonly timingsText: string
  readonly overrides: Readonly<Record<number, Override>>
  /** Whole-sheet nudge in seconds, as typed. Kept as text so "-" can be typed. */
  readonly offsetSeconds: string
  readonly audio: AudioInfo | null
}

const EMPTY: State = {
  performer: '',
  title: '',
  filename: '',
  fileType: 'WAVE',
  date: '',
  genre: '',
  tracklistText: '',
  timingsText: '',
  overrides: {},
  offsetSeconds: '0',
  audio: null,
}

type Action =
  | { type: 'field'; field: keyof State; value: string }
  | { type: 'override'; index: number; patch: Override }
  | { type: 'clearOverride'; index: number }
  | { type: 'clearAllOverrides' }
  | { type: 'audio'; audio: AudioInfo | null; filename?: string; fileType?: FileType }
  | { type: 'openCue'; text: string }
  | { type: 'sample' }
  | { type: 'reset' }
  | { type: 'restore'; state: State }

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'field':
      return { ...state, [action.field]: action.value }

    case 'override': {
      const next = { ...state.overrides[action.index], ...action.patch }
      return { ...state, overrides: { ...state.overrides, [action.index]: next } }
    }

    case 'clearOverride': {
      const overrides = { ...state.overrides }
      delete overrides[action.index]
      return { ...state, overrides }
    }

    case 'clearAllOverrides':
      return { ...state, overrides: {} }

    case 'audio':
      return {
        ...state,
        audio: action.audio,
        filename: action.filename ?? state.filename,
        fileType: action.fileType ?? state.fileType,
      }

    case 'openCue': {
      const cue = parseCue(action.text)
      return {
        ...state,
        performer: cue.performer,
        title: cue.title,
        filename: cue.filename,
        fileType: cue.fileType,
        date: cue.date,
        genre: cue.genre,
        tracklistText: cue.tracklist,
        // The tracklist box rounds to whole seconds, so the exact frames ride
        // along in Timings where they keep full precision.
        timingsText: indexLines(action.text),
        overrides: {},
        offsetSeconds: '0',
      }
    }

    case 'sample':
      return {
        ...EMPTY,
        performer: SAMPLE.performer,
        title: SAMPLE.title,
        filename: SAMPLE.filename,
        fileType: SAMPLE.fileType,
        date: SAMPLE.date,
        genre: SAMPLE.genre,
        tracklistText: SAMPLE.tracklist,
        audio: state.audio,
      }

    case 'reset':
      return EMPTY

    case 'restore':
      return action.state
  }
}

const DRAFT_KEY = 'cuegen.draft.v1'

/** Everything except the audio file, which cannot be revived from storage. */
const persisted = (state: State): Omit<State, 'audio'> => {
  const { audio: _audio, ...rest } = state
  return rest
}

const loadDraft = (): State | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<State>
    // Merge over EMPTY so a draft written by an older build still opens.
    return { ...EMPTY, ...parsed, audio: null }
  } catch {
    return null
  }
}

export const useCueState = () => {
  const [state, dispatch] = useReducer(reducer, EMPTY)

  // Restore once on mount, so a reload does not cost the user their work.
  useEffect(() => {
    const draft = loadDraft()
    if (draft) dispatch({ type: 'restore', state: draft })
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(persisted(state)))
      } catch {
        // A full or blocked storage is not worth interrupting anyone over.
      }
    }, 400)
    return () => clearTimeout(id)
  }, [state])

  const tracklist = useMemo(() => parseTracklist(state.tracklistText), [state.tracklistText])
  const timings = useMemo(() => parseTimings(state.timingsText), [state.timingsText])

  const sheet = useMemo(
    () =>
      merge({
        performer: state.performer,
        title: state.title,
        filename: state.filename,
        fileType: state.fileType,
        date: state.date,
        genre: state.genre,
        tracklist,
        timings,
        overrides: state.overrides,
        // Signed, so the whole sheet can slide either way. fromSeconds clamps
        // at zero by design, so the frame count is computed directly here.
        offset: Math.round((Number(state.offsetSeconds) || 0) * FPS),
      }),
    [
      state.performer,
      state.title,
      state.filename,
      state.fileType,
      state.date,
      state.genre,
      state.overrides,
      state.offsetSeconds,
      tracklist,
      timings,
    ],
  )

  const audioDuration = state.audio?.duration ?? null

  const cueText = useMemo(() => serialize(sheet), [sheet])
  const problems = useMemo(
    () => validate({ sheet, timings, audioDuration }),
    [sheet, timings, audioDuration],
  )
  const lengths = useMemo(
    () => trackLengths(sheet.tracks, audioDuration),
    [sheet.tracks, audioDuration],
  )
  const formats = useMemo(() => formatsSeen(timings), [timings])

  const setField = useCallback(
    (field: keyof State, value: string) => dispatch({ type: 'field', field, value }),
    [],
  )

  const setAudio = useCallback((file: File | null, duration: number | null) => {
    if (!file || duration === null) {
      dispatch({ type: 'audio', audio: null })
      return
    }
    dispatch({
      type: 'audio',
      audio: { name: file.name, duration: fromSeconds(duration) },
      filename: file.name,
      fileType: fileTypeFor(file.name),
    })
  }, [])

  return {
    state,
    sheet,
    cueText,
    problems,
    lengths,
    formats,
    timings,
    audioDuration,
    setField,
    setAudio,
    setOverride: useCallback(
      (index: number, patch: Override) => dispatch({ type: 'override', index, patch }),
      [],
    ),
    clearOverride: useCallback(
      (index: number) => dispatch({ type: 'clearOverride', index }),
      [],
    ),
    clearAllOverrides: useCallback(() => dispatch({ type: 'clearAllOverrides' }), []),
    openCue: useCallback((text: string) => dispatch({ type: 'openCue', text }), []),
    loadSample: useCallback(() => dispatch({ type: 'sample' }), []),
    reset: useCallback(() => dispatch({ type: 'reset' }), []),
  }
}

export type CueController = ReturnType<typeof useCueState>
