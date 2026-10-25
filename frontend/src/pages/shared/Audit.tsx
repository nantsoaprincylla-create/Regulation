import { Alert, Card, PageHeader } from "../../components/ui"
import { DataTable } from "../../components/DataTable"
import { fmtDateTime } from "../../lib/format"

type Row = { id: number; actor_email: string | null; actor_organization: string | null; action: string; resource_type: string; resource_id: string; timestamp: string }

export function AuditPage() {
  return (
    <>
      <PageHeader eyebrow="Traçabilité" title="Journal d’audit" subtitle="Actions sensibles journalisées : connexions, décisions, soumissions, modifications de comptes." />
      <Alert tone="info">Vous ne voyez que les événements de votre périmètre ; les secrets ne sont jamais journalisés.</Alert>
      <Card>
        <DataTable<Row>
          endpoint="/audit/"
          columns={[
            { header: "Date", render: (r) => fmtDateTime(r.timestamp) },
            { header: "Acteur", render: (r) => r.actor_email ?? "—" },
            { header: "Organisme", render: (r) => r.actor_organization ?? "—" },
            { header: "Action", render: (r) => <code>{r.action}</code> },
            { header: "Ressource", render: (r) => `${r.resource_type} #${r.resource_id}` },
          ]}
        />
      </Card>
    </>
  )
}
