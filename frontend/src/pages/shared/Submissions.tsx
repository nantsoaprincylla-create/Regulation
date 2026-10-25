import { useState } from "react"
import { Alert, Card, Loading, Modal, PageHeader, Status } from "../../components/ui"
import { DataTable } from "../../components/DataTable"
import { api } from "../../lib/api"
import { useAuth } from "../../lib/auth-context"
import { fmtDateTime, fmtNumber, label } from "../../lib/format"
import { useApi } from "../../lib/useApi"

type Sub = {
  id: number
  reference: string
  organization: string
  dataset_name: string
  data_type: string
  dataset_version: number
  version_number: number
  status: string
  report_status: string
  quality_score: number | null
  review_comment: string
  submitted_at: string
  events: { actor: string | null; from_status: string; to_status: string; comment: string; created_at: string }[]
}

const STATUSES = ["SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUIRED", "ACCEPTED", "REJECTED"]

export function SubmissionsPage() {
  const { user } = useAuth()
  const reg = user?.role === "ARTEC_REGULATOR"
  const [open, setOpen] = useState<Sub | null>(null)
  const post = (s: Sub, action: string, comment?: string) => api(`/submissions/${s.id}/${action}/`, { method: "POST", body: { comment: comment ?? "" } })
  return (
    <>
      <PageHeader
        eyebrow="Données"
        title={reg ? "Soumissions reçues" : "Mes soumissions à l’ARTEC"}
        subtitle={reg ? "Examinez les datasets soumis par les opérateurs : seuls les datasets acceptés peuvent alimenter les prédictions." : "Suivez l’examen de vos datasets et corrigez ceux qui vous sont renvoyés."}
      />
      <Card>
        <DataTable<Sub>
          endpoint="/submissions/"
          onRowClick={setOpen}
          filters={[{ name: "status", label: "Statut", options: STATUSES.map((s) => [s, label(s)]) as [string, string][] }]}
          columns={[
            { header: "Référence", render: (s) => <code>{s.reference}</code> },
            { header: "Dataset", render: (s) => <div><strong>{s.dataset_name}</strong><br /><small>{s.organization} · v{s.version_number} · {label(s.data_type)}</small></div> },
            { header: "Validation", render: (s) => <Status code={s.report_status} /> },
            { header: "Statut", render: (s) => <Status code={s.status} /> },
            { header: "Soumis le", render: (s) => fmtDateTime(s.submitted_at) },
          ]}
          actions={reg ? [
            { label: "Prendre en charge", variant: "secondary", show: (s) => s.status === "SUBMITTED", run: (s) => post(s, "start-review") },
            { label: "Accepter", variant: "primary", show: (s) => ["SUBMITTED", "UNDER_REVIEW"].includes(s.status), reason: { title: "Accepter ce dataset", label: "Commentaire (facultatif)", required: false }, run: (s, r) => post(s, "accept", r), successMessage: "Dataset accepté : les mesures sont intégrées." },
            { label: "Demander correction", show: (s) => ["SUBMITTED", "UNDER_REVIEW"].includes(s.status), reason: { title: "Correction demandée", label: "Éléments à corriger" }, run: (s, r) => post(s, "request-correction", r) },
            { label: "Rejeter", variant: "danger", show: (s) => ["SUBMITTED", "UNDER_REVIEW"].includes(s.status), reason: { title: "Rejeter ce dataset", label: "Motif du rejet", danger: true }, run: (s, r) => post(s, "reject", r) },
          ] : []}
          emptyTitle="Aucune soumission"
        />
      </Card>
      {open && <Detail sub={open} onClose={() => setOpen(null)} />}
    </>
  )
}

function Detail({ sub, onClose }: { sub: Sub; onClose: () => void }) {
  const version = useApi<{ row_count: number; report: { status: string; quality_score: number | null; missing_columns: string[]; duplicate_rows: number; messages: string[] } }>(`/datasets/versions/${sub.dataset_version}/`)
  return (
    <Modal title={`${sub.dataset_name} · ${sub.reference}`} onClose={onClose} wide>
      {sub.review_comment && <Alert tone="warn">Commentaire de l’examen : {sub.review_comment}</Alert>}
      {version.loading && <Loading />}
      {version.error && <Alert tone="info">Le détail technique n’est pas disponible pour votre rôle.</Alert>}
      {version.data && (
        <dl className="kv">
          <dt>Lignes</dt><dd>{fmtNumber(version.data.row_count)}</dd>
          <dt>Rapport de validation</dt><dd><Status code={version.data.report.status} /></dd>
          <dt>Score de qualité</dt><dd>{version.data.report.quality_score !== null ? fmtNumber(version.data.report.quality_score * (version.data.report.quality_score <= 1 ? 100 : 1), 0) + " %" : "—"}</dd>
          <dt>Doublons</dt><dd>{version.data.report.duplicate_rows}</dd>
          <dt>Colonnes manquantes</dt><dd>{version.data.report.missing_columns.join(", ") || "Aucune"}</dd>
        </dl>
      )}
      <h3>Historique</h3>
      <ul className="timeline">
        {sub.events.map((e, i) => (
          <li key={i}>
            <strong>{label(e.to_status)}</strong>
            <small>{fmtDateTime(e.created_at)} · {e.actor ?? "système"}</small>
            {e.comment && <div>{e.comment}</div>}
          </li>
        ))}
      </ul>
    </Modal>
  )
}
