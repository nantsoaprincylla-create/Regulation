import { Link } from "react-router"
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Alert, ButtonLink, Card, CardHead, Empty, Loading, PageHeader, Stat, Status } from "../../components/ui"
import { CLASS_COLORS, fmtDate, fmtDateTime, fmtNumber, label, monthLabel } from "../../lib/format"
import { useApi } from "../../lib/useApi"
import { useAuth } from "../../lib/auth-context"

type Monthly = { month: string; count: number }
type Regulator = {
  space: "regulation"
  kpis: Record<string, number>
  submissions_by_status: Record<string, number>
  decisions_90d: Record<string, number>
  class_trend: { month: string; GOOD: number; MEDIUM: number; POOR: number }[]
  pending_submissions: { id: number; reference: string; organization: string; dataset_name: string; status: string; submitted_at: string }[]
  upcoming_deadlines: { id: number; reference: string; operator: string; title: string; deadline: string }[]
}
type Operator = {
  space: "operator"
  organization: string
  kpis: Record<string, number>
  responses_monthly: Monthly[]
  submissions_by_status: Record<string, number>
  requests: { kind: string; case_id: number | null; reference: string; title: string; deadline: string | null }[]
  recent_decisions: { id: number; category: string; case_reference: string; case_title: string; decided_at: string }[]
  last_submissions: { id: number; reference: string; dataset_name: string; status: string; submitted_at: string }[]
}
type Publisher = {
  space: "publications"
  kpis: Record<string, number>
  publications_by_status: Record<string, number>
  comments_by_status: Record<string, number>
  publications_monthly: Monthly[]
  responses_monthly: Monthly[]
}
type Data = Regulator | Operator | Publisher

const REQUEST_LABEL: Record<string, string> = { EXPLANATION: "Explication demandée", CORRECTIVE_ACTION: "Action corrective", CORRECTION: "Correction de dataset" }

function MonthlyChart({ data, name, color = "#0b6b5d" }: { data: Monthly[]; name: string; color?: string }) {
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month) }))
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" name={name} fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function Counts({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data)
  if (!entries.length) return <Empty title="Aucune donnée" />
  return (
    <ul className="list-plain">
      {entries.map(([k, n]) => (
        <li key={k}>
          <Status code={k} />
          <strong>{fmtNumber(n)}</strong>
        </li>
      ))}
    </ul>
  )
}

