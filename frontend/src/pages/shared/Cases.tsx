import { useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { ArrowLeft, Plus } from "lucide-react"
import { Alert, Badge, Button, Card, CardHead, Checkbox, Input, Loading, Modal, PageHeader, Select, Status, Textarea, useToast } from "../../components/ui"
import { DataTable } from "../../components/DataTable"
import { api, describeError, type Page } from "../../lib/api"
import { useAuth } from "../../lib/auth-context"
import { fmtDate, fmtDateTime, label } from "../../lib/format"
import { useApi } from "../../lib/useApi"

type Case = { id: number; reference_number: string; operator: string; case_type: string; status: string; title: string; description: string; opened_at: string; deadline: string | null; current_decision: { id: number; category: string; decided_at: string } | null; related_prediction: number | null; related_dataset_submission: number | null }
type Event = { id: number; kind: string; actor: string | null; message: string; internal: boolean; created_at: string }
type Evidence = { id: number; kind: string; description: string; visible_to_operator: boolean; created_at: string }
type Decision = { id: number; category: string; justification: string; decided_at: string; is_current: boolean; amendment_reason: string }
type Action = { id: number; description: string; due_date: string; status: string; operator_report: string; verification_comment: string }
type Resp = { id: number; content: string; created_at: string }

const CASE_STATUSES = ["OPEN", "AWAITING_OPERATOR_RESPONSE", "UNDER_CORRECTION", "DECIDED", "CLOSED"]
const DECISIONS = ["RECOMMENDATION", "CORRECTION_REQUEST", "WARNING", "CONGRATULATIONS", "NO_BREACH"]

export function CasesList({ base }: { base: string }) {
  const { user } = useAuth()
  const reg = user?.role === "ARTEC_REGULATOR"
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [refresh, setRefresh] = useState(0)
  return (
    <>
      <PageHeader
        eyebrow="Régulation"
        title={reg ? "Dossiers et décisions" : "Dossiers et demandes de l’ARTEC"}
        subtitle={reg ? "Ouvrez un dossier, demandez des explications, puis rendez une décision motivée : avertissement, félicitation, recommandation…" : "Répondez aux demandes d’explication et suivez vos actions correctives."}
        actions={reg && <Button onClick={() => setCreating(true)}><Plus size={16} /> Ouvrir un dossier</Button>}
      />
      <Card>
        <DataTable<Case>
          endpoint="/regulation/cases/"
          refreshKey={refresh}
          onRowClick={(c) => navigate(`${base}/dossiers/${c.id}`)}
          filters={[{ name: "status", label: "Statut", options: CASE_STATUSES.map((s) => [s, label(s)]) as [string, string][] }]}
          columns={[
            { header: "Dossier", render: (c) => <div><strong>{c.title}</strong><br /><small>{c.reference_number} · {c.operator}</small></div> },
            { header: "Type", render: (c) => label(c.case_type) },
            { header: "Statut", render: (c) => <Status code={c.status} /> },
            { header: "Décision", render: (c) => c.current_decision ? <Status code={c.current_decision.category} /> : "—" },
            { header: "Échéance", render: (c) => fmtDate(c.deadline) },
          ]}
          emptyTitle="Aucun dossier"
        />
      </Card>
      {creating && <CreateCase onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setRefresh((n) => n + 1); navigate(`${base}/dossiers/${id}`) }} />}
    </>
  )
}

