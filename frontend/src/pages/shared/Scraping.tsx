import { useState, type FormEvent } from "react"
import { Plus } from "lucide-react"
import { Alert, Button, Card, Input, Loading, Modal, PageHeader, Select, Status, Tabs, Textarea, useToast } from "../../components/ui"
import { DataTable } from "../../components/DataTable"
import { api, describeError } from "../../lib/api"
import { fmtDateTime, fmtNumber, label } from "../../lib/format"
import { useApi } from "../../lib/useApi"

type Source = { id: number; name: string; base_url: string; notes: string }
type Job = { id: number; name: string; source: number; url: string; frequency: string; status: string; last_run_at: string | null; items_collected: number; error_count: number }
type Rec = { id: number; job: number; source_url: string; http_status: number; fetched_at: string; validation_status: string; data: unknown }

export function ScrapingPage() {
  const status = useApi<{ configured: boolean; allowed_domains: string[]; message: string }>("/scraping/status/")
  const [tab, setTab] = useState<"jobs" | "sources" | "records">("jobs")
  return (
    <>
      <PageHeader eyebrow="Collecte" title="Web scraping" subtitle="Chaque organisme collecte uniquement ses propres données, depuis des domaines autorisés par l’administrateur." />
      {status.loading && !status.data && <Loading />}
      {status.data && !status.data.configured && <Alert tone="warn">{status.data.message} Contactez l’administrateur pour configurer SCRAPING_ALLOWED_DOMAINS.</Alert>}
      {status.data?.configured && <Alert tone="info">Domaines autorisés : {status.data.allowed_domains.join(", ")}</Alert>}
      <Tabs tabs={[["jobs", "Tâches"], ["sources", "Sources"], ["records", "Données collectées"]]} value={tab} onChange={setTab} />
      {tab === "jobs" && <Jobs />}
      {tab === "sources" && <Sources />}
      {tab === "records" && <Records />}
    </>
  )
}

