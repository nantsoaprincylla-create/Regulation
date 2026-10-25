import { useState, type FormEvent } from "react"
import { Plus, Upload } from "lucide-react"
import { Alert, Badge, Button, Card, FileInput, Input, Loading, Modal, PageHeader, Select, Status, Textarea, useToast } from "../../components/ui"
import { DataTable } from "../../components/DataTable"
import { api, describeError } from "../../lib/api"
import { useAuth } from "../../lib/auth-context"
import { fmtDateTime, fmtNumber, label } from "../../lib/format"
import { useApi } from "../../lib/useApi"

type Dataset = { id: number; owner_organization: string; name: string; description: string; data_type: string; source_type: string; created_at: string; latest_version: { id: number; version_number: number; report_status: string } | null }
type Version = {
  id: number
  version_number: number
  original_name: string
  row_count: number
  created_at: string
  report: { status: string; quality_score: number | null; missing_columns: string[]; type_errors: Record<string, unknown> | unknown[]; missing_values: Record<string, number>; duplicate_rows: number; messages: string[] }
}

const SCHEMA_HINT: Record<string, string> = {
  QOS_MEASUREMENT: "Colonnes obligatoires : region, city, service_type, technology, metric_name, metric_value, unit, measurement_method, measured_at.",
  LABELED_TRAINING: "Colonnes obligatoires : quality_class (GOOD / MEDIUM / POOR) et campaign_id ; ajoutez ensuite vos indicateurs numériques (débit, latence…).",
  OTHER: "Aucune colonne particulière n’est exigée.",
}

export function DatasetsPage() {
  const { user } = useAuth()
  const isOperator = user?.role === "OPERATOR_USER"
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState<Dataset | null>(null)
  const [refresh, setRefresh] = useState(0)
  return (
    <>
      <PageHeader
        eyebrow="Données"
        title={isOperator ? "Datasets et import" : "Datasets ARTEC"}
        subtitle={isOperator ? "Importez vos fichiers (CSV, XLSX, JSON), vérifiez le rapport de validation puis soumettez-les à l’ARTEC." : "Vos jeux de données internes, dont les jeux étiquetés servant à entraîner les modèles."}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> Nouveau dataset
          </Button>
        }
      />
      <Card>
        <DataTable<Dataset>
          endpoint="/datasets/"
          refreshKey={refresh}
          onRowClick={setOpen}
          query={isOperator ? undefined : { }}
          columns={[
            { header: "Dataset", render: (d) => (<div><strong>{d.name}</strong><br /><small>{d.owner_organization}</small></div>) },
            { header: "Type", render: (d) => <Badge>{label(d.data_type)}</Badge> },
            { header: "Source", render: (d) => label(d.source_type) },
            { header: "Dernière version", render: (d) => d.latest_version ? <span>v{d.latest_version.version_number} <Status code={d.latest_version.report_status} /></span> : "—" },
            { header: "Créé le", render: (d) => fmtDateTime(d.created_at) },
          ]}
          emptyTitle="Aucun dataset"
          emptyText="Créez un dataset, puis importez un fichier."
        />
      </Card>
      {creating && <CreateDataset onClose={() => setCreating(false)} onCreated={() => { setCreating(false); setRefresh((n) => n + 1) }} />}
      {open && <DatasetDetail dataset={open} onClose={() => { setOpen(null); setRefresh((n) => n + 1) }} />}
    </>
  )
}

