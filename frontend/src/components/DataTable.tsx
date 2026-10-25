import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { api, describeError, type Page } from "../lib/api"
import { Alert, Button, Empty, Input, Loading, ReasonModal, Select, useToast } from "./ui"

export type Column<T> = { header: string; render: (row: T) => ReactNode }

export type RowAction<T> = {
  label: string
  show?: (row: T) => boolean
  variant?: "primary" | "secondary" | "danger"
  /** Si défini, un motif est demandé et transmis à `run`. */
  reason?: { title: string; label?: string; required?: boolean; danger?: boolean }
  run: (row: T, reason?: string) => Promise<unknown>
  successMessage?: string
}

export type Filter = { name: string; label: string; options: [string, string][] }

/**
 * Tableau paginé alimenté par l'API. Les permissions restent appliquées côté serveur :
 * ce composant n'affiche que ce que l'API accepte de renvoyer.
 */
export function DataTable<T extends { id: number }>({
  endpoint,
  query,
  columns,
  actions = [],
  filters = [],
  searchable = true,
  refreshKey = 0,
  onRowClick,
  emptyTitle,
  emptyText,
  toolbar,
}: {
  endpoint: string
  query?: Record<string, string | undefined>
  columns: Column<T>[]
  actions?: RowAction<T>[]
  filters?: Filter[]
  searchable?: boolean
  refreshKey?: number
  onRowClick?: (row: T) => void
  emptyTitle?: string
  emptyText?: string
  toolbar?: ReactNode
}) {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [data, setData] = useState<Page<T> | null>(null)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState<number | null>(null)
  const [pending, setPending] = useState<{ action: RowAction<T>; row: T } | null>(null)
  const seq = useRef(0)
  const queryKey = JSON.stringify(query ?? {})

  const load = useCallback(() => {
    const id = ++seq.current
    api<Page<T>>(endpoint, { query: { ...JSON.parse(queryKey), ...filterValues, page, search } })
      .then((d) => {
        if (id !== seq.current) return // réponse périmée
        setData(d)
        setError("")
      })
      .catch((e) => id === seq.current && setError(describeError(e)))
  }, [endpoint, queryKey, filterValues, page, search])

  useEffect(() => {
    const t = window.setTimeout(load, 200)
    return () => window.clearTimeout(t)
  }, [load, reload, refreshKey])

  const execute = async (action: RowAction<T>, row: T, reason?: string) => {
    setBusy(row.id)
    try {
      await action.run(row, reason)
      toast(action.successMessage ?? "Action effectuée.")
      setReload((n) => n + 1)
    } catch (e) {
      toast(describeError(e), "error")
      throw e
    } finally {
      setBusy(null)
    }
  }

  const visible = (row: T) => actions.filter((a) => !a.show || a.show(row))

  return (
    <>
      {(searchable || filters.length > 0 || toolbar) && (
        <div className="table-tools">
          {searchable && (
            <Input
              aria-label="Rechercher"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
              style={{ marginBottom: 0 }}
            />
          )}
          {filters.map((f) => (
            <Select
              key={f.name}
              aria-label={f.label}
              value={filterValues[f.name] ?? ""}
              onChange={(e) => {
                setPage(1)
                setFilterValues((v) => ({ ...v, [f.name]: e.target.value }))
              }}
            >
              <option value="">{f.label} : tous</option>
              {f.options.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          ))}
          {toolbar}
        </div>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      {!data && !error && <Loading />}
      {data && data.results.length === 0 && <Empty title={emptyTitle ?? "Aucun élément"} text={emptyText ?? "Rien à afficher pour le moment."} />}
      {data && data.results.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.header}>{c.header}</th>
                ))}
                {actions.length > 0 && <th aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {data.results.map((row) => (
                <tr
                  key={row.id}
                  className={onRowClick ? "clickable" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.header}>{c.render(row)}</td>
                  ))}
                  {actions.length > 0 && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        {visible(row).map((a) => (
                          <Button
                            key={a.label}
                            size="sm"
                            variant={a.variant ?? "secondary"}
                            disabled={busy === row.id}
                            onClick={() => (a.reason ? setPending({ action: a, row }) : void execute(a, row).catch(() => undefined))}
                          >
                            {a.label}
                          </Button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && (data.next || data.previous) && (
        <div className="pager">
          <Button size="sm" variant="secondary" disabled={!data.previous} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </Button>
          <span>
            Page {page} · {data.count} résultat(s)
          </span>
          <Button size="sm" variant="secondary" disabled={!data.next} onClick={() => setPage((p) => p + 1)}>
            Suivant
          </Button>
        </div>
      )}
      {pending && (
        <ReasonModal
          title={pending.action.reason?.title ?? pending.action.label}
          label={pending.action.reason?.label}
          required={pending.action.reason?.required ?? true}
          danger={pending.action.reason?.danger}
          confirmLabel={pending.action.label}
          onCancel={() => setPending(null)}
          onConfirm={async (reason) => {
            await execute(pending.action, pending.row, reason)
            setPending(null)
          }}
        />
      )}
    </>
  )
}
