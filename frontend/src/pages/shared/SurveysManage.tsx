import { useState, type FormEvent } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Alert, Badge, Button, Card, Checkbox, Input, Loading, Modal, PageHeader, Select, Status, Textarea, useToast } from "../../components/ui"
import { DataTable } from "../../components/DataTable"
import { api, describeError } from "../../lib/api"
import { useAuth } from "../../lib/auth-context"
import { fmtDate, fmtNumber, QUESTION_TYPES } from "../../lib/format"
import { useApi } from "../../lib/useApi"

type Survey = { id: number; title: string; organization_code: string; target_operator: string | null; status: string; ends_at: string | null; responses_count: number; rejection_reason: string }
type QDraft = { text: string; question_type: string; is_required: boolean; min_value: string; max_value: string; choices: string }
type Results = {
  total_responses: number
  suppressed?: boolean
  message?: string
  questions: { id: number; text: string; type: string; answered: number; average?: number | null; yes?: number; no?: number; choices?: { id: number; label: string; count: number }[]; texts?: string[] }[]
  by_region: { region: string; count: number }[]
}

const emptyQ = (): QDraft => ({ text: "", question_type: "SATISFACTION", is_required: true, min_value: "", max_value: "", choices: "" })

export function SurveysManage() {
  const { user } = useAuth()
  const [creating, setCreating] = useState(false)
  const [resultsFor, setResultsFor] = useState<Survey | null>(null)
  const [refresh, setRefresh] = useState(0)
  const own = user?.organization?.code
  const isPublisher = user?.role === "ARTEC_PUBLISHER"

  return (
    <>
      <PageHeader
        eyebrow="Collecte"
        title="Sondages"
        subtitle={isPublisher ? "Créez vos sondages et validez ceux soumis par les opérateurs avant leur mise en ligne." : "Créez vos sondages ; ils sont publiés après validation de l’ARTEC."}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> Nouveau sondage
          </Button>
        }
      />
      <Card>
        <DataTable<Survey>
          endpoint="/surveys/"
          refreshKey={refresh}
          filters={[{ name: "status", label: "Statut", options: ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "CLOSED", "REJECTED"].map((s) => [s, s]) as [string, string][] }]}
          columns={[
            {
              header: "Sondage",
              render: (s) => (
                <div>
                  <strong>{s.title}</strong>
                  <br />
                  <small>
                    {s.organization_code}
                    {s.target_operator ? ` · cible ${s.target_operator}` : ""}
                  </small>
                  {s.rejection_reason && <small style={{ display: "block", color: "var(--red)" }}>Refusé : {s.rejection_reason}</small>}
                </div>
              ),
            },
            { header: "Statut", render: (s) => <Status code={s.status} /> },
            { header: "Réponses", render: (s) => fmtNumber(s.responses_count) },
            { header: "Fin", render: (s) => fmtDate(s.ends_at) },
          ]}
          actions={[
            { label: isPublisher ? "Publier" : "Soumettre à l’ARTEC", show: (s) => s.status === "DRAFT" && s.organization_code === own, variant: "primary", run: (s) => api(`/surveys/${s.id}/publish/`, { method: "POST" }), successMessage: "Sondage mis à jour." },
            { label: "Approuver", show: (s) => s.status === "PENDING_APPROVAL" && s.organization_code !== own && isPublisher, variant: "primary", run: (s) => api(`/surveys/${s.id}/approve/`, { method: "POST" }), successMessage: "Sondage approuvé et publié." },
            { label: "Refuser", show: (s) => s.status === "PENDING_APPROVAL" && s.organization_code !== own && isPublisher, variant: "danger", reason: { title: "Motif du refus", danger: true }, run: (s, reason) => api(`/surveys/${s.id}/reject/`, { method: "POST", body: { reason } }) },
            { label: "Clôturer", show: (s) => s.status === "PUBLISHED" && s.organization_code === own, reason: { title: "Clôturer le sondage ?", label: "Commentaire (facultatif)", required: false }, run: (s) => api(`/surveys/${s.id}/close/`, { method: "POST" }), successMessage: "Sondage clos." },
          ]}
          onRowClick={(s) => setResultsFor(s)}
          emptyTitle="Aucun sondage"
          emptyText="Créez votre premier sondage pour collecter l’avis du public."
        />
      </Card>
      {creating && (
        <CreateSurvey
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            setRefresh((n) => n + 1)
          }}
        />
      )}
      {resultsFor && <ResultsModal survey={resultsFor} onClose={() => setResultsFor(null)} />}
    </>
  )
}

