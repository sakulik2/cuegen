import { useId, useRef, useState } from 'react'
import { toClock } from '../../domain/frames'
import { readDuration } from '../files'
import type { CueController } from '../useCueState'

/**
 * Dropping the recording in is what makes the ladder trustworthy: the bars can
 * be scaled against the real length of the file instead of against the last
 * track, and a track past the end becomes visible rather than theoretical.
 *
 * Only the duration is read — never the samples.
 */
export const AudioDrop = ({ controller }: { controller: CueController }) => {
  const { state, setAudio } = controller
  const [over, setOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const id = useId()

  const accept = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      const duration = await readDuration(file)
      setAudio(file, duration)
    } catch {
      setAudio(null, null)
      setError(`${file.name} is not audio this browser can read.`)
    }
  }

  const loaded = state.audio !== null

  return (
    <div className="field">
      <div className="field__head">
        <label htmlFor={id}>Audio file</label>
        {loaded && (
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => {
              setAudio(null, null)
              setError(null)
            }}
          >
            Remove
          </button>
        )}
      </div>

      <div
        className={['drop', over && 'drop--over', loaded && 'drop--loaded']
          .filter(Boolean)
          .join(' ')}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          void accept(e.dataTransfer.files[0])
        }}
      >
        <input
          ref={input}
          id={id}
          type="file"
          accept="audio/*,.flac,.ape,.wv"
          className="sr-only"
          onChange={(e) => {
            void accept(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {state.audio ? (
          <>
            <span className="drop__name">{state.audio.name}</span>
            <span className="drop__meta">{toClock(state.audio.duration)} long</span>
          </>
        ) : (
          <>
            <span>Drop the recording here to check the timings fit</span>
            <span className="drop__meta">Nothing is uploaded</span>
          </>
        )}
      </div>

      {error && <span className="field__hint field__hint--bad">{error}</span>}
    </div>
  )
}
