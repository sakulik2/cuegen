/** An empty screen is an invitation, so it says what to do and offers a way in. */
export const Empty = ({ onLoadSample }: { onLoadSample: () => void }) => (
  <div className="empty">
    <h2>Start with a tracklist</h2>
    <p>
      Paste one track per line, like <code>04:12 Artist - Title</code>. Times can be{' '}
      <code>mm:ss</code> or <code>h:mm:ss</code>, and a leading track number is fine.
    </p>
    <p>
      For frame-exact cuts, export the regions or markers from your editor and paste those into
      Timings. Audacity, Audition, Sound Forge, Nero and Winamp formats are all read as-is.
    </p>
    <button type="button" className="btn" onClick={onLoadSample}>
      Load a sample set
    </button>
  </div>
)
