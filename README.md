# cuegen

Turn a tracklist into a CUE sheet, in the browser.

A CUE sheet is the index that sits next to one long audio file — a DJ set, a
radio show, a vinyl side — telling a player where each track begins. Writing one
by hand is tedious because the timecodes are `MM:SS:FF`, where a frame is 1/75 of
a second and hours have to be folded into minutes.

Paste the tracklist, optionally paste a region export from your audio editor for
frame-exact cuts, and save the `.cue`.

**Live site:** `https://sakulik2.github.io/cuegen/` once Pages is enabled
(see [Deploying](#deploying)).

## What it does

- **Reads the formats editors actually write.** Region and marker exports from
  Audacity, Adobe Audition, Sound Forge, Nero and Winamp, plus raw CUE indexes
  and hand-typed `mm:ss`. Each line reports which format it was read as.
- **Says when it cannot read a line.** An unrecognized line is named with its
  line number and its text, instead of quietly becoming `00:00:00`.
- **Shows the shape of the recording.** Each track's bar sits in one shared
  timeline, so the tracks form a staircase. A misparsed line breaks the step.
- **Checks the timings against the audio.** Drop the recording in and cuegen
  reads its duration to catch tracks that start past the end of the file. Only
  the duration is read, never the samples.
- **Opens existing sheets.** Drop a `.cue` in to edit it.
- **Runs entirely in your browser.** No account, no upload, no server. Drafts
  are kept in local storage.

Output carries a UTF-8 BOM and CRLF line endings, which older players such as
foobar2000 need to read non-ASCII titles correctly.

## Development

```bash
npm install
npm run dev       # dev server
npm test          # domain tests
npm run build     # typecheck + production build to dist/
```

The domain layer under `src/domain/` has no DOM or React dependency, so it runs
directly under Node:

| File | Job |
| --- | --- |
| `frames.ts` | Timecodes as a single integer frame count, and the CUE/clock formats |
| `timings.ts` | One recognizer per editor export format, with per-line results |
| `tracklist.ts` | Tracklist text into performer, title and time |
| `cue.ts` | Merging the sources into a sheet, and serializing it |
| `parseCue.ts` | Reading a `.cue` back into the editor's own inputs |
| `validate.ts` | Diagnostics shown under the track table |

Times are held as a frame count (`Frames`, 75 per second) everywhere but the
parse and serialize boundaries, so offsets, durations and ordering are plain
integer arithmetic.

## Deploying

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`, after the same typecheck, test and build gates
that CI runs. Enable it once under **Settings → Pages → Build and deployment →
Source: GitHub Actions**.

The build uses relative asset paths, so it works from a project subpath
(`user.github.io/cuegen/`) as well as from a domain root — no `base` to
configure.

## Credit

A rewrite of [cuegenerator](https://github.com/dVaffection/cuegenerator) by
Dmitry Varennikov, whose timecode recognizers this keeps. The original was a
PHP-and-jQuery site from 2013; the format knowledge in it was worth carrying
forward.

## License

ISC
