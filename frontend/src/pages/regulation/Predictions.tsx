import { useState } from "react"
import { Download, Play } from "lucide-react"
import { Alert, Badge, Button, Card, CardHead, DistributionBar, Empty, Loading, Modal, PageHeader, Select, Status, Tabs, Input, useToast } from "../../components/ui"
import { DataTable } from "../../components/DataTable"
import { api, describeError, downloadFile, type Page } from "../../lib/api"
import { CLASS_COLORS, fmtDateTime, fmtNumber, fmtPct, label } from "../../lib/format"
import { useApi } from "../../lib/useApi"

type Model = { id: number; name: string; version: number; status: string; status_reason: string; metrics: { accuracy?: number; macro_f1?: number; f1?: Record<string, number>; confusion_matrix?: { labels: string[]; matrix: number[][] } }; feature_schema: unknown; created_at: string }
type Run = { id: number; model_name: string; model_number: number; status: string; created_at: string; completed_at: string | null; summary: { n_observations?: number; n_predicted?: number; n_skipped_missing_features?: number; class_counts?: { GOOD: number; MEDIUM: number; POOR: number }; mean_confidence?: number | null; disclaimer?: string; error?: string } }
type Result = { id: number; observation_reference: string; predicted_class: "GOOD" | "MEDIUM" | "POOR"; probability_good: number; probability_medium: number; probability_poor: number; confidence: number }
type Eligible = { id: number; label: string; data_type: string; row_count: number }

export function PredictionsPage({ initial = "runs" }: { initial?: "runs" | "models" }) {
  const [tab, setTab] = useState<"runs" | "models">(initial)
  return (
    <>
      <PageHeader eyebrow="Prédiction" title="Prédictions de qualité" subtitle="Le modèle Softmax estime, pour chaque observation, la probabilité d’une qualité Bonne, Moyenne ou Mauvaise. C’est une aide à la décision, jamais une sanction." />
      <Tabs tabs={[["runs", "Exécutions"], ["models", "Modèles"]]} value={tab} onChange={setTab} />
      {tab === "runs" ? <Runs /> : <Models />}
    </>
  )
}

