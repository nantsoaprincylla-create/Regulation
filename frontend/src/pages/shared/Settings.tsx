import { useState, type FormEvent } from "react"
import { Alert, Button, Card, CardHead, Input, PageHeader, Status } from "../../components/ui"
import { api, describeError } from "../../lib/api"
import { useAuth } from "../../lib/auth-context"

export function SettingsPage() {
  const { user } = useAuth()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (next !== confirm) return setMsg({ tone: "error", text: "La confirmation ne correspond pas au nouveau mot de passe." })
    setBusy(true)
    setMsg(null)
    try {
      await api("/auth/change-password/", { method: "POST", body: { old_password: current, new_password: next } })
      setMsg({ tone: "success", text: "Mot de passe modifié." })
      setCurrent("")
      setNext("")
      setConfirm("")
    } catch (err) {
      setMsg({ tone: "error", text: describeError(err) })
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageHeader eyebrow="Compte" title="Paramètres" />
      <div className="grid-2e">
        <Card>
          <CardHead title="Mon profil" />
          <dl className="kv">
            <dt>Nom</dt>
            <dd>{`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "—"}</dd>
            <dt>E-mail</dt>
            <dd>{user?.email}</dd>
            <dt>Organisme</dt>
            <dd>{user?.organization?.name ?? "—"}</dd>
            <dt>Rôle</dt>
            <dd>{user && <Status code={user.role} />}</dd>
          </dl>
          <small>Le rôle est attribué par un administrateur et ne peut pas être modifié ici.</small>
        </Card>
        <Card>
          <CardHead title="Changer le mot de passe" />
          <form onSubmit={submit}>
            <Input label="Mot de passe actuel" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
            <Input label="Nouveau mot de passe" type="password" autoComplete="new-password" required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} hint="10 caractères minimum, non trivial." />
            <Input label="Confirmer" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
            <Button type="submit" loading={busy}>Modifier</Button>
          </form>
        </Card>
      </div>
    </>
  )
}
