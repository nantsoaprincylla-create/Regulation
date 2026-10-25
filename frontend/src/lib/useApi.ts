import { useCallback, useEffect, useRef, useState } from "react"
import { api, describeError } from "./api"

type Query = Record<string, string | number | undefined>

/** Charge une ressource de l'API ; ignore les réponses périmées ; `reload()` relance l'appel. */
export function useApi<T>(path: string | null, options: { query?: Query; auth?: boolean } = {}) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState("")
  const [settled, setSettled] = useState("")
  const [tick, setTick] = useState(0)
  const seq = useRef(0)
  const key = JSON.stringify([path, options.query ?? {}, options.auth ?? true, tick])

  useEffect(() => {
    if (path === null) return
    const id = ++seq.current
    api<T>(path, { query: options.query, auth: options.auth ?? true })
      .then((d) => {
        if (id !== seq.current) return
        setData(d)
        setError("")
      })
      .catch((e) => id === seq.current && setError(describeError(e)))
      .finally(() => id === seq.current && setSettled(key))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const loading = path !== null && settled !== key
  const reload = useCallback(() => setTick((n) => n + 1), [])
  return { data, error, loading, reload }
}
