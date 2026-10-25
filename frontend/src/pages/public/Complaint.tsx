import { useState, type FormEvent } from "react"
import { Alert, Badge, Button, Card, Input, Select, Tabs, Textarea } from "../../components/ui"
import { api, describeError } from "../../lib/api"
import { fmtDateTime, label } from "../../lib/format"
import { useApi } from "../../lib/useApi"

type Region = { id: number; name: string; cities: { id: number; name: string }[] }
type Overview = { operators: string[] }
type Tracked = { reference: string; status: string; category: string; conclusion: string; messages: { author_kind: string; content: string; created_at: string }[] }

const CATEGORIES = ["Qualité du réseau", "Facturation", "Service client", "Offre ou promotion", "Autre"]

export default function ComplaintPage() {
  const [tab, setTab] = useState<"new" | "track">("new")
  return (
    <div className="container narrow section" style={{ paddingTop: 36 }}>
      <header className="page-head">
        <div>
          <span className="eyebrow">Réclamation</span>
          <h1>Signaler un problème</h1>
          <p>Aucun compte n’est nécessaire. Vous recevrez un jeton de suivi, affiché une seule fois.</p>
        </div>
      </header>
      <Tabs
        tabs={[
          ["new", "Déposer"],
          ["track", "Suivre ma réclamation"],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "new" ? <NewComplaint /> : <Track />}
    </div>
  )
}

function NewComplaint() {
  const regions = useApi<Region[]>("/organizations/regions/", { auth: false })
  const overview = useApi<Overview>("/analytics/public/overview/", { auth: false })
  const [f, setF] = useState({ complaint_type: "PUBLIC_COMPLAINT", category: CATEGORIES[0], description: "", target_operator: "", region: "", city: "", contact_email: "", website: "" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [receipt, setReceipt] = useState<{ reference: string; tracking_token: string } | null>(null)
  const set = (k: keyof typeof f, v: string) => setF((o) => ({ ...o, [k]: v }))
  const cities = regions.data?.find((r) => String(r.id) === f.region)?.cities ?? []

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      const r = await api<{ reference: string; tracking_token: string }>("/complaints/public/", {
        method: "POST",
        auth: false,
        body: {
          ...f,
          target_operator: f.target_operator || null,
          region: f.region ? Number(f.region) : null,
          city: f.city ? Number(f.city) : null,
        },
      })
      setReceipt(r)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  if (receipt)
    return (
      <Card>
        <Alert tone="success">Votre réclamation a bien été enregistrée.</Alert>
        <dl className="kv">
          <dt>Référence</dt>
          <dd>
            <strong>{receipt.reference}</strong>
          </dd>
          <dt>Jeton de suivi</dt>
          <dd>
            <code style={{ wordBreak: "break-all" }}>{receipt.tracking_token}</code>
          </dd>
        </dl>
        <Alert tone="warn">Conservez ce jeton maintenant : il ne sera plus affiché et ne peut pas être retrouvé.</Alert>
      </Card>
    )

  return (
    <Card>
      <form onSubmit={submit}>
        <div className="form-grid">
          <Select label="Nature" value={f.complaint_type} onChange={(e) => set("complaint_type", e.target.value)}>
            <option value="PUBLIC_COMPLAINT">Réclamation</option>
            <option value="REPORT">Signalement</option>
          </Select>
          <Select label="Catégorie" value={f.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select label="Opérateur concerné" value={f.target_operator} onChange={(e) => set("target_operator", e.target.value)}>
            <option value="">Non précisé</option>
            {overview.data?.operators.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
          <Select label="Région" value={f.region} onChange={(e) => setF((o) => ({ ...o, region: e.target.value, city: "" }))}>
            <option value="">Non précisée</option>
            {regions.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
          <Select label="Ville" disabled={!f.region} value={f.city} onChange={(e) => set("city", e.target.value)}>
            <option value="">Non précisée</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Textarea label="Description (10 caractères minimum)" required minLength={10} maxLength={4000} value={f.description} onChange={(e) => set("description", e.target.value)} hint="N’indiquez pas de données personnelles inutiles." />
        <Input label="E-mail de contact (facultatif)" type="email" value={f.contact_email} onChange={(e) => set("contact_email", e.target.value)} hint="Utilisé uniquement si l’ARTEC doit vous demander des précisions." />
        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={(e) => set("website", e.target.value)} style={{ position: "absolute", left: "-9999px" }} />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" loading={busy}>
          Envoyer la réclamation
        </Button>
      </form>
    </Card>
  )
}

function Track() {
  const [reference, setReference] = useState("")
  const [token, setToken] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [res, setRes] = useState<Tracked | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError("")
    setRes(null)
    try {
      setRes(await api<Tracked>("/complaints/public/track/", { method: "POST", auth: false, body: { reference: reference.trim(), token: token.trim() } }))
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card>
      <form onSubmit={submit}>
        <Input label="Référence" required value={reference} onChange={(e) => setReference(e.target.value)} />
        <Input label="Jeton de suivi" required value={token} onChange={(e) => setToken(e.target.value)} />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" loading={busy}>
          Consulter
        </Button>
      </form>
      {res && (
        <div style={{ marginTop: 20 }}>
          <h3>
            {res.reference} <Badge tone="blue">{label(res.status)}</Badge>
          </h3>
          <p className="muted">Catégorie : {res.category}</p>
          {res.conclusion && <Alert tone="info">{res.conclusion}</Alert>}
          <ul className="timeline">
            {res.messages.map((m, i) => (
              <li key={i}>
                <strong>{m.author_kind === "PUBLIC" ? "Vous" : "ARTEC / opérateur"}</strong>
                <small>{fmtDateTime(m.created_at)}</small>
                <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
