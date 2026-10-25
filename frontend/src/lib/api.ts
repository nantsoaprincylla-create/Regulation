/**
 * Client HTTP du backend Django REST Framework.
 * - Jeton d'accès conservé en mémoire ; jeton de renouvellement en sessionStorage (effacé à la fermeture de l'onglet).
 * - Renouvellement automatique sur 401, une seule tentative.
 * - Le rôle affiché vient TOUJOURS de GET /auth/me/ : le backend reste seul juge des permissions.
 */
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000/api/v1"

const REFRESH_KEY = "qos.refresh"
let accessToken: string | null = null

export type ApiErrorBody = { error?: { code: string; message: string; details?: unknown } }

export class ApiError extends Error {
  status: number
  code: string
  details: unknown
  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.error?.message ?? `Erreur ${status}`)
    this.status = status
    this.code = body?.error?.code ?? "error"
    this.details = body?.error?.details ?? null
  }
}

export const tokens = {
  set(access: string, refresh?: string) {
    accessToken = access
    if (refresh) sessionStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    accessToken = null
    sessionStorage.removeItem(REFRESH_KEY)
  },
  get refresh() {
    return sessionStorage.getItem(REFRESH_KEY)
  },
  get access() {
    return accessToken
  },
}

async function refreshAccess(): Promise<boolean> {
  const refresh = tokens.refresh
  if (!refresh) return false
  const res = await fetch(`${API_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  })
  if (!res.ok) {
    tokens.clear()
    return false
  }
  const data = await res.json()
  tokens.set(data.access, data.refresh)
  return true
}

type Options = { method?: string; body?: unknown; auth?: boolean; query?: Record<string, string | number | undefined> }

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, auth = true, query } = opts
  const qs = query
    ? "?" + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString()
    : ""
  const doFetch = () => {
    const headers: Record<string, string> = {}
    if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`
    if (body !== undefined && !(body instanceof FormData)) headers["Content-Type"] = "application/json"
    return fetch(`${API_URL}${path}${qs}`, {
      method,
      headers,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    })
  }
  let res = await doFetch()
  if (res.status === 401 && auth && (await refreshAccess())) res = await doFetch()
  if (res.status === 204) return undefined as T
  const text = await res.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null // réponse non JSON (ex. page d'erreur 500)
  }
  if (!res.ok) throw new ApiError(res.status, data as ApiErrorBody | null)
  return data as T
}

/** Pagination DRF */
export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] }

const FIELD_LABELS: Record<string, string> = {
  non_field_errors: "",
  detail: "",
  title: "Titre",
  content: "Contenu",
  name: "Nom",
  email: "E-mail",
  password: "Mot de passe",
  new_password: "Nouveau mot de passe",
  file: "Fichier",
  region: "Région",
  city: "Ville",
  description: "Description",
  justification: "Justification",
  comment: "Motif",
  evidence: "Éléments de preuve",
  due_date: "Échéance",
  url: "Adresse",
  category: "Catégorie",
}

function flatten(value: unknown): string {
  if (Array.isArray(value)) return value.map(flatten).join(" ")
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => {
        const lbl = FIELD_LABELS[k] ?? k
        return lbl ? `${lbl} : ${flatten(v)}` : flatten(v)
      })
      .join(" · ")
  }
  return String(value)
}

/** Convertit une erreur de l'API en message lisible. */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return "Trop de requêtes : patientez un instant avant de réessayer."
    if (err.status === 403 && err.code === "error") return "Votre rôle ne permet pas cette opération."
    if (err.details) {
      const text = flatten(err.details)
      if (text) return text
    }
    return err.message
  }
  return "Le serveur est injoignable. Vérifiez votre connexion."
}

/** Télécharge un fichier protégé (ex. export CSV) avec le jeton courant. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const doFetch = () => fetch(`${API_URL}${path}`, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} })
  let res = await doFetch()
  if (res.status === 401 && (await refreshAccess())) res = await doFetch()
  if (!res.ok) throw new ApiError(res.status, null)
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