function CreateCase({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const toast = useToast()
  const [f, setF] = useState({ operator: "", case_type: "QOS_ANOMALY", title: "", description: "", deadline: "", related_prediction: "", related_dataset_submission: "" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const ov = useApi<{ operators: string[] }>("/analytics/public/overview/", { auth: false })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      const c = await api<Case>("/regulation/cases/", {
        method: "POST",
        body: {
          operator: f.operator,
          case_type: f.case_type,
          title: f.title,
          description: f.description,
          deadline: f.deadline || null,
          related_prediction: f.related_prediction ? Number(f.related_prediction) : null,
          related_dataset_submission: f.related_dataset_submission ? Number(f.related_dataset_submission) : null,
        },
      })
      toast("Dossier ouvert.")
      onCreated(c.id)
    } catch (err) {
      setError(describeError(err))
      setBusy(false)
    }
  }
  return (
    <Modal title="Ouvrir un dossier" onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="form-grid">
          <Select label="Opérateur concerné" required value={f.operator} onChange={(e) => setF({ ...f, operator: e.target.value })}>
            <option value="">Sélectionner</option>
            {ov.data?.operators.map((o) => <option key={o}>{o}</option>)}
          </Select>
          <Select label="Nature du dossier" value={f.case_type} onChange={(e) => setF({ ...f, case_type: e.target.value })}>
            {["QOS_ANOMALY", "DATA_QUALITY", "COMPLAINT_FOLLOWUP", "OTHER"].map((t) => <option key={t} value={t}>{label(t)}</option>)}
          </Select>
          <Input label="Échéance de réponse" type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
        </div>
        <Input label="Titre" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <Textarea label="Description factuelle" required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} hint="Décrivez les faits constatés ; la décision viendra après la réponse de l’opérateur." />
        <div className="form-grid">
          <Input label="N° de prédiction liée (facultatif)" type="number" value={f.related_prediction} onChange={(e) => setF({ ...f, related_prediction: e.target.value })} />
          <Input label="N° de soumission liée (facultatif)" type="number" value={f.related_dataset_submission} onChange={(e) => setF({ ...f, related_dataset_submission: e.target.value })} />
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="form-actions"><Button variant="secondary" onClick={onClose}>Annuler</Button><Button type="submit" loading={busy}>Ouvrir le dossier</Button></div>
      </form>
    </Modal>
  )
}