function RegulatorView({ d }: { d: Regulator }) {
  const k = d.kpis
  const trend = d.class_trend.map((r) => ({ ...r, label: monthLabel(r.month) }))
  const hasTrend = trend.some((r) => r.GOOD + r.MEDIUM + r.POOR > 0)
  return (
    <>
      <div className="stats">
        <Stat label="Soumissions à examiner" value={k.submissions_pending_review} tone={k.submissions_pending_review ? "warn" : undefined} hint={`${k.submissions_total} reçues au total`} />
        <Stat label="Prédictions terminées" value={k.predictions_completed} hint={`${k.models_ready} modèle(s) prêt(s)`} />
        <Stat label="Dossiers ouverts" value={k.cases_open} hint={`${k.cases_awaiting_operator} en attente d’opérateur`} />
        <Stat label="Réclamations à traiter" value={k.complaints_open} tone={k.complaints_open ? "warn" : undefined} />
      </div>
      <div className="grid-2">
        <Card>
          <CardHead title="Qualité prédite par mois" subtitle="Observations classées Bonne / Moyenne / Mauvaise (prédictions terminées)" />
          {hasTrend ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="GOOD" name="Bonne" stroke={CLASS_COLORS.GOOD} strokeWidth={2.5} />
                  <Line type="monotone" dataKey="MEDIUM" name="Moyenne" stroke={CLASS_COLORS.MEDIUM} strokeWidth={2.5} />
                  <Line type="monotone" dataKey="POOR" name="Mauvaise" stroke={CLASS_COLORS.POOR} strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty title="Aucune prédiction terminée" text="Lancez une prédiction sur un dataset accepté pour alimenter ce graphique." />
          )}
        </Card>
        <Card>
          <CardHead title="Décisions (90 jours)" />
          <Counts data={d.decisions_90d} />
        </Card>
      </div>
      <div className="grid-2e">
        <Card>
          <CardHead title="Soumissions en attente" action={<ButtonLink to="/regulation/soumissions" variant="secondary">Tout voir</ButtonLink>} />
          {d.pending_submissions.length === 0 ? (
            <Empty title="Rien en attente" />
          ) : (
            <ul className="list-plain">
              {d.pending_submissions.map((s) => (
                <li key={s.id}>
                  <div>
                    <strong>{s.dataset_name}</strong>
                    <small>
                      {s.organization} · {s.reference} · {fmtDateTime(s.submitted_at)}
                    </small>
                  </div>
                  <Status code={s.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHead title="Échéances à venir" action={<ButtonLink to="/regulation/dossiers" variant="secondary">Dossiers</ButtonLink>} />
          {d.upcoming_deadlines.length === 0 ? (
            <Empty title="Aucune échéance" />
          ) : (
            <ul className="list-plain">
              {d.upcoming_deadlines.map((c) => (
                <li key={c.id}>
                  <div>
                    <Link to={`/regulation/dossiers/${c.id}`}>{c.title}</Link>
                    <small>
                      {c.operator} · {c.reference}
                    </small>
                  </div>
                  <strong>{fmtDate(c.deadline)}</strong>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

function OperatorView({ d }: { d: Operator }) {
  const k = d.kpis
  return (
    <>
      <div className="stats">
        <Stat label="Sondages actifs" value={k.surveys_active} />
        <Stat label="Réponses reçues" value={fmtNumber(k.responses_total)} hint="à vos sondages" />
        <Stat label="Datasets" value={k.datasets_total} hint={`${k.submissions_pending} soumission(s) en cours`} />
        <Stat label="Dossiers ARTEC ouverts" value={k.cases_open} tone={k.cases_open ? "warn" : undefined} hint={`${k.complaints_open} contestation(s) en cours`} />
      </div>
      {d.requests.length > 0 && (
        <Alert tone="warn">
          Vous avez {d.requests.length} demande(s) de l’ARTEC qui attendent une action de votre part. Voir « À traiter » ci-dessous.
        </Alert>
      )}
      <div className="grid-2">
        <Card>
          <CardHead title="Réponses à vos sondages" subtitle="6 derniers mois" />
          <MonthlyChart data={d.responses_monthly} name="Réponses" />
        </Card>
        <Card>
          <CardHead title="Mes soumissions" />
          <Counts data={d.submissions_by_status} />
        </Card>
      </div>
      <div className="grid-2e">
        <Card>
          <CardHead title="À traiter" />
          {d.requests.length === 0 ? (
            <Empty title="Rien à traiter" text="Aucune demande de l’ARTEC n’est en attente." />
          ) : (
            <ul className="list-plain">
              {d.requests.map((r, i) => (
                <li key={i}>
                  <div>
                    {r.case_id ? <Link to={`/operateur/dossiers/${r.case_id}`}>{r.title}</Link> : <Link to="/operateur/soumissions">{r.title}</Link>}
                    <small>
                      {REQUEST_LABEL[r.kind]} · {r.reference}
                      {r.deadline ? ` · avant le ${fmtDate(r.deadline)}` : ""}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHead title="Décisions récentes" subtitle="Avertissements, félicitations et recommandations" />
          {d.recent_decisions.length === 0 ? (
            <Empty title="Aucune décision" />
          ) : (
            <ul className="list-plain">
              {d.recent_decisions.map((x) => (
                <li key={x.id}>
                  <div>
                    <Link to={`/operateur/dossiers`}>{x.case_title}</Link>
                    <small>
                      {x.case_reference} · {fmtDate(x.decided_at)}
                    </small>
                  </div>
                  <Status code={x.category} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

function PublisherView({ d }: { d: Publisher }) {
  const k = d.kpis
  return (
    <>
      <div className="stats">
        <Stat label="Publications en ligne" value={k.publications_published} hint={`${k.publications_scheduled} planifiée(s) · ${k.publications_draft} brouillon(s)`} />
        <Stat label="Sondages ouverts" value={k.surveys_open} />
        <Stat label="Sondages à valider" value={k.surveys_pending_approval} tone={k.surveys_pending_approval ? "warn" : undefined} hint="soumis par les opérateurs" />
        <Stat label="Commentaires à modérer" value={k.comments_pending} tone={k.comments_pending ? "warn" : undefined} hint={`${k.comments_reported} signalé(s)`} />
      </div>
      <div className="grid-2e">
        <Card>
          <CardHead title="Publications par mois" />
          <MonthlyChart data={d.publications_monthly} name="Publications" />
        </Card>
        <Card>
          <CardHead title="Réponses à vos sondages" />
          <MonthlyChart data={d.responses_monthly} name="Réponses" color="#c9791a" />
        </Card>
      </div>
      <div className="grid-2e">
        <Card>
          <CardHead title="Publications" />
          <Counts data={d.publications_by_status} />
        </Card>
        <Card>
          <CardHead title="Commentaires" />
          <Counts data={d.comments_by_status} />
        </Card>
      </div>
    </>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data, error, loading } = useApi<Data>("/analytics/dashboard/")
  const first = user?.first_name ? `, ${user.first_name}` : ""
  return (
    <>
      <PageHeader eyebrow="Vue d’ensemble" title={`Bonjour${first}`} subtitle={user?.organization ? `${user.organization.name} · ${label(user.role)}` : undefined} />
      {loading && !data && <Loading />}
      {error && <Alert tone="error">{error}</Alert>}
      {data?.space === "regulation" && <RegulatorView d={data} />}
      {data?.space === "operator" && <OperatorView d={data} />}
      {data?.space === "publications" && <PublisherView d={data} />}
    </>
  )
}
