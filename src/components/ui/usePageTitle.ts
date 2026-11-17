import { useEffect } from 'react'

const APP_NAME = 'Restaurant Simulation'

/** Sets the browser tab title, e.g. "Results · Restaurant Simulation". */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])
}
