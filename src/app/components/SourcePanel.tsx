import { FILE_TYPES } from '../../domain/cue'
import { formatsSeen } from '../../domain/timings'
import type { CueController } from '../useCueState'
import { AudioDrop } from './AudioDrop'

export const SourcePanel = ({ controller }: { controller: CueController }) => {
  const { state, setField, timings } = controller
  const unreadable = timings.filter((r) => !r.ok).length
  const recognized = timings.length - unreadable
  const formats = formatsSeen(timings)

  return (
    <div className="source">
      <div className="field">
        <label htmlFor="performer">Performer</label>
        <input
          id="performer"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={state.performer}
          onChange={(e) => setField('performer', e.target.value)}
          placeholder="Who made the recording"
        />
      </div>

      <div className="field">
        <label htmlFor="album">Album title</label>
        <input
          id="album"
          type="text"
          autoComplete="off"
          value={state.title}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="What the whole recording is called"
        />
      </div>

      <div className="field__row">
        <div className="field">
          <label htmlFor="date">Year</label>
          <input
            id="date"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={state.date}
            onChange={(e) => setField('date', e.target.value)}
            placeholder="2024"
          />
        </div>
        <div className="field">
          <label htmlFor="genre">Genre</label>
          <input
            id="genre"
            type="text"
            autoComplete="off"
            value={state.genre}
            onChange={(e) => setField('genre', e.target.value)}
            placeholder="Ambient"
          />
        </div>
      </div>

      <AudioDrop controller={controller} />

      <div className="field__row">
        <div className="field">
          <label htmlFor="filename">Audio file name</label>
          <input
            id="filename"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={state.filename}
            onChange={(e) => setField('filename', e.target.value)}
            placeholder="mix.flac"
          />
        </div>
        <div className="field">
          <label htmlFor="filetype">File type</label>
          <select
            id="filetype"
            value={state.fileType}
            onChange={(e) => setField('fileType', e.target.value)}
          >
            {FILE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <div className="field__head">
          <label htmlFor="tracklist">Tracklist</label>
          <span className="field__hint">One track per line</span>
        </div>
        <textarea
          id="tracklist"
          rows={8}
          spellCheck={false}
          value={state.tracklistText}
          onChange={(e) => setField('tracklistText', e.target.value)}
          placeholder={'04:12 Artist - Title\n09:48 Artist - Title'}
        />
      </div>

      <div className="field">
        <div className="field__head">
          <label htmlFor="timings">Timings</label>
          <span className={hintClass(unreadable, recognized)}>{hint(unreadable, recognized, formats)}</span>
        </div>
        <textarea
          id="timings"
          rows={6}
          spellCheck={false}
          value={state.timingsText}
          onChange={(e) => setField('timingsText', e.target.value)}
          placeholder={'Paste a region export for exact frames\n0.000000\t252.480000\tHarbour Lights'}
        />
      </div>

      <div className="offset">
        <label htmlFor="offset">Shift every track</label>
        <input
          id="offset"
          type="number"
          step="0.1"
          value={state.offsetSeconds}
          onChange={(e) => setField('offsetSeconds', e.target.value)}
        />
        <span className="offset__unit">seconds</span>
      </div>
    </div>
  )
}

const hintClass = (unreadable: number, recognized: number): string => {
  if (unreadable > 0) return 'field__hint field__hint--bad'
  if (recognized > 0) return 'field__hint field__hint--ok'
  return 'field__hint'
}

const hint = (unreadable: number, recognized: number, formats: string[]): string => {
  if (unreadable > 0) {
    return `${unreadable} ${unreadable === 1 ? 'line' : 'lines'} not read`
  }
  if (recognized === 0) return 'Optional'
  const from = formats.length === 1 ? formats[0] : `${formats.length} formats`
  return `${recognized} from ${from}`
}
