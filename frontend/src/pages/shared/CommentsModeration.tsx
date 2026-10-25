import { Card, PageHeader, Status } from "../../components/ui"
import { DataTable } from "../../components/DataTable"
import { api } from "../../lib/api"
import { fmtDateTime } from "../../lib/format"

type C = { id: number; publication_title: string; content: string; author_name: string; status: string; report_count: number; created_at: string }

export function CommentsModeration() {
  return (
    <>
      <PageHeader eyebrow="Modération" title="Commentaires" subtitle="Approuvez ou masquez les commentaires déposés sur vos publications. Rien n’est visible du public avant approbation." />
      <Card>
        <DataTable<C>
          endpoint="/comments/"
          query={{ ordering: "-created_at" }}
          filters={[{ name: "status", label: "Statut", options: [["PENDING", "En attente"], ["APPROVED", "Approuvés"], ["HIDDEN", "Masqués"]] }]}
          columns={[
            { header: "Publication", render: (c) => c.publication_title },
            { header: "Commentaire", render: (c) => <div style={{ maxWidth: 420, whiteSpace: "pre-wrap" }}>{c.content}<br /><small>{c.author_name || "Anonyme"} · {fmtDateTime(c.created_at)}</small></div> },
            { header: "Signalements", render: (c) => c.report_count },
            { header: "Statut", render: (c) => <Status code={c.status} /> },
          ]}
          actions={[
            { label: "Approuver", variant: "primary", show: (c) => c.status !== "APPROVED", run: (c) => api(`/comments/${c.id}/approve/`, { method: "POST" }) },
            { label: "Masquer", variant: "danger", show: (c) => c.status !== "HIDDEN", reason: { title: "Masquer ce commentaire ?", label: "Motif (facultatif)", required: false, danger: true }, run: (c) => api(`/comments/${c.id}/hide/`, { method: "POST" }) },
          ]}
          emptyTitle="Aucun commentaire"
        />
      </Card>
    </>
  )
}
