import { useState, type FormEvent } from "react"
import { Link, useParams } from "react-router"
import { ArrowLeft, Search } from "lucide-react"
import { Alert, Badge, Button, Card, Empty, Input, Loading, Select, Textarea } from "../../components/ui"
import { api, describeError, type Page } from "../../lib/api"
import { fmtDate, fmtDateTime, label } from "../../lib/format"
import { useApi } from "../../lib/useApi"

type Pub = { id: number; title: string; slug: string; excerpt: string; content: string; category: string; published_at: string; organization_code: string }
type PublicComment = { id: number; content: string; author_name: string; created_at: string }

export function PublicationsPage() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [page, setPage] = useState(1)
  const { data, error, loading } = useApi<Page<Pub>>("/publications/public/", { auth: false, query: { search, category, page } })

  return (
    <div className="container section" style={{ paddingTop: 36 }}>
      <header className="page-head">
        <div>
          <span className="eyebrow">Transparence</span>
          <h1>Publications</h1>
          <p>Rapports, communiqués et informations publiés par l’ARTEC et les opérateurs.</p>
        </div>
      </header>
      <div className="table-tools">
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 13, color: "var(--muted)" }} aria-hidden />
          <Input
            aria-label="Rechercher une publication"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => {
              setPage(1)
              setSearch(e.target.value)
            }}
            style={{ paddingLeft: 34, marginBottom: 0 }}
          />
        </div>
        <Select
          aria-label="Catégorie"
          value={category}
          onChange={(e) => {
            setPage(1)
            setCategory(e.target.value)
          }}
        >
          <option value="">Toutes les catégories</option>
          {["REPORT", "PRESS_RELEASE", "INFORMATION", "CONSULTATION", "OTHER"].map((c) => (
            <option key={c} value={c}>
              {label(c)}
            </option>
          ))}
        </Select>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {loading && !data && <Loading />}
      {data && data.results.length === 0 && <Empty title="Aucune publication" text="Aucun contenu ne correspond à votre recherche." />}
      <div className="cards-3">
        {data?.results.map((p) => (
          <Link key={p.id} to={`/publications/${p.slug}`} className="card item-card">
            <div style={{ display: "flex", gap: 8 }}>
              <Badge tone="teal">{p.organization_code}</Badge>
              <Badge>{label(p.category)}</Badge>
            </div>
            <h3>{p.title}</h3>
            <p>{p.excerpt}</p>
            <div className="item-meta">
              <span>{fmtDate(p.published_at)}</span>
            </div>
          </Link>
        ))}
      </div>
      {data && (data.next || data.previous) && (
        <div className="pager">
          <Button size="sm" variant="secondary" disabled={!data.previous} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </Button>
          <span>
            Page {page} · {data.count} publication(s)
          </span>
          <Button size="sm" variant="secondary" disabled={!data.next} onClick={() => setPage((p) => p + 1)}>
            Suivant
          </Button>
        </div>
      )}
    </div>
  )
}

export function PublicationDetailPage() {
  const { slug } = useParams()
  const pub = useApi<Pub>(slug ? `/publications/public/${slug}/` : null, { auth: false })
  const pubId = pub.data?.id
  const comments = useApi<Page<PublicComment>>(pubId ? "/comments/" : null, { auth: false, query: { publication: pubId } })

  const [name, setName] = useState("")
  const [text, setText] = useState("")
  const [website, setWebsite] = useState("") // champ piège anti-robot
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!pubId) return
    setBusy(true)
    setFeedback(null)
    try {
      const r = await api<{ message?: string }>("/comments/", { method: "POST", auth: false, body: { publication: pubId, content: text, author_name: name, website } })
      setFeedback({ tone: "success", message: r?.message ?? "Merci : votre commentaire sera visible après modération." })
      setText("")
      setName("")
    } catch (err) {
      setFeedback({ tone: "error", message: describeError(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container narrow section" style={{ paddingTop: 32 }}>
      <Link to="/publications" className="muted" style={{ textDecoration: "none", display: "inline-flex", gap: 6, alignItems: "center", marginBottom: 14 }}>
        <ArrowLeft size={16} /> Toutes les publications
      </Link>
      {pub.loading && !pub.data && <Loading />}
      {pub.error && <Alert tone="error">{pub.error}</Alert>}
      {pub.data && (
        <>
          <article>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <Badge tone="teal">{pub.data.organization_code}</Badge>
              <Badge>{label(pub.data.category)}</Badge>
            </div>
            <h1>{pub.data.title}</h1>
            <p className="muted">Publié le {fmtDate(pub.data.published_at)}</p>
            {/* Le contenu est affiché comme texte brut : aucun HTML provenant de l'API n'est injecté. */}
            <div className="prose" style={{ whiteSpace: "pre-wrap" }}>
              {pub.data.content}
            </div>
          </article>

          <section style={{ marginTop: 40 }} aria-labelledby="commentaires">
            <h2 id="commentaires">Commentaires</h2>
            {comments.data && comments.data.results.length === 0 && <p className="muted">Aucun commentaire publié pour le moment.</p>}
            {comments.data?.results.map((c) => (
              <Card key={c.id}>
                <strong>{c.author_name || "Anonyme"}</strong> <small>· {fmtDateTime(c.created_at)}</small>
                <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{c.content}</p>
              </Card>
            ))}
            <Card className="" >
              <h3>Laisser un commentaire</h3>
              <p className="muted" style={{ fontSize: "0.88rem" }}>
                Les commentaires sont modérés avant publication. Évitez d’y indiquer des données personnelles.
              </p>
              <form onSubmit={submit}>
                <Input label="Nom ou pseudonyme (facultatif)" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
                <Textarea label="Votre commentaire" required minLength={3} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
                <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: "absolute", left: "-9999px" }} />
                {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}
                <Button type="submit" loading={busy}>
                  Envoyer
                </Button>
              </form>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
