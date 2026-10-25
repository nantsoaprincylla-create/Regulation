import { useState, type FormEvent } from "react"
import { Plus } from "lucide-react"
import { Alert, Badge, Button, Card, Input, Loading, Modal, PageHeader, Select, Status, Textarea, useToast } from "../../components/ui"
import { DataTable } from "../../components/DataTable"
import { api, describeError } from "../../lib/api"
import { useAuth } from "../../lib/auth-context"
import { fmtDate, fmtDateTime, label } from "../../lib/format"
import { useApi } from "../../lib/useApi"

type Complaint = { id: number; reference: string; complaint_type: string; category: string; description: string; status: string; organization: string | null; target_operator: string | null; related_case: number | null; related_decision: number | null; deadline: string | null; conclusion: string; created_at: string }
type Msg = { id: number; author_kind: string; content: string; is_internal: boolean; created_at: string }
const STATUSES = ["NEW", "IN_REVIEW", "AWAITING_INFO", "RESOLVED", "REJECTED", "CLOSED"]

export function ComplaintsPage() {
  const { user } = useAuth()
  const reg = user?.role === "ARTEC_REGULATOR"
  const [open, setOpen] = useState<Complaint | null>(null)
  const [creating, setCreating] = useState(false)
  const [refresh, setRefresh] = useState(0)
  return (
    <>
      <PageHeader
        eyebrow="Échanges"
        title={reg ? "Réclamations et contestations" : "Contestations"}
        subtitle={reg ? "Traitez les réclamations du public et les contestations des opérateurs." : "Contestez une décision ou demandez un réexamen en vous appuyant sur un dossier."}
        actions={!reg && <Button onClick={() => setCreating(true)}><Plus size={16} /> Nouvelle contestation</Button>}
      />
      <Card>
        <DataTable<Complaint>
          endpoint="/complaints/"
          refreshKey={refresh}
          onRowClick={setOpen}
          filters={[{ name: "status", label: "Statut", options: STATUSES.map((s) => [s, label(s)]) as [string, string][] }]}
          columns={[
            { header: "Référence", render: (c) => <code>{c.reference}</code> },
            { header: "Objet", render: (c) => <div><strong>{c.category}</strong><br /><small>{label(c.complaint_type)}{c.target_operator ? ` · ${c.target_operator}` : ""}{c.organization ? ` · déposée par ${c.organization}` : ""}</small></div> },
            { header: "Statut", render: (c) => <Status code={c.status} /> },
            { header: "Reçue le", render: (c) => fmtDate(c.created_at) },
          ]}
          emptyTitle="Aucune réclamation"
        />
      </Card>
      {creating && <Create onClose={() => setCreating(false)} onCreated={() => { setCreating(false); setRefresh((n) => n + 1) }} />}
      {open && <Detail c={open} reg={reg} onClose={() => { setOpen(null); setRefresh((n) => n + 1) }} />}
    </>
  )
}

function Create({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast()
  const cases = useApi<{ results: { id: number; reference_number: string; title: string }[] }>("/regulation/cases/")
  const [f, setF] = useState({ complaint_type: "OPERATOR_CONTESTATION", category: "Décision contestée", description: "", related_case: "" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      await api("/complaints/", { method: "POST", body: { ...f, related_case: Number(f.related_case) } })
      toast("Contestation déposée.")
      onCreated()
    } catch (err) {
      setError(describeError(err))
      setBusy(false)
    }
  }
  return (
    <Modal title="Nouvelle contestation" onClose={onClose}>
      <form onSubmit={submit}>
        <Select label="Nature" value={f.complaint_type} onChange={(e) => setF({ ...f, complaint_type: e.target.value })}>
          <option value="OPERATOR_CONTESTATION">Contestation</option>
          <option value="REVIEW_REQUEST">Demande de réexamen</option>
        </Select>
        <Select label="Dossier concerné" required value={f.related_case} onChange={(e) => setF({ ...f, related_case: e.target.value })}>
          <option value="">Sélectionner</option>
          {cases.data?.results.map((c) => <option key={c.id} value={c.id}>{c.reference_number} · {c.title}</option>)}
        </Select>
        <Input label="Objet" required value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
        <Textarea label="Argumentaire" required rows={6} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        {error && <Alert tone="error">{error}</Alert>}
        <div className="form-actions"><Button variant="secondary" onClick={onClose}>Annuler</Button><Button type="submit" loading={busy}>Déposer</Button></div>
      </form>
    </Modal>
  )
}

function Detail({ c, reg, onClose }: { c: Complaint; reg: boolean; onClose: () => void }) {
  const toast = useToast()
  const msgs = useApi<Msg[]>(`/complaints/${c.id}/messages/`)
  const [text, setText] = useState("")
  const [internal, setInternal] = useState(false)
  const [status, setStatus] = useState(c.status)
  const [conclusion, setConclusion] = useState(c.conclusion)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true)
    setError("")
    try {
      await api(`/complaints/${c.id}/messages/`, { method: "POST", body: { content: text, is_internal: internal } })
      setText("")
      msgs.reload()
    } catch (e) { setError(describeError(e)) } finally { setBusy(false) }
  }
  const process = async () => {
    setBusy(true)
    setError("")
    try {
      await api(`/complaints/${c.id}/process/`, { method: "POST", body: { status, conclusion } })
      toast("Réclamation mise à jour.")
      onClose()
    } catch (e) { setError(describeError(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title={`${c.reference} · ${c.category}`} onClose={onClose} wide>
      <p><Status code={c.status} /> <Badge>{label(c.complaint_type)}</Badge></p>
      <p style={{ whiteSpace: "pre-wrap" }}>{c.description}</p>
      {c.conclusion && <Alert tone="info">Conclusion : {c.conclusion}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <h3>Échanges</h3>
      {msgs.loading && !msgs.data && <Loading />}
      <ul className="timeline">
        {msgs.data?.map((m) => <li key={m.id} className={m.is_internal ? "internal" : ""}><strong>{m.author_kind}</strong>{m.is_internal && <Badge tone="orange"> interne</Badge>}<small>{fmtDateTime(m.created_at)}</small><div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div></li>)}
      </ul>
      {c.status !== "CLOSED" && (
        <>
          <Textarea label="Nouveau message" value={text} onChange={(e) => setText(e.target.value)} />
          {reg && <label className="check-row"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /><span>Note interne (invisible pour le déposant)</span></label>}
          <Button variant="secondary" loading={busy} disabled={text.trim().length < 2} onClick={send}>Envoyer</Button>
        </>
      )}
      {reg && (
        <Card className="">
          <h3>Traitement</h3>
          <Select label="Statut" value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select>
          <Textarea label="Conclusion motivée" value={conclusion} onChange={(e) => setConclusion(e.target.value)} hint="Obligatoire pour « Traitée » ou « Rejetée »." />
          <Button loading={busy} onClick={process}>Enregistrer</Button>
        </Card>
      )}
    </Modal>
  )
}