export function CaseDetail({ base }: { base: string }) {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const reg = user?.role === "ARTEC_REGULATOR"
  const op = user?.role === "OPERATOR_USER"
  const c = useApi<Case>(`/regulation/cases/${id}/`)
  const timeline = useApi<Event[]>(`/regulation/cases/${id}/timeline/`)
  const evidence = useApi<Evidence[]>(`/regulation/cases/${id}/evidence/`)
  const responses = useApi<Resp[]>(`/regulation/cases/${id}/responses/`)
  const actions = useApi<Action[]>(`/regulation/cases/${id}/corrective-actions/`)
  const decisions = useApi<Page<Decision>>("/regulation/decisions/", { query: { case: id } })
  const [modal, setModal] = useState<"" | "explain" | "respond" | "decide" | "evidence" | "action" | "close" | "note" | "amend">("")
  const [error, setError] = useState("")
  const reloadAll = () => { c.reload(); timeline.reload(); evidence.reload(); responses.reload(); actions.reload(); decisions.reload() }
  const call = async (fn: () => Promise<unknown>, ok: string) => {
    setError("")
    try {
      await fn()
      toast(ok)
      setModal("")
      reloadAll()
    } catch (e) {
      setError(describeError(e))
      throw e
    }
  }
  const k = c.data
  const open = k && k.status !== "CLOSED"
  const current = decisions.data?.results.find((d) => d.is_current)

  return (
    <>
      <Link to={`${base}/dossiers`} className="muted" style={{ display: "inline-flex", gap: 6, alignItems: "center", marginBottom: 12, textDecoration: "none" }}><ArrowLeft size={16} /> Tous les dossiers</Link>
      {c.loading && !k && <Loading />}
      {c.error && <Alert tone="error">{c.error}</Alert>}
      {k && (
        <>
          <PageHeader
            eyebrow={`${k.reference_number} · ${k.operator}`}
            title={k.title}
            subtitle={`${label(k.case_type)} · ouvert le ${fmtDate(k.opened_at)}${k.deadline ? ` · échéance ${fmtDate(k.deadline)}` : ""}`}
            actions={
              <>
                <Status code={k.status} />
                {reg && open && <Button variant="secondary" onClick={() => setModal("explain")}>Demander une explication</Button>}
                {reg && open && <Button variant="secondary" onClick={() => setModal("evidence")}>Ajouter une preuve</Button>}
                {reg && open && <Button onClick={() => setModal("decide")} disabled={!!current}>Rendre une décision</Button>}
                {op && k.status === "AWAITING_OPERATOR_RESPONSE" && <Button onClick={() => setModal("respond")}>Répondre à l’ARTEC</Button>}
              </>
            }
          />
          {error && <Alert tone="error">{error}</Alert>}
          {current && (
            <Card className={current.category === "WARNING" ? "" : ""}>
              <CardHead title="Décision en vigueur" subtitle={`Rendue le ${fmtDateTime(current.decided_at)}`} action={<Status code={current.category} />} />
              <p style={{ whiteSpace: "pre-wrap" }}>{current.justification}</p>
              {reg && open && <Button variant="secondary" size="sm" onClick={() => setModal("amend")}>Modifier la décision</Button>}
            </Card>
          )}
          <div className="grid-2">
            <div>
              <Card>
                <CardHead title="Description" />
                <p style={{ whiteSpace: "pre-wrap" }}>{k.description}</p>
              </Card>
              <Card>
                <CardHead title="Réponses de l’opérateur" />
                {responses.data?.length === 0 && <p className="muted">Aucune réponse pour le moment.</p>}
                {responses.data?.map((r) => (<div key={r.id} style={{ marginBottom: 12 }}><small>{fmtDateTime(r.created_at)}</small><p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{r.content}</p></div>))}
              </Card>
              <Card>
                <CardHead title="Actions correctives" action={reg && open && <Button size="sm" variant="secondary" onClick={() => setModal("action")}>Demander une action</Button>} />
                {actions.data?.length === 0 && <p className="muted">Aucune action corrective.</p>}
                {actions.data?.map((a) => <ActionRow key={a.id} a={a} reg={reg} op={op} onDone={reloadAll} />)}
              </Card>
            </div>
            <div>
              <Card>
                <CardHead title="Preuves" />
                {evidence.data?.length === 0 && <p className="muted">Aucune preuve versée.</p>}
                <ul className="list-plain">
                  {evidence.data?.map((e) => (<li key={e.id}><div><Badge>{label(e.kind) === e.kind ? e.kind : e.kind}</Badge><small>{e.description}</small></div>{reg && !e.visible_to_operator && <Badge tone="orange">Interne</Badge>}</li>))}
                </ul>
              </Card>
              <Card>
                <CardHead title="Chronologie" action={reg && open && <Button size="sm" variant="secondary" onClick={() => setModal("note")}>Note interne</Button>} />
                <ul className="timeline">
                  {timeline.data?.map((e) => (<li key={e.id} className={e.internal ? "internal" : ""}><strong>{e.kind.replaceAll("_", " ").toLowerCase()}</strong>{e.internal && <Badge tone="orange"> interne</Badge>}<small>{fmtDateTime(e.created_at)} · {e.actor ?? "système"}</small><div>{e.message}</div></li>))}
                </ul>
              </Card>
              {reg && open && <Button variant="danger" onClick={() => setModal("close")}>Clore le dossier</Button>}
            </div>
          </div>
        </>
      )}
      {modal === "explain" && <FormModal title="Demander une explication" fields={[{ key: "message", label: "Question posée à l’opérateur", area: true }, { key: "deadline", label: "Échéance de réponse", type: "date", optional: true }]} onClose={() => setModal("")} onSubmit={(v) => call(() => api(`/regulation/cases/${id}/request-explanation/`, { method: "POST", body: { message: v.message, ...(v.deadline ? { deadline: v.deadline } : {}) } }), "Demande envoyée.")} />}
      {modal === "respond" && <FormModal title="Réponse à l’ARTEC" fields={[{ key: "content", label: "Votre réponse", area: true }]} onClose={() => setModal("")} onSubmit={(v) => call(() => api(`/regulation/cases/${id}/respond/`, { method: "POST", body: v }), "Réponse transmise.")} />}
      {modal === "note" && <FormModal title="Note interne" fields={[{ key: "message", label: "Note (invisible pour l’opérateur)", area: true }]} onClose={() => setModal("")} onSubmit={(v) => call(() => api(`/regulation/cases/${id}/note/`, { method: "POST", body: v }), "Note ajoutée.")} />}
      {modal === "close" && <FormModal title="Clore le dossier" fields={[{ key: "comment", label: "Commentaire de clôture", area: true, optional: true }]} onClose={() => setModal("")} onSubmit={(v) => call(() => api(`/regulation/cases/${id}/close/`, { method: "POST", body: v }), "Dossier clos.")} />}
      {modal === "action" && <FormModal title="Demander une action corrective" fields={[{ key: "description", label: "Action attendue", area: true }, { key: "due_date", label: "À réaliser avant le", type: "date" }]} onClose={() => setModal("")} onSubmit={(v) => call(() => api(`/regulation/cases/${id}/corrective-actions/`, { method: "POST", body: { ...v, decision: current?.id ?? null } }), "Action demandée.")} />}
      {modal === "evidence" && <EvidenceModal onClose={() => setModal("")} onSubmit={(b) => call(() => api(`/regulation/cases/${id}/evidence/`, { method: "POST", body: b }), "Preuve ajoutée.")} />}
      {modal === "decide" && <DecisionModal evidence={evidence.data ?? []} onClose={() => setModal("")} onSubmit={(b) => call(() => api(`/regulation/cases/${id}/decide/`, { method: "POST", body: b }), "Décision enregistrée.")} />}
      {modal === "amend" && current && <DecisionModal amend evidence={evidence.data ?? []} onClose={() => setModal("")} onSubmit={(b) => call(() => api(`/regulation/decisions/${current.id}/amend/`, { method: "POST", body: b }), "Décision modifiée.")} />}
    </>
  )
}

