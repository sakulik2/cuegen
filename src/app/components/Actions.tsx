import { useRef, useState } from 'react'
import { downloadCue, readText } from '../files'
import type { CueController } from '../useCueState'

interface Props {
  readonly controller: CueController
  readonly cueText: string
  readonly hasTracks: boolean
  readonly onSampleLoaded: () => void
}

export const Actions = ({ controller, cueText, hasTracks, onSampleLoaded }: Props) => {
  const { state, openCue, loadSample, reset } = controller
  const picker = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cueText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard is blocked outside a secure context; the text is on screen
      // under Cue text, so there is nothing to recover from.
    }
  }

  return (
    <div className="masthead__actions">
      <input
        ref={picker}
        type="file"
        accept=".cue,text/plain"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) openCue(await readText(file))
        }}
      />

      <button
        type="button"
        className="btn"
        onClick={() => {
          loadSample()
          onSampleLoaded()
        }}
      >
        Load sample
      </button>

      <button type="button" className="btn" onClick={() => picker.current?.click()}>
        Open .cue
      </button>

      {hasTracks && (
        <button type="button" className="btn btn--quiet" onClick={reset}>
          Clear
        </button>
      )}

      <button type="button" className="btn" onClick={() => void copy()} disabled={!hasTracks}>
        {copied ? 'Copied' : 'Copy'}
      </button>

      <button
        type="button"
        className="btn btn--primary"
        disabled={!hasTracks}
        onClick={() => downloadCue(cueText, state.filename || state.title)}
      >
        Save .cue
      </button>
    </div>
  )
}
