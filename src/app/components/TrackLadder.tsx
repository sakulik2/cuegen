import { useEffect, useRef, useState } from 'react'
import type { CueSheet } from '../../domain/cue'
import { type Frames, parseIndex, toClock, toIndex } from '../../domain/frames'
import type { Problem } from '../../domain/validate'
import type { CueController } from '../useCueState'

interface Props {
  readonly controller: CueController
  readonly sheet: CueSheet
  readonly problems: readonly Problem[]
  readonly revealKey: number
}

/**
 * The tracks, as a staircase.
 *
 * Every bar sits in one shared coordinate space — left edge is the track's
 * INDEX, width is the run to the next one — so the column as a whole shows how
 * the recording is divided. An even set climbs steadily; a line that parsed
 * wrong breaks the step or collapses to nothing, which is quicker to catch than
 * reading a column of timecodes.
 */
export const TrackLadder = ({ controller, sheet, problems, revealKey }: Props) => {
  const { lengths, audioDuration, setOverride, clearOverride, clearAllOverrides, state } = controller
  const tracks = sheet.tracks

  // The span the bars are drawn against: the real file length when we know it,
  // otherwise the last track's start with room to read the final bar.
  const last = tracks.at(-1)?.time ?? 0
  const span = audioDuration ?? Math.max(last * 1.08, 1)

  const flagged = new Set(
    problems.filter((p) => p.severity === 'error' && p.track).map((p) => p.track),
  )
  const edited = Object.keys(state.overrides).length > 0

  return (
    <div className={`ladder${revealKey > 0 ? ' ladder--revealing' : ''}`} key={revealKey}>
      <div>
        {tracks.map((track, i) => {
          const length = lengths[i] ?? null
          const left = clamp((track.time / span) * 100)
          const width = length === null ? 1.5 : Math.max(clamp((length / span) * 100), 0.4)
          const past = audioDuration !== null && track.time > audioDuration

          return (
            <div
              className={`ladder__row${flagged.has(track.track) ? ' ladder__row--flagged' : ''}`}
              key={track.track}
              role="row"
            >
              <span className="ladder__num" aria-hidden="true">
                {String(track.track).padStart(2, '0')}
              </span>

              <input
                className={`ladder__title${track.titleOverridden ? ' ladder__title--edited' : ''}`}
                value={track.title}
                aria-label={`Title of track ${track.track}`}
                onChange={(e) => setOverride(i, { title: e.target.value })}
                placeholder="Untitled"
              />

              <span
                className="ladder__track"
                aria-hidden="true"
                title={
                  length === null
                    ? toClock(track.time)
                    : `${toClock(track.time)}, runs ${toClock(length)}`
                }
              >
                <span
                  className={`ladder__bar${past ? ' ladder__bar--over' : ''}`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    animationDelay: `${Math.min(i * 12, 400)}ms`,
                  }}
                />
              </span>

              <TimeCell
                time={track.time}
                edited={track.timeFrom === 'override'}
                label={`Start of track ${track.track}`}
                onCommit={(value) => setOverride(i, { time: value })}
                onRevert={() => clearOverride(i)}
              />
            </div>
          )
        })}
      </div>

      <p className="ladder__legend">
        <span>
          {audioDuration === null
            ? 'Bars are scaled to the last track. Drop the audio file in for real proportions.'
            : `Bars are scaled to the full ${toClock(audioDuration)}.`}
        </span>
        {edited && (
          <button type="button" className="btn btn--quiet" onClick={clearAllOverrides}>
            Undo my edits
          </button>
        )}
      </p>
    </div>
  )
}

/**
 * A timecode the user can type over.
 *
 * Edits are held as text while the field has focus — a half-typed `04:1` is not
 * a timecode and should not be rejected mid-keystroke — and only committed as
 * frames on blur or Enter.
 */
const TimeCell = ({
  time,
  edited,
  label,
  onCommit,
  onRevert,
}: {
  time: Frames
  edited: boolean
  label: string
  onCommit: (value: Frames) => void
  onRevert: () => void
}) => {
  const formatted = toIndex(time)
  const [draft, setDraft] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (document.activeElement !== input.current) setDraft(null)
  }, [formatted])

  const commit = () => {
    if (draft === null) return
    const parsed = parseIndex(draft)
    if (parsed !== null && parsed !== time) onCommit(parsed)
    setDraft(null)
  }

  return (
    <input
      ref={input}
      className={`ladder__time${edited ? ' ladder__time--edited' : ''}`}
      inputMode="numeric"
      aria-label={label}
      value={draft ?? formatted}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit()
          input.current?.blur()
        }
        if (e.key === 'Escape') {
          setDraft(null)
          if (edited) onRevert()
        }
      }}
    />
  )
}

const clamp = (n: number): number => Math.min(Math.max(n, 0), 100)
