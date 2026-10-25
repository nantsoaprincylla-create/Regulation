import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react"
import { Link, type LinkProps } from "react-router"
import { AlertTriangle, CheckCircle2, Info, Inbox, LoaderCircle, X, XCircle } from "lucide-react"
import { describeError } from "../lib/api"
import { label, toneOf, type Tone } from "../lib/format"

/* ---------- Boutons ---------- */
type Variant = "primary" | "secondary" | "ghost" | "danger"

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; loading?: boolean }) {
  return (
    <button type={type} className={`btn btn-${variant} btn-${size} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <LoaderCircle size={16} className="spin" aria-hidden />}
      {children}
    </button>
  )
}

export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  ...props
}: LinkProps & { variant?: Exclude<Variant, "danger"> }) {
  return (
    <Link className={`btn btn-${variant} btn-md ${className}`} {...props}>
      {children}
    </Link>
  )
}

/* ---------- Conteneurs ---------- */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}

export function CardHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="card-head">
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function Stat({ label: l, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "warn" | "alert" }) {
  return (
    <div className={`card stat ${tone === "warn" ? "warn" : tone === "alert" ? "alert-tone" : ""}`}>
      <small>{l}</small>
      <strong>{value}</strong>
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

/* ---------- Badges ---------- */
export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

/** Affiche le libellé français et la couleur associés à un code d'état de l'API. */
export function Status({ code }: { code?: string | null }) {
  return <Badge tone={toneOf(code)}>{label(code)}</Badge>
}

/* ---------- Alertes / états ---------- */
export function Alert({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "success"; children: ReactNode }) {
  const Icon = tone === "error" ? XCircle : tone === "warn" ? AlertTriangle : tone === "success" ? CheckCircle2 : Info
  return (
    <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon size={18} aria-hidden />
      <div>{children}</div>
    </div>
  )
}

export function Loading({ text = "Chargement…" }: { text?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={20} aria-hidden /> {text}
    </div>
  )
}

export function Empty({ title = "Aucun élément", text, children }: { title?: string; text?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Inbox size={34} aria-hidden />
      <strong>{title}</strong>
      {text && <div>{text}</div>}
      {children}
    </div>
  )
}

/* ---------- Champs de formulaire ---------- */
function Field({ label: l, hint, error, id, children }: { label?: string; hint?: string; error?: string; id: string; children: ReactNode }) {
  return (
    <div className="field">
      {l && (
        <label className="field-label" htmlFor={id}>
          {l}
        </label>
      )}
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function Input({ label: l, hint, error, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }) {
  const id = useId()
  return (
    <Field label={l} hint={hint} error={error} id={id}>
      <input id={id} className={`input ${error ? "input-error" : ""} ${className}`} {...props} />
    </Field>
  )
}

export function Textarea({ label: l, hint, error, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string; error?: string }) {
  const id = useId()
  return (
    <Field label={l} hint={hint} error={error} id={id}>
      <textarea id={id} className={`input ${error ? "input-error" : ""}`} {...props} />
    </Field>
  )
}

export function Select({ label: l, hint, error, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string; error?: string }) {
  const id = useId()
  return (
    <Field label={l} hint={hint} error={error} id={id}>
      <select id={id} className={`input ${error ? "input-error" : ""}`} {...props}>
        {children}
      </select>
    </Field>
  )
}

export function Checkbox({ children, checked, onChange }: { children: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  )
}

export function FileInput({ label: l, accept, onChange, hint }: { label: string; accept?: string; hint?: string; onChange: (f: File | null) => void }) {
  const id = useId()
  return (
    <Field label={l} hint={hint} id={id}>
      <input id={id} className="input" type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
    </Field>
  )
}

/* ---------- Modale accessible ---------- */
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    ref.current?.querySelector<HTMLElement>("input, textarea, select, button.btn-primary")?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
      previous?.focus()
    }
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-head">
          <h3 id={titleId}>{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </Button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

/** Demande un motif avant une action (remplace window.prompt). */
export function ReasonModal({
  title,
  label: l = "Motif",
  required = true,
  confirmLabel = "Confirmer",
  danger,
  onCancel,
  onConfirm,
}: {
  title: string
  label?: string
  required?: boolean
  confirmLabel?: string
  danger?: boolean
  onCancel: () => void
  onConfirm: (reason: string) => Promise<void>
}) {
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const go = async () => {
    setBusy(true)
    setError("")
    try {
      await onConfirm(text.trim())
    } catch (e) {
      setError(describeError(e))
      setBusy(false)
    }
  }
  return (
    <Modal title={title} onClose={onCancel}>
      <Textarea label={l} value={text} onChange={(e) => setText(e.target.value)} />
      {error && <Alert tone="error">{error}</Alert>}
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button variant={danger ? "danger" : "primary"} loading={busy} disabled={required && text.trim().length < 3} onClick={go}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

/* ---------- Onglets ---------- */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(([key, text]) => (
        <button key={key} role="tab" aria-selected={value === key} className={`tab ${value === key ? "active" : ""}`} onClick={() => onChange(key)}>
          {text}
        </button>
      ))}
    </div>
  )
}

/* ---------- Barre de répartition GOOD / MEDIUM / POOR ---------- */
export function DistributionBar({ values }: { values: { GOOD: number; MEDIUM: number; POOR: number } }) {
  const total = values.GOOD + values.MEDIUM + values.POOR
  const colors = { GOOD: "var(--green)", MEDIUM: "#d98e04", POOR: "var(--red)" } as const
  return (
    <div>
      <div className="dist-bar" role="img" aria-label={`Bonne ${values.GOOD}, moyenne ${values.MEDIUM}, mauvaise ${values.POOR}`}>
        {(["GOOD", "MEDIUM", "POOR"] as const).map((k) => (
          <span key={k} style={{ width: total ? `${(100 * values[k]) / total}%` : 0, background: colors[k] }} />
        ))}
      </div>
      <div className="dist-legend">
        {(["GOOD", "MEDIUM", "POOR"] as const).map((k) => (
          <span key={k}>
            <i style={{ background: colors[k] }} />
            {label(k)} · {total ? Math.round((100 * values[k]) / total) : 0} %
          </span>
        ))}
      </div>
    </div>
  )
}

/* ---------- Notifications (toasts) ---------- */
type ToastKind = "success" | "error" | "info"
type ToastApi = { notify: (message: string, kind?: ToastKind) => void }
const ToastCtx = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; message: string; kind: ToastKind }[]>([])
  const notify = useCallback((message: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random()
    setItems((list) => [...list, { id, message, kind }])
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 5000)
  }, [])
  const value = useMemo(() => ({ notify }), [notify])
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 200, display: "grid", gap: 8, maxWidth: 380 }} aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`alert alert-${t.kind === "info" ? "info" : t.kind}`} style={{ margin: 0, boxShadow: "var(--shadow-lg)" }}>
            {t.kind === "error" ? <XCircle size={18} /> : t.kind === "success" ? <CheckCircle2 size={18} /> : <Info size={18} />}
            <div>{t.message}</div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error("useToast doit être utilisé dans <ToastProvider>")
  return ctx.notify
}
