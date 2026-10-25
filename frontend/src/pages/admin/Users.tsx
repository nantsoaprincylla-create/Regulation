import { useState, type FormEvent } from "react"
import { Plus } from "lucide-react"
import { Alert, Button, Card, Input, Modal, PageHeader, Select, Status, useToast } from "../../components/ui"
import { DataTable } from "../../components/DataTable"
import { api, describeError } from "../../lib/api"
import { fmtDateTime, label } from "../../lib/format"
import { useApi } from "../../lib/useApi"

type U = { id: number; email: string; first_name: string; last_name: string; organization: number | null; role: string; is_active: boolean; last_login: string | null }
type Org = { id: number; code: string; name: string; organization_type: string }

export function UsersPage() {
  const orgs = useApi<Org[] | { results: Org[] }>("/organizations/")
  const list = Array.isArray(orgs.data) ? orgs.data : (orgs.data?.results ?? [])
  const orgName = (id: number | null) => list.find((o) => o.id === id)?.name ?? "—"
  const [creating, setCreating] = useState(false)
  const [refresh, setRefresh] = useState(0)
  return (
    <>
      <PageHeader eyebrow="Administration" title="Comptes utilisateurs" subtitle="Créez et désactivez les comptes des organismes. Le rôle est imposé par le serveur ; le public n’a pas de compte." actions={<Button onClick={() => setCreating(true)}><Plus size={16} /> Nouveau compte</Button>} />
      <Card>
        <DataTable<U>
          endpoint="/auth/users/"
          refreshKey={refresh}
          columns={[
            { header: "Utilisateur", render: (u) => <div><strong>{`${u.first_name} ${u.last_name}`.trim() || u.email}</strong><br /><small>{u.email}</small></div> },
            { header: "Organisme", render: (u) => orgName(u.organization) },
            { header: "Rôle", render: (u) => <Status code={u.role} /> },
            { header: "Compte", render: (u) => (u.is_active ? "Actif" : "Désactivé") },
            { header: "Dernière connexion", render: (u) => fmtDateTime(u.last_login) },
          ]}
          actions={[
            { label: "Désactiver", variant: "danger", show: (u) => u.is_active, reason: { title: "Désactiver ce compte ?", required: false, label: "Commentaire (facultatif)", danger: true }, run: (u) => api(`/auth/users/${u.id}/`, { method: "PATCH", body: { is_active: false } }) },
            { label: "Réactiver", show: (u) => !u.is_active, run: (u) => api(`/auth/users/${u.id}/`, { method: "PATCH", body: { is_active: true } }) },
          ]}
        />
      </Card>
      {creating && <Create orgs={list} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); setRefresh((n) => n + 1) }} />}
    </>
  )
}

function Create({ orgs, onClose, onCreated }: { orgs: Org[]; onClose: () => void; onCreated: () => void }) {
  const toast = useToast()
  const [f, setF] = useState({ email: "", first_name: "", last_name: "", role: "OPERATOR_USER", organization: "", password: "" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      await api("/auth/users/", { method: "POST", body: { ...f, organization: f.organization ? Number(f.organization) : null } })
      toast("Compte créé.")
      onCreated()
    } catch (err) {
      setError(describeError(err))
      setBusy(false)
    }
  }
  return (
    <Modal title="Nouveau compte" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <Input label="Prénom" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} />
          <Input label="Nom" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} />
        </div>
        <Input label="E-mail" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <Select label="Rôle" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
          {["OPERATOR_USER", "ARTEC_PUBLISHER", "ARTEC_REGULATOR", "SYSTEM_ADMIN"].map((r) => <option key={r} value={r}>{label(r)}</option>)}
        </Select>
        <Select label="Organisme" value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })}>
          <option value="">Aucun</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </Select>
        <Input label="Mot de passe initial" type="password" required autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} hint="10 caractères minimum ; l’utilisateur doit le changer à la première connexion." />
        {error && <Alert tone="error">{error}</Alert>}
        <div className="form-actions"><Button variant="secondary" onClick={onClose}>Annuler</Button><Button type="submit" loading={busy}>Créer</Button></div>
      </form>
    </Modal>
  )
}
