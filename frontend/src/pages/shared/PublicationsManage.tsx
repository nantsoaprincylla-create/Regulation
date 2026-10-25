import { useState, type FormEvent } from "react"
import { Plus } from "lucide-react"
import { Alert, Button, Card, Input, Modal, PageHeader, Select, Status, Textarea, useToast } from "../../components/ui"
import { DataTable } from "../../components/DataTable"
import { api, describeError } from "../../lib/api"
import { fmtDate, label } from "../../lib/format"

type Pub = { id: number; title: string; category: string; audience: string; status: string; published_at: string | null; organization_code: string }

export function PublicationsManage() {
  const [creating, setCreating] = useState(false)
  const [scheduling, setScheduling] = useState<Pub | null>(null)
  const [refresh, setRefresh] = useState(0)
  const bump = () => setRefresh((n) => n + 1)
  return (
    <>
      <PageHeader
        eyebrow="Éditorial"
        title="Publications"
        subtitle="Rédigez, planifiez et publiez vos contenus. Seules vos propres publications sont visibles ici."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> Nouvelle publication
          </Button>
        }
      />
      <Card>
        <DataTable<Pub>
          endpoint="/publications/"
          refreshKey={refresh}
          filters={[
            { name: "status", label: "Statut", options: ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"].map((s) => [s, label(s)]) as [string, string][] },
            { name: "category", label: "Catégorie", options: ["REPORT", "PRESS_RELEASE", "INFORMATION", "CONSULTATION", "OTHER"].map((s) => [s, label(s)]) as [string, string][] },
          ]}
          columns={[
            { header: "Titre", render: (p) => <strong>{p.title}</strong> },
            { header: "Catégorie", render: (p) => label(p.category) },
            { header: "Audience", render: (p) => label(p.audience) },
            { header: "Statut", render: (p) => <Status code={p.status} /> },
            { header: "Publiée le", render: (p) => fmtDate(p.published_at) },
          ]}
          actions={[
            { label: "Publier", variant: "primary", show: (p) => p.status === "DRAFT" || p.status === "SCHEDULED", run: (p) => api(`/publications/${p.id}/publish/`, { method: "POST" }), successMessage: "Publication mise en ligne." },
            { label: "Planifier", show: (p) => p.status === "DRAFT", run: async (p) => { setScheduling(p) }, successMessage: "Choisissez la date." },
            { label: "Archiver", show: (p) => p.status === "PUBLISHED", reason: { title: "Archiver la publication ?", label: "Commentaire (facultatif)", required: false }, run: (p) => api(`/publications/${p.id}/archive/`, { method: "POST" }) },
          ]}
          emptyTitle="Aucune publication"
          emptyText="Créez votre première publication."
        />
      </Card>
      {creating && <CreatePub onClose={() => setCreating(false)} onCreated={() => { setCreating(false); bump() }} />}
      {scheduling && <Schedule pub={scheduling} onClose={() => setScheduling(null)} onDone={() => { setScheduling(null); bump() }} />}
    </>
  )
}

function CreatePub({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast()
  const [f, setF] = useState({ title: "", content: "", category: "INFORMATION", audience: "PUBLIC" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      await api("/publications/", { method: "POST", body: f })
      toast("Brouillon enregistré.")
      onCreated()
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Nouvelle publication" onClose={onClose} wide>
      <form onSubmit={submit}>
        <Input label="Titre" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <div className="form-grid">
          <Select label="Catégorie" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {["REPORT", "PRESS_RELEASE", "INFORMATION", "CONSULTATION", "OTHER"].map((c) => <option key={c} value={c}>{label(c)}</option>)}
          </Select>
          <Select label="Audience" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>
            <option value="PUBLIC">Public</option>
            <option value="INTERNAL">Interne</option>
          </Select>
        </div>
        <Textarea label="Contenu" required rows={10} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} hint="Texte brut : aucun HTML n’est interprété." />
        {error && <Alert tone="error">{error}</Alert>}
        <div className="form-actions">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={busy}>Enregistrer le brouillon</Button>
        </div>
      </form>
    </Modal>
  )
}

function Schedule({ pub, onClose, onDone }: { pub: Pub; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const [when, setWhen] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const go = async () => {
    setBusy(true)
    setError("")
    try {
      await api(`/publications/${pub.id}/schedule/`, { method: "POST", body: { published_at: new Date(when).toISOString() } })
      toast("Publication planifiée.")
      onDone()
    } catch (err) {
      setError(describeError(err))
      setBusy(false)
    }
  }
  return (
    <Modal title={`Planifier · ${pub.title}`} onClose={onClose}>
      <Input label="Date et heure de mise en ligne" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      {error && <Alert tone="error">{error}</Alert>}
      <div className="form-actions">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button loading={busy} disabled={!when} onClick={go}>Planifier</Button>
      </div>
    </Modal>
  )
}
