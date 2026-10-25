import { useState } from "react"
import { Link } from "react-router"
import { Alert, Button, Card, Empty, Loading, PageHeader } from "../../components/ui"
import { api, describeError, type Page } from "../../lib/api"
import { fmtDateTime } from "../../lib/format"
import { useApi } from "../../lib/useApi"

type N = { id: number; title: string; message: string; notification_type: string; is_read: boolean; created_at: string }

export function NotificationsPage() {
  const { data, error, loading, reload } = useApi<Page<N>>("/notifications/")
  const [err, setErr] = useState("")
  const changed = () => {
    window.dispatchEvent(new Event("notifications:changed"))
    reload()
  }
  const act = async (path: string) => {
    try {
      await api(path, { method: "POST" })
      changed()
    } catch (e) {
      setErr(describeError(e))
    }
  }
  return (
    <>
      <PageHeader eyebrow="Compte" title="Notifications" actions={<Button variant="secondary" onClick={() => act("/notifications/read-all/")}>Tout marquer comme lu</Button>} />
      {(error || err) && <Alert tone="error">{error || err}</Alert>}
      {loading && !data && <Loading />}
      {data && data.results.length === 0 && <Card><Empty title="Aucune notification" /></Card>}
      {data && data.results.map((n) => (
        <Card key={n.id} className="">
          <div className="card-head" style={{ marginBottom: 4 }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: n.is_read ? 500 : 700 }}>{n.title}</h3>
              <p>{fmtDateTime(n.created_at)}</p>
            </div>
            {!n.is_read && (
              <Button size="sm" variant="secondary" onClick={() => act(`/notifications/${n.id}/read/`)}>
                Marquer comme lue
              </Button>
            )}
          </div>
          <p style={{ margin: 0 }}>{n.message}</p>
        </Card>
      ))}
      <p className="muted"><Link to="..">Retour</Link></p>
    </>
  )
}