function CreateDataset({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth()
  const toast = useToast()
  const isOperator = user?.role === "OPERATOR_USER"
  const [f, setF] = useState({ name: "", description: "", data_type: "QOS_MEASUREMENT", source_type: isOperator ? "DECLARED" : "TECHNICAL" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      await api("/datasets/", { method: "POST", body: f })
      toast("Dataset créé. Importez maintenant un fichier.")
      onCreated()
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Nouveau dataset" onClose={onClose}>
      <form onSubmit={submit}>
        <Input label="Nom" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Textarea label="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <div className="form-grid">
          <Select label="Type de données" value={f.data_type} onChange={(e) => setF({ ...f, data_type: e.target.value })}>
            <option value="QOS_MEASUREMENT">Mesures QoS</option>
            {!isOperator && <option value="LABELED_TRAINING">Jeu étiqueté (entraînement)</option>}
            <option value="OTHER">Autre</option>
          </Select>
          <Select label="Origine" value={f.source_type} onChange={(e) => setF({ ...f, source_type: e.target.value })}>
            {["TECHNICAL", "DECLARED", "SURVEY", "SCRAPED"].map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </Select>
        </div>
        <Alert tone="info">{SCHEMA_HINT[f.data_type]}</Alert>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="form-actions">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={busy}>Créer</Button>
        </div>
      </form>
    </Modal>
  )
}

function DatasetDetail({ dataset, onClose }: { dataset: Dataset; onClose: () => void }) {
  const { user } = useAuth()
  const toast = useToast()
  const versions = useApi<Version[]>(`/datasets/${dataset.id}/versions/`)
  const own = dataset.owner_organization === user?.organization?.code
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<{ columns: string[]; rows: unknown[][] } | null>(null)

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key)
    setError("")
    try {
      await fn()
      toast(ok)
      versions.reload()
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy(null)
    }
  }
  const upload = () => {
    if (!file) return
    const fd = new FormData()
    fd.append("file", file)
    void run("upload", async () => { await api(`/datasets/${dataset.id}/versions/`, { method: "POST", body: fd }); setFile(null) }, "Fichier importé et validé.")
  }

  return (
    <Modal title={dataset.name} onClose={onClose} wide>
      <p className="muted">{dataset.description || "Aucune description."}</p>
      <Alert tone="info">{SCHEMA_HINT[dataset.data_type]}</Alert>
      {own && (
        <Card className="">
          <FileInput label="Importer une nouvelle version" accept=".csv,.xlsx,.json" onChange={setFile} hint="Formats : CSV, XLSX, JSON. Le fichier est validé automatiquement à l’import." />
          <Button onClick={upload} loading={busy === "upload"} disabled={!file}><Upload size={16} /> Importer</Button>
        </Card>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      {versions.loading && !versions.data && <Loading />}
      {versions.data?.map((v) => (
        <Card key={v.id} className="">
          <div className="card-head">
            <div>
              <h3>Version {v.version_number} <Status code={v.report.status} /></h3>
              <p>{v.original_name} · {fmtNumber(v.row_count)} ligne(s) · {fmtDateTime(v.created_at)}</p>
            </div>
            <div className="row-actions">
              <Button size="sm" variant="secondary" onClick={() => api<{ columns: string[]; rows: unknown[][] }>(`/datasets/versions/${v.id}/preview/`).then(setPreview).catch((e) => setError(describeError(e)))}>Aperçu</Button>
              {own && <Button size="sm" variant="secondary" loading={busy === `v${v.id}`} onClick={() => run(`v${v.id}`, () => api(`/datasets/versions/${v.id}/validate/`, { method: "POST" }), "Validation relancée.")}>Revalider</Button>}
              {own && user?.role === "OPERATOR_USER" && v.report.status !== "INVALID" && (
                <Button size="sm" loading={busy === `s${v.id}`} onClick={() => run(`s${v.id}`, () => api(`/datasets/versions/${v.id}/submit/`, { method: "POST" }), "Dataset soumis à l’ARTEC.")}>Soumettre à l’ARTEC</Button>
              )}
            </div>
          </div>
          <dl className="kv">
            <dt>Score de qualité</dt>
            <dd>{v.report.quality_score !== null ? `${fmtNumber(v.report.quality_score * (v.report.quality_score <= 1 ? 100 : 1), 0)} %` : "—"}</dd>
            <dt>Doublons</dt>
            <dd>{v.report.duplicate_rows}</dd>
            <dt>Colonnes manquantes</dt>
            <dd>{v.report.missing_columns.length ? v.report.missing_columns.join(", ") : "Aucune"}</dd>
          </dl>
          {v.report.messages.length > 0 && <ul style={{ margin: 0 }}>{v.report.messages.map((m, i) => <li key={i}>{m}</li>)}</ul>}
        </Card>
      ))}
      {versions.data?.length === 0 && <p className="muted">Aucune version importée.</p>}
      {preview && (
        <Modal title="Aperçu (20 premières lignes)" onClose={() => setPreview(null)} wide>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>{preview.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{preview.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{String(c ?? "")}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </Modal>
      )}
    </Modal>
  )
}