function CreateSurvey({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast()
  const { user } = useAuth()
  const ops = useApi<{ results?: { code: string; organization_type: string }[] } | { code: string; organization_type: string }[]>("/organizations/")
  const operators = (Array.isArray(ops.data) ? ops.data : (ops.data?.results ?? [])).filter((o) => o.organization_type === "OPERATOR")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [target, setTarget] = useState(user?.role === "OPERATOR_USER" ? (user.organization?.code ?? "") : "")
  const [minutes, setMinutes] = useState("3")
  const [endsAt, setEndsAt] = useState("")
  const [resultsPublic, setResultsPublic] = useState(false)
  const [questions, setQuestions] = useState<QDraft[]>([emptyQ()])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const setQ = (i: number, patch: Partial<QDraft>) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      await api("/surveys/", {
        method: "POST",
        body: {
          title,
          description,
          target_operator: target || null,
          estimated_minutes: Number(minutes) || 3,
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
          results_public: resultsPublic,
          questions: questions.map((q, i) => ({
            text: q.text,
            question_type: q.question_type,
            is_required: q.is_required,
            order: i + 1,
            min_value: q.question_type === "NUMBER" && q.min_value !== "" ? Number(q.min_value) : null,
            max_value: q.question_type === "NUMBER" && q.max_value !== "" ? Number(q.max_value) : null,
            choices: ["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(q.question_type)
              ? q.choices.split("\n").map((l) => l.trim()).filter(Boolean).map((label, k) => ({ label, order: k + 1 }))
              : [],
          })),
        },
      })
      toast("Sondage créé en brouillon.")
      onCreated()
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Nouveau sondage" onClose={onClose} wide>
      <form onSubmit={submit}>
        <Input label="Titre" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="form-grid">
          {user?.role === "OPERATOR_USER" ? (
            <Input label="Opérateur évalué" value={target} disabled hint="Un opérateur ne peut évaluer que lui-même." />
          ) : (
            <Select label="Opérateur évalué" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Tous / non précisé</option>
              {operators.map((o) => (
                <option key={o.code}>{o.code}</option>
              ))}
            </Select>
          )}
          <Input label="Durée estimée (min)" type="number" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          <Input label="Date de fin (facultatif)" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <Checkbox checked={resultsPublic} onChange={setResultsPublic}>
          Rendre les résultats agrégés publics (sous réserve du seuil minimal de répondants)
        </Checkbox>
        <h3>Questions</h3>
        {questions.map((q, i) => (
          <Card key={i} className="">
            <div className="form-grid">
              <Input label={`Question ${i + 1}`} required value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} />
              <Select label="Type" value={q.question_type} onChange={(e) => setQ(i, { question_type: e.target.value })}>
                {QUESTION_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            {q.question_type === "NUMBER" && (
              <div className="form-grid">
                <Input label="Minimum" type="number" step="any" value={q.min_value} onChange={(e) => setQ(i, { min_value: e.target.value })} />
                <Input label="Maximum" type="number" step="any" value={q.max_value} onChange={(e) => setQ(i, { max_value: e.target.value })} />
              </div>
            )}
            {["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(q.question_type) && <Textarea label="Choix (un par ligne)" value={q.choices} onChange={(e) => setQ(i, { choices: e.target.value })} />}
            <div className="form-actions" style={{ justifyContent: "space-between", marginTop: 0 }}>
              <Checkbox checked={q.is_required} onChange={(v) => setQ(i, { is_required: v })}>
                Réponse obligatoire
              </Checkbox>
              {questions.length > 1 && (
                <Button size="sm" variant="ghost" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))} aria-label="Supprimer la question">
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </Card>
        ))}
        <Button variant="secondary" onClick={() => setQuestions((qs) => [...qs, emptyQ()])}>
          <Plus size={16} /> Ajouter une question
        </Button>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="form-actions">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={busy}>
            Enregistrer le brouillon
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function ResultsModal({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const { data, error, loading } = useApi<Results>(`/surveys/${survey.id}/results/`)
  return (
    <Modal title={`Résultats · ${survey.title}`} onClose={onClose} wide>
      {loading && <Loading />}
      {error && <Alert tone="error">{error}</Alert>}
      {data && (
        <>
          <p>
            <strong>{fmtNumber(data.total_responses)}</strong> réponse(s) <Badge>{survey.organization_code}</Badge>
          </p>
          {data.suppressed && <Alert tone="info">{data.message}</Alert>}
          {data.questions.map((q) => (
            <Card key={q.id} className="">
              <h3 style={{ fontSize: "1rem" }}>{q.text}</h3>
              <small>{q.answered} réponse(s)</small>
              {q.average !== undefined && q.average !== null && <p>Moyenne : <strong>{fmtNumber(q.average, 2)}</strong></p>}
              {q.yes !== undefined && <p>Oui : <strong>{q.yes}</strong> · Non : <strong>{q.no}</strong></p>}
              {q.choices?.map((c) => {
                const max = Math.max(1, ...(q.choices ?? []).map((x) => x.count))
                return (
                  <div className="prob-row" key={c.id} style={{ gridTemplateColumns: "1fr 2fr 40px" }}>
                    <span>{c.label}</span>
                    <div className="prob-track"><span style={{ width: `${(100 * c.count) / max}%`, background: "var(--primary)" }} /></div>
                    <strong>{c.count}</strong>
                  </div>
                )
              })}
              {q.texts && q.texts.length > 0 && (
                <ul>
                  {q.texts.slice(0, 20).map((t, i) => (
                    <li key={i} style={{ whiteSpace: "pre-wrap" }}>{t}</li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
          {data.by_region.length > 0 && (
            <>
              <h3>Répartition par région</h3>
              <ul className="list-plain">
                {data.by_region.map((r) => (
                  <li key={r.region}>
                    {r.region} <strong>{r.count}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Modal>
  )
}