function Sources() {
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [f, setF] = useState({ name: "", base_url: "", notes: "" })
  const [error, setError] = useState("")
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      await api("/scraping/sources/", { method: "POST", body: f })
      toast("Source ajoutée.")
      setCreating(false)
      setF({ name: "", base_url: "", notes: "" })
      setRefresh((n) => n + 1)
    } catch (err) {
      setError(describeError(err))
    }
  }
  return (
    <Card>
      <div className="card-head"><h3>Sources</h3><Button onClick={() => setCreating(true)}><Plus size={16} /> Ajouter</Button></div>
      <DataTable<Source> endpoint="/scraping/sources/" refreshKey={refresh} columns={[
        { header: "Nom", render: (s) => <strong>{s.name}</strong> },
        { header: "Adresse", render: (s) => s.base_url },
        { header: "Notes", render: (s) => s.notes || "—" },
      ]} emptyTitle="Aucune source" />
      {creating && (
        <Modal title="Nouvelle source" onClose={() => setCreating(false)}>
          <form onSubmit={submit}>
            <Input label="Nom" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <Input label="Adresse de base" type="url" required value={f.base_url} onChange={(e) => setF({ ...f, base_url: e.target.value })} />
            <Textarea label="Notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
            {error && <Alert tone="error">{error}</Alert>}
            <div className="form-actions"><Button variant="secondary" onClick={() => setCreating(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
          </form>
        </Modal>
      )}
    </Card>
  )
}

function Jobs() {
  const toast = useToast()
  const sources = useApi<{ results: Source[] }>("/scraping/sources/")
  const [creating, setCreating] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [f, setF] = useState({ name: "", source: "", url: "", frequency: "MANUAL", data_type: "web_page" })
  const [error, setError] = useState("")
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      await api("/scraping/jobs/", { method: "POST", body: { ...f, source: Number(f.source) } })
      toast("Tâche créée.")
      setCreating(false)
      setRefresh((n) => n + 1)
    } catch (err) {
      setError(describeError(err))
    }
  }
  return (
    <Card>
      <div className="card-head"><h3>Tâches de collecte</h3><Button onClick={() => setCreating(true)} disabled={!sources.data?.results.length}><Plus size={16} /> Nouvelle tâche</Button></div>
      {sources.data && sources.data.results.length === 0 && <Alert tone="info">Ajoutez d’abord une source dans l’onglet « Sources ».</Alert>}
      <DataTable<Job>
        endpoint="/scraping/jobs/"
        refreshKey={refresh}
        columns={[
          { header: "Tâche", render: (j) => <div><strong>{j.name}</strong><br /><small>{j.url}</small></div> },
          { header: "Fréquence", render: (j) => label(j.frequency) },
          { header: "Statut", render: (j) => <Status code={j.status} /> },
          { header: "Dernier résultat", render: (j) => <span>{fmtDateTime(j.last_run_at)}<br /><small>{fmtNumber(j.items_collected)} élément(s) · {j.error_count} erreur(s)</small></span> },
        ]}
        actions={[
          { label: "Exécuter", variant: "primary", show: (j) => j.status === "ACTIVE", run: (j) => api(`/scraping/jobs/${j.id}/run/`, { method: "POST" }), successMessage: "Exécution terminée." },
          { label: "Mettre en pause", show: (j) => j.status === "ACTIVE", run: (j) => api(`/scraping/jobs/${j.id}/`, { method: "PATCH", body: { status: "PAUSED" } }) },
          { label: "Réactiver", show: (j) => j.status === "PAUSED", run: (j) => api(`/scraping/jobs/${j.id}/`, { method: "PATCH", body: { status: "ACTIVE" } }) },
        ]}
        emptyTitle="Aucune tâche"
      />
      {creating && (
        <Modal title="Nouvelle tâche de collecte" onClose={() => setCreating(false)}>
          <form onSubmit={submit}>
            <Input label="Nom" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <Select label="Source" required value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>
              <option value="">Sélectionner</option>
              {sources.data?.results.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Input label="Adresse à collecter" type="url" required value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} hint="Le domaine doit être autorisé ; les adresses internes sont refusées." />
            <Select label="Fréquence" value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })}>
              {["MANUAL", "HOURLY", "DAILY", "WEEKLY"].map((x) => <option key={x} value={x}>{label(x)}</option>)}
            </Select>
            {error && <Alert tone="error">{error}</Alert>}
            <div className="form-actions"><Button variant="secondary" onClick={() => setCreating(false)}>Annuler</Button><Button type="submit">Créer</Button></div>
          </form>
        </Modal>
      )}
    </Card>
  )
}

function Records() {
  const [open, setOpen] = useState<Rec | null>(null)
  return (
    <Card>
      <DataTable<Rec>
        endpoint="/scraping/records/"
        onRowClick={setOpen}
        filters={[{ name: "validation_status", label: "Validation", options: [["PENDING", "En attente"], ["VALIDATED", "Validées"], ["REJECTED", "Rejetées"]] }]}
        columns={[
          { header: "Adresse", render: (r) => <span style={{ wordBreak: "break-all" }}>{r.source_url}</span> },
          { header: "HTTP", render: (r) => r.http_status },
          { header: "Collecté le", render: (r) => fmtDateTime(r.fetched_at) },
          { header: "Validation", render: (r) => <Status code={r.validation_status} /> },
        ]}
        actions={[
          { label: "Valider", variant: "primary", show: (r) => r.validation_status === "PENDING", run: (r) => api(`/scraping/records/${r.id}/validate/`, { method: "POST" }) },
          { label: "Rejeter", variant: "danger", show: (r) => r.validation_status === "PENDING", run: (r) => api(`/scraping/records/${r.id}/reject/`, { method: "POST" }) },
        ]}
        emptyTitle="Aucune donnée collectée"
      />
      {open && (
        <Modal title="Contenu collecté" onClose={() => setOpen(null)} wide>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 420, overflow: "auto", background: "var(--surface-2)", padding: 12, borderRadius: 8 }}>{JSON.stringify(open.data, null, 2)}</pre>
        </Modal>
      )}
    </Card>
  )
}
