// Dedicated presentation deployment only; regular staging uses worker/index.ts.
import { createPresentationApp } from './presentation-local'
export default createPresentationApp('hosted')
