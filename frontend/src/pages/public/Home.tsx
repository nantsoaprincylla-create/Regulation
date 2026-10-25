import { ArrowRight, BarChart3, FileText, ShieldCheck, Smartphone } from "lucide-react"
import { Link } from "react-router"
import { ButtonLink, Card, Alert, Badge, Loading, Stat } from "../../components/ui"
import { useApi } from "../../lib/useApi"
import { fmtDate, fmtNumber, label } from "../../lib/format"
import type { Page } from "../../lib/api"

type Overview = { publications: number; reports: number; surveys_open: number; responses_total: number; regions_covered: number; operators: string[] }
type Pub = { id: number; title: string; slug: string; excerpt: string; category: string; published_at: string; organization_code: string }
type Survey = { id: number; title: string; description: string; organization_code: string; target_operator: string | null; estimated_minutes: number; responses_count: number; status: string }

export default function HomePage() {
  const overview = useApi<Overview>("/analytics/public/overview/", { auth: false })
  const pubs = useApi<Page<Pub>>("/publications/public/", { auth: false, query: { page: 1 } })
  const surveys = useApi<Page<Survey>>("/surveys/", { auth: false, query: { status: "PUBLISHED" } })
  const o = overview.data

  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="eyebrow">Plateforme publique de régulation</span>
          <h1>Votre expérience mobile compte pour la régulation.</h1>
          <p>
            Évaluez la qualité des services de Yas, Airtel et Orange en quelques minutes, sans compte et de façon anonyme. Vos réponses éclairent les décisions de l’ARTEC.
          </p>
          <div className="hero-actions">
            <ButtonLink to="/sondages">
              Répondre à un sondage <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink to="/qualite" variant="secondary">
              Voir la qualité des services
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="container public-stats">
        {overview.loading && !o ? (
          <Card>
            <Loading />
          </Card>
        ) : o ? (
          <div className="stats" style={{ marginBottom: 0 }}>
            <Stat label="Sondages ouverts" value={fmtNumber(o.surveys_open)} hint="accessibles sans compte" />
            <Stat label="Réponses collectées" value={fmtNumber(o.responses_total)} hint="agrégées et anonymes" />
            <Stat label="Régions couvertes" value={fmtNumber(o.regions_covered)} hint="dans les mesures validées" />
            <Stat label="Publications" value={fmtNumber(o.publications)} hint={`dont ${o.reports} rapport(s)`} />
          </div>
        ) : (
          <Alert tone="warn">Les chiffres ne sont pas disponibles pour le moment.</Alert>
        )}
      </div>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Comment ça marche</h2>
              <p>Trois étapes pour contribuer à une meilleure qualité de service.</p>
            </div>
          </div>
          <div className="steps-3">
            <div className="step">
              <h3>Choisissez un sondage</h3>
              <p>Les sondages sont publiés par l’ARTEC et par les opérateurs, après validation de l’ARTEC.</p>
            </div>
            <div className="step">
              <h3>Évaluez votre service</h3>
              <p>Indiquez votre région, votre opérateur et notez la qualité (débit, appels, couverture…).</p>
            </div>
            <div className="step">
              <h3>Contribuez à la régulation</h3>
              <p>Les résultats agrégés alimentent les analyses de l’ARTEC. Aucune donnée personnelle n’est demandée.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--surface)", borderBlock: "1px solid var(--line)" }}>
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Sondages ouverts</h2>
              <p>Votre avis, en {surveys.data?.results[0]?.estimated_minutes ?? 4} minutes environ.</p>
            </div>
            <ButtonLink to="/sondages" variant="secondary">
              Tous les sondages
            </ButtonLink>
          </div>
          {surveys.loading && !surveys.data && <Loading />}
          {surveys.error && <Alert tone="error">{surveys.error}</Alert>}
          {surveys.data && surveys.data.results.length === 0 && <p className="muted">Aucun sondage n’est ouvert actuellement.</p>}
          <div className="cards-3">
            {surveys.data?.results.slice(0, 3).map((s) => (
              <Link key={s.id} to={`/sondages/${s.id}`} className="card item-card">
                <div style={{ display: "flex", gap: 8 }}>
                  <Badge tone="teal">{s.organization_code}</Badge>
                  {s.target_operator && <Badge>{s.target_operator}</Badge>}
                </div>
                <h3>{s.title}</h3>
                <p>{s.description || "Participez à cette enquête sur la qualité des services."}</p>
                <div className="item-meta">
                  <span>{s.estimated_minutes} min</span>
                  <span>{fmtNumber(s.responses_count)} réponses</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Dernières publications</h2>
              <p>Rapports, communiqués et informations de l’ARTEC et des opérateurs.</p>
            </div>
            <ButtonLink to="/publications" variant="secondary">
              Toutes les publications
            </ButtonLink>
          </div>
          {pubs.data && pubs.data.results.length === 0 && <p className="muted">Aucune publication pour le moment.</p>}
          <div className="cards-3">
            {pubs.data?.results.slice(0, 3).map((p) => (
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
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container cards-3">
          {[
            [Smartphone, "Un problème de service ?", "Déposez une réclamation ou un signalement, et suivez-le avec votre jeton.", "/reclamation", "Déposer une réclamation"],
            [BarChart3, "Qualité des services", "Consultez les indicateurs agrégés issus de mesures validées par l’ARTEC.", "/qualite", "Voir les indicateurs"],
            [ShieldCheck, "Vos données protégées", "Pas de compte, pas d’adresse IP conservée, pas de géolocalisation précise.", "/confidentialite", "Notre politique"],
          ].map(([I, t, d, to, cta]) => {
            const Icon = I as typeof FileText
            return (
              <Card key={to as string}>
                <Icon size={26} color="var(--primary)" />
                <h3 style={{ marginTop: 10 }}>{t as string}</h3>
                <p className="muted">{d as string}</p>
                <Link to={to as string}>
                  {cta as string} →
                </Link>
              </Card>
            )
          })}
        </div>
      </section>
    </>
  )
}