function ActionRow({ a, reg, op, onDone }: { a: Action; reg: boolean; op: boolean; onDone: () => void }) {
  const toast = useToast()
  const [modal, setModal] = useState<"" | "report" | "verify">("")
  const [err, setErr] = useState("")
  const run = async (fn: () => Promise<unknown>) => {
    setErr("")
    try { await fn(); toast("Action mise à jour."); setModal(""); onDone() } catch (e) { setErr(describeError(e)); throw e }
  }
  return (
    <div style={{ borderBottom: "1px solid var(--line)", padding: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{a.description}</strong><Status code={a.status} /></div>
      <small>À réaliser avant le {fmtDate(a.due_date)}</small>
      {a.operator_report && <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>Rapport de l’opérateur : {a.operator_report}</p>}
      {a.verification_comment && <p style={{ margin: "6px 0 0" }}>Vérification : {a.verification_comment}</p>}
      {err && <Alert tone="error">{err}</Alert>}
      <div className="row-actions" style={{ justifyContent: "flex-start", marginTop: 6 }}>
        {op && ["REQUESTED", "IN_PROGRESS"].includes(a.status) && <Button size="sm" variant="secondary" onClick={() => setModal("report")}>Déclarer l’avancement</Button>}
        {reg && a.status === "SUBMITTED" && <Button size="sm" onClick={() => setModal("verify")}>Vérifier</Button>}
      </div>
      {modal === "report" && <FormModal title="Avancement de l’action" fields={[{ key: "status", label: "Statut", select: [["IN_PROGRESS", "En cours"], ["SUBMITTED", "Réalisée — à vérifier"]] }, { key: "report", label: "Compte rendu", area: true, optional: true }]} onClose={() => setModal("")} onSubmit={(v) => run(() => api(`/regulation/corrective-actions/${a.id}/update-progress/`, { method: "POST", body: v }))} />}
      {modal === "verify" && <FormModal title="Vérification" fields={[{ key: "compliant", label: "Résultat", select: [["true", "Conforme"], ["false", "Non conforme"]] }, { key: "comment", label: "Commentaire", area: true, optional: true }]} onClose={() => setModal("")} onSubmit={(v) => run(() => api(`/regulation/corrective-actions/${a.id}/verify/`, { method: "POST", body: { compliant: v.compliant === "true", comment: v.comment } }))} />}
    </div>
  )
}

type Field = { key: string; label: string; area?: boolean; type?: string; optional?: boolean; select?: [string, string][] }
function FormModal({ title, fields, onClose, onSubmit }: { title: string; fields: Field[]; onClose: () => void; onSubmit: (v: Record<string, string>) => Promise<unknown> }) {
  const [v, setV] = useState<Record<string, string>>(Object.fromEntries(fields.map((f) => [f.key, f.select ? f.select[0][0] : ""])))
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try { await onSubmit(v) } catch { setBusy(false) }
  }
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        {fields.map((f) =>
          f.select ? (
            <Select key={f.key} label={f.label} value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}>{f.select.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</Select>
          ) : f.area ? (
            <Textarea key={f.key} label={f.label} required={!f.optional} value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
          ) : (
            <Input key={f.key} label={f.label} type={f.type} required={!f.optional} value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
          ),
        )}
        <div className="form-actions"><Button variant="secondary" onClick={onClose}>Annuler</Button><Button type="submit" loading={busy}>Valider</Button></div>
      </form>
    </Modal>
  )
}

function EvidenceModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (b: unknown) => Promise<unknown> }) {
  const [f, setF] = useState({ kind: "MEASUREMENT", description: "", dataset_submission: "", prediction_run: "", visible_to_operator: true })
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit({ kind: f.kind, description: f.description, visible_to_operator: f.visible_to_operator, dataset_submission: f.dataset_submission ? Number(f.dataset_submission) : null, prediction_run: f.prediction_run ? Number(f.prediction_run) : null })
    } catch { setBusy(false) }
  }
  return (
    <Modal title="Ajouter une preuve" onClose={onClose}>
      <form onSubmit={submit}>
        <Select label="Nature" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
          <option value="DATASET">Dataset</option><option value="MEASUREMENT">Mesures QoS validées</option><option value="PREDICTION">Résultat de prédiction (indicatif)</option><option value="DOCUMENT">Document</option><option value="OTHER">Autre</option>
        </Select>
        <Textarea label="Description" required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <div className="form-grid">
          <Input label="N° de soumission (facultatif)" type="number" value={f.dataset_submission} onChange={(e) => setF({ ...f, dataset_submission: e.target.value })} />
          <Input label="N° de prédiction (facultatif)" type="number" value={f.prediction_run} onChange={(e) => setF({ ...f, prediction_run: e.target.value })} />
        </div>
        <Checkbox checked={f.visible_to_operator} onChange={(v) => setF({ ...f, visible_to_operator: v })}>Visible par l’opérateur</Checkbox>
        <div className="form-actions"><Button variant="secondary" onClick={onClose}>Annuler</Button><Button type="submit" loading={busy}>Ajouter</Button></div>
      </form>
    </Modal>
  )
}

function DecisionModal({ evidence, amend, onClose, onSubmit }: { evidence: Evidence[]; amend?: boolean; onClose: () => void; onSubmit: (b: unknown) => Promise<unknown> }) {
  const [category, setCategory] = useState("RECOMMENDATION")
  const [justification, setJustification] = useState("")
  const [reason, setReason] = useState("")
  const [picked, setPicked] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try { await onSubmit({ category, justification, evidence: picked, reason }) } catch { setBusy(false) }
  }
  return (
    <Modal title={amend ? "Modifier la décision" : "Rendre une décision"} onClose={onClose} wide>
      <Alert tone="info">Justification détaillée obligatoire (20 caractères minimum). Un avertissement ou une demande de correction exige au moins une preuve ; un avertissement exige aussi qu’une explication ait été demandée et reçue (respect du contradictoire). Les félicitations n’exigent pas de preuve.</Alert>
      <form onSubmit={submit}>
        <Select label="Nature de la décision" value={category} onChange={(e) => setCategory(e.target.value)}>
          {DECISIONS.map((d) => <option key={d} value={d}>{label(d)}</option>)}
        </Select>
        <Textarea label="Justification" required rows={6} value={justification} onChange={(e) => setJustification(e.target.value)} />
        {evidence.length > 0 && (
          <fieldset style={{ border: 0, padding: 0, margin: "0 0 14px" }}>
            <legend className="field-label">Preuves retenues</legend>
            {evidence.map((e) => (
              <Checkbox key={e.id} checked={picked.includes(e.id)} onChange={(on) => setPicked((p) => (on ? [...p, e.id] : p.filter((x) => x !== e.id)))}>{e.description}</Checkbox>
            ))}
          </fieldset>
        )}
        {amend && <Textarea label="Motif de la modification" required value={reason} onChange={(e) => setReason(e.target.value)} />}
        <div className="form-actions"><Button variant="secondary" onClick={onClose}>Annuler</Button><Button type="submit" loading={busy}>Enregistrer la décision</Button></div>
      </form>
    </Modal>
  )
}