function Runs() {
  const toast = useToast()
  const models = useApi<Page<Model>>("/predictions/models/", { query: { status: "READY" } })
  const inputs = useApi<Eligible[]>("/predictions/runs/eligible-inputs/")
  const [modelId, setModelId] = useState("")
  const [inputId, setInputId] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [refresh, setRefresh] = useState(0)
  const [open, setOpen] = useState<Run | null>(null)
  const launch = async () => {
    setBusy(true)
    setError("")
    try {
      await api("/predictions/runs/", { method: "POST", body: { model_version: Number(modelId), input_dataset_version: Number(inputId) } })
      toast("Exécution lancée.")
      setRefresh((n) => n + 1)
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Card>
        <CardHead title="Nouvelle prédiction" subtitle="Choisissez un modèle prêt et un dataset accepté par l’ARTEC." />
        {models.data && models.data.results.length === 0 && <Alert tone="warn">Aucun modèle n’est prêt. Entraînez-en un dans l’onglet « Modèles » à partir d’un jeu étiqueté.</Alert>}
        {inputs.data && inputs.data.length === 0 && <Alert tone="info">Aucun dataset exploitable : acceptez une soumission d’opérateur dans « Soumissions reçues ».</Alert>}
        <div className="form-grid">
          <Select label="Modèle" value={modelId} onChange={(e) => setModelId(e.target.value)}>
            <option value="">Sélectionner</option>
            {models.data?.results.map((m) => <option key={m.id} value={m.id}>{m.name} v{m.version} · F1 {fmtNumber(m.metrics.macro_f1 ?? 0, 2)}</option>)}
          </Select>
          <Select label="Dataset analysé" value={inputId} onChange={(e) => setInputId(e.target.value)}>
            <option value="">Sélectionner</option>
            {inputs.data?.map((d) => <option key={d.id} value={d.id}>{d.label} · {fmtNumber(d.row_count)} lignes</option>)}
          </Select>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <Button onClick={launch} loading={busy} disabled={!modelId || !inputId}><Play size={16} /> Lancer la prédiction</Button>
      </Card>
      <Card>
        <CardHead title="Historique des exécutions" />
        <DataTable<Run>
          endpoint="/predictions/runs/"
          refreshKey={refresh}
          searchable={false}
          onRowClick={setOpen}
          columns={[
            { header: "N°", render: (r) => `#${r.id}` },
            { header: "Modèle", render: (r) => `${r.model_name} v${r.model_number}` },
            { header: "Statut", render: (r) => <Status code={r.status} /> },
            { header: "Observations", render: (r) => fmtNumber(r.summary.n_predicted) },
            { header: "Répartition", render: (r) => r.summary.class_counts ? <div style={{ minWidth: 160 }}><DistributionBar values={r.summary.class_counts} /></div> : "—" },
            { header: "Lancée le", render: (r) => fmtDateTime(r.created_at) },
          ]}
          emptyTitle="Aucune exécution"
        />
      </Card>
      {open && <RunDetail run={open} onClose={() => setOpen(null)} />}
    </>
  )
}

function RunDetail({ run, onClose }: { run: Run; onClose: () => void }) {
  const [cls, setCls] = useState("")
  const [page, setPage] = useState(1)
  const results = useApi<Page<Result>>(run.status === "COMPLETED" ? `/predictions/runs/${run.id}/results/` : null, { query: { predicted_class: cls, page } })
  const [err, setErr] = useState("")
  const counts = run.summary.class_counts
  const top = counts ? (["GOOD", "MEDIUM", "POOR"] as const).reduce((a, b) => (counts[b] > counts[a] ? b : a)) : null
  return (
    <Modal title={`Prédiction #${run.id} · ${run.model_name} v${run.model_number}`} onClose={onClose} wide>
      <Alert tone="info">{run.summary.disclaimer ?? "Résultat probabiliste indicatif : il ne constitue ni un constat de manquement ni une sanction."}</Alert>
      {run.status === "FAILED" && <Alert tone="error">Échec : {run.summary.error ?? "erreur inconnue"}</Alert>}
      {counts && top && (
        <div className="big-result">
          <div>
            <small>Classe majoritaire</small>
            <h2 style={{ color: CLASS_COLORS[top] }}>{label(top)}</h2>
          </div>
          <div style={{ flex: 1 }}>
            <DistributionBar values={counts} />
            <small>{fmtNumber(run.summary.n_predicted)} observation(s) · confiance moyenne {fmtPct((run.summary.mean_confidence ?? 0) * 100, 0)}{run.summary.n_skipped_missing_features ? ` · ${run.summary.n_skipped_missing_features} ignorée(s) (valeurs manquantes)` : ""}</small>
          </div>
        </div>
      )}
      {run.status === "COMPLETED" && (
        <>
          <div className="table-tools">
            <Select aria-label="Classe" value={cls} onChange={(e) => { setPage(1); setCls(e.target.value) }}>
              <option value="">Toutes les classes</option>
              {["GOOD", "MEDIUM", "POOR"].map((c) => <option key={c} value={c}>{label(c)}</option>)}
            </Select>
            <Button variant="secondary" onClick={() => downloadFile(`/predictions/runs/${run.id}/export/`, `prediction_${run.id}.csv`).catch((e) => setErr(describeError(e)))}><Download size={16} /> Exporter en CSV</Button>
          </div>
          {err && <Alert tone="error">{err}</Alert>}
          {results.loading && !results.data && <Loading />}
          {results.data && results.data.results.length === 0 && <Empty title="Aucun résultat" />}
          {results.data && results.data.results.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Observation</th><th>Classe</th><th>Probabilités</th><th>Confiance</th></tr></thead>
                <tbody>
                  {results.data.results.map((r) => (
                    <tr key={r.id}>
                      <td><code>{r.observation_reference}</code></td>
                      <td><Status code={r.predicted_class} /></td>
                      <td style={{ minWidth: 220 }}>
                        {([["GOOD", r.probability_good], ["MEDIUM", r.probability_medium], ["POOR", r.probability_poor]] as const).map(([k, p]) => (
                          <div className="prob-row" key={k} style={{ margin: 2, gridTemplateColumns: "70px 1fr 48px" }}>
                            <small>{label(k)}</small><div className="prob-track"><span style={{ width: `${p * 100}%`, background: CLASS_COLORS[k] }} /></div><small>{fmtPct(p * 100, 0)}</small>
                          </div>
                        ))}
                      </td>
                      <td>{fmtPct(r.confidence * 100, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {results.data && (results.data.next || results.data.previous) && (
            <div className="pager"><Button size="sm" variant="secondary" disabled={!results.data.previous} onClick={() => setPage((p) => p - 1)}>Précédent</Button><span>Page {page}</span><Button size="sm" variant="secondary" disabled={!results.data.next} onClick={() => setPage((p) => p + 1)}>Suivant</Button></div>
          )}
        </>
      )}
    </Modal>
  )
}

function Models() {
  const toast = useToast()
  const inputs = useApi<Eligible[]>("/predictions/runs/eligible-inputs/")
  const [name, setName] = useState("")
  const [dataset, setDataset] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [refresh, setRefresh] = useState(0)
  const [open, setOpen] = useState<Model | null>(null)
  const training = inputs.data?.filter((d) => d.data_type === "LABELED_TRAINING") ?? []
  const train = async () => {
    setBusy(true)
    setError("")
    try {
      const m = await api<Model>("/predictions/models/train/", { method: "POST", body: { name, training_dataset_version: Number(dataset) } })
      toast(m.status === "READY" ? "Modèle entraîné et prêt." : `Entraînement terminé : ${label(m.status)}.`, m.status === "READY" ? "success" : "info")
      setRefresh((n) => n + 1)
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Card>
        <CardHead title="Entraîner un modèle" subtitle="Classification multiclasse par régression logistique Softmax, sur un jeu étiqueté (colonnes quality_class et campaign_id)." />
        {inputs.data && training.length === 0 && <Alert tone="info">Aucun jeu étiqueté disponible. Créez un dataset de type « Jeu étiqueté » dans « Datasets ARTEC » et importez un fichier valide.</Alert>}
        <div className="form-grid">
          <Input label="Nom du modèle" value={name} onChange={(e) => setName(e.target.value)} />
          <Select label="Jeu d’entraînement" value={dataset} onChange={(e) => setDataset(e.target.value)}>
            <option value="">Sélectionner</option>
            {training.map((d) => <option key={d.id} value={d.id}>{d.label} · {fmtNumber(d.row_count)} lignes</option>)}
          </Select>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <Button onClick={train} loading={busy} disabled={!name.trim() || !dataset}>Entraîner</Button>
      </Card>
      <Card>
        <CardHead title="Modèles" />
        <DataTable<Model>
          endpoint="/predictions/models/"
          refreshKey={refresh}
          searchable={false}
          onRowClick={setOpen}
          columns={[
            { header: "Modèle", render: (m) => <strong>{m.name} v{m.version}</strong> },
            { header: "Statut", render: (m) => <Status code={m.status} /> },
            { header: "Exactitude", render: (m) => m.metrics.accuracy !== undefined ? fmtPct(m.metrics.accuracy * 100, 1) : "—" },
            { header: "F1 macro", render: (m) => fmtNumber(m.metrics.macro_f1, 3) },
            { header: "Créé le", render: (m) => fmtDateTime(m.created_at) },
          ]}
          emptyTitle="Aucun modèle"
        />
      </Card>
      {open && (
        <Modal title={`${open.name} v${open.version}`} onClose={() => setOpen(null)}>
          <p><Status code={open.status} /></p>
          {open.status_reason && <Alert tone="warn">{open.status_reason}</Alert>}
          <dl className="kv">
            <dt>Exactitude</dt><dd>{open.metrics.accuracy !== undefined ? fmtPct(open.metrics.accuracy * 100, 1) : "—"}</dd>
            <dt>F1 macro</dt><dd>{fmtNumber(open.metrics.macro_f1, 3)}</dd>
            {open.metrics.f1 && Object.entries(open.metrics.f1).map(([k, v]) => (<><dt key={`a${k}`}>F1 · {label(k)}</dt><dd key={`b${k}`}>{fmtNumber(v, 3)}</dd></>))}
          </dl>
          {open.metrics.confusion_matrix && (
            <>
              <h3>Matrice de confusion</h3>
              <small>Lignes : classe réelle · colonnes : classe prédite</small>
              <table className="data-table"><thead><tr><th />{open.metrics.confusion_matrix.labels.map((l) => <th key={l}>{label(l)}</th>)}</tr></thead>
                <tbody>{open.metrics.confusion_matrix.matrix.map((row, i) => <tr key={i}><th>{label(open.metrics.confusion_matrix!.labels[i])}</th>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>
            </>
          )}
          <p style={{ marginTop: 12 }}><Badge tone="gray">Les probabilités sont indicatives</Badge></p>
        </Modal>
      )}
    </>
  )
}
