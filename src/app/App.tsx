import { useState } from 'react'
import { Actions } from './components/Actions'
import { Diagnostics } from './components/Diagnostics'
import { Empty } from './components/Empty'
import { SourcePanel } from './components/SourcePanel'
import { TrackLadder } from './components/TrackLadder'
import { useCueState } from './useCueState'

type View = 'tracks' | 'cue'

export const App = () => {
  const controller = useCueState()
  const { sheet, cueText, problems, loadSample } = controller
  const [view, setView] = useState<View>('tracks')
  // Bumping this replays the ladder's reveal — the one piece of motion here
  // that isn't a direct response to typing.
  const [revealKey, setRevealKey] = useState(0)

  const hasTracks = sheet.tracks.length > 0

  return (
    <div className="shell">
      <header className="masthead">
        <h1 className="wordmark">cuegen</h1>
        <p className="masthead__note">
          Turn a tracklist into a CUE sheet. Everything happens in this tab.
        </p>
        <Actions
          controller={controller}
          cueText={cueText}
          hasTracks={hasTracks}
          onSampleLoaded={() => {
            setView('tracks')
            setRevealKey((n) => n + 1)
          }}
        />
      </header>

      <main className="work">
        <SourcePanel controller={controller} />

        <div className="output">
          {hasTracks ? (
            <>
              <div className="output__head">
                <div className="tabs" role="tablist" aria-label="Output view">
                  <Tab id="tracks" current={view} onSelect={setView}>
                    Tracks
                  </Tab>
                  <Tab id="cue" current={view} onSelect={setView}>
                    Cue text
                  </Tab>
                </div>
                <span className="output__count">
                  {sheet.tracks.length} {sheet.tracks.length === 1 ? 'track' : 'tracks'}
                </span>
              </div>

              {view === 'tracks' ? (
                <div id="panel-tracks" role="tabpanel" aria-labelledby="tab-tracks">
                  <TrackLadder
                    controller={controller}
                    sheet={sheet}
                    problems={problems}
                    revealKey={revealKey}
                  />
                </div>
              ) : (
                <div id="panel-cue" role="tabpanel" aria-labelledby="tab-cue">
                  <pre className="cuetext">{cueText}</pre>
                </div>
              )}

              <Diagnostics problems={problems} />
            </>
          ) : (
            <Empty
              onLoadSample={() => {
                loadSample()
                setRevealKey((n) => n + 1)
              }}
            />
          )}
        </div>
      </main>

      <footer className="colophon">
        <span>No account, no upload, no server. Your files stay on this machine.</span>
        <span>Drafts are kept in this browser until you clear them.</span>
      </footer>
    </div>
  )
}

const TAB_ORDER: View[] = ['tracks', 'cue']

const Tab = ({
  id,
  current,
  onSelect,
  children,
}: {
  id: View
  current: View
  onSelect: (view: View) => void
  children: string
}) => (
  <button
    type="button"
    id={`tab-${id}`}
    role="tab"
    aria-selected={current === id}
    aria-controls={`panel-${id}`}
    tabIndex={current === id ? 0 : -1}
    onClick={() => onSelect(id)}
    onKeyDown={(e) => {
      // Arrow keys move between tabs, as a tablist is expected to.
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
      if (step === 0) return
      e.preventDefault()
      const next = TAB_ORDER[(TAB_ORDER.indexOf(id) + step + TAB_ORDER.length) % TAB_ORDER.length]
      if (next) {
        onSelect(next)
        document.getElementById(`tab-${next}`)?.focus()
      }
    }}
  >
    {children}
  </button>
)
