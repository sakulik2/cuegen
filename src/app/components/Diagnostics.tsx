import { useState } from 'react'
import type { Problem } from '../../domain/validate'

const SHOWN = 6

/**
 * Problems, stated plainly.
 *
 * The old generator's failure mode was silence — an unreadable line became
 * 00:00:00 and the output looked correct. Every problem here names what
 * happened and, where it isn't obvious, what to do about it.
 */
export const Diagnostics = ({ problems }: { problems: readonly Problem[] }) => {
  const [expanded, setExpanded] = useState(false)
  if (problems.length === 0) return null

  const visible = expanded ? problems : problems.slice(0, SHOWN)
  const hidden = problems.length - visible.length

  return (
    <div aria-live="polite">
      <ul className="problems">
        {visible.map((problem, i) => (
          <li className={`problem problem--${problem.severity}`} key={`${problem.message}-${i}`}>
            <span className="problem__mark" aria-hidden="true">
              {problem.severity === 'error' ? '!' : '?'}
            </span>
            <span>
              <span className="sr-only">
                {problem.severity === 'error' ? 'Error. ' : 'Check. '}
              </span>
              {problem.message}
              {problem.fix && <span className="problem__fix"> {problem.fix}</span>}
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <p className="problems__more">
          <button type="button" className="btn btn--quiet" onClick={() => setExpanded(true)}>
            Show {hidden} more
          </button>
        </p>
      )}
    </div>
  )
}
