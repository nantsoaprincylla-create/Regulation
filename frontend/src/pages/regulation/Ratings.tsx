import { Alert, Card, DistributionBar, Empty, Loading, PageHeader, Status } from "../../components/ui"
import { fmtDateTime, fmtNumber, label, metricLabel } from "../../lib/format"
import { useApi } from "../../lib/useApi"

type Rating = {
  operator: string
  name: string
  indicative_class: "GOOD" | "MEDIUM" | "POOR" | null
  distribution: { GOOD: number; MEDIUM: number; POOR: number }
  observations: number
  last_run: { id: number; completed_at: string; model: string; mean_confidence: number | null } | null
  metrics: Record<string, { average: number; unit: string; n: number }>
  survey_satisfaction: { average: number | null; n: number }
  warnings_12m: number
  congratulations_12m: number
  open_cases: number
}

export function RatingsPage() {
  const { data, error, loading } = useApi<{ disclaimer: string; operators: Rating[] }>("/analytics/operator-ratings/")
  return (
    <>
      <PageHeader eyebrow="Pilotage" title="Évaluation des opérateurs" subtitle="Vue comparative issue des dernières prédictions, des mesures validées, des sondages et des décisions rendues." />
      {loading && !data && <Loading />}
      {error && <Alert tone="error">{error}</Alert>}
      {data && (
        <>
          <Alert tone="info">{data.disclaimer}</Alert>
          <div className="rating-grid">
            {data.operators.map((o) => (
              <Card key={o.operator} className="rating-card">
                <div className="rating-top">
                  <h3>{o.name}</h3>
                  {o.indicative_class ? <Status code={o.indicative_class} /> : <span className="muted">Aucune prédiction</span>}
                </div>
                {o.observations > 0 ? (
                  <>
                    <DistributionBar values={o.distribution} />
                    <small>{fmtNumber(o.observations)} observation(s) · modèle {o.last_run?.model} · {fmtDateTime(o.last_run?.completed_at)}</small>
                  </>
                ) : (
                  <Empty title="Pas encore évalué" text="Lancez une prédiction sur un dataset accepté de cet opérateur." />
                )}
                <div className="rating-metrics">
                  <div><small>Satisfaction (sondages)</small><strong>{o.survey_satisfaction.average !== null ? `${fmtNumber(o.survey_satisfaction.average, 2)} / 5` : "—"}</strong><small> {o.survey_satisfaction.n} avis</small></div>
                  <div><small>Dossiers ouverts</small><strong>{o.open_cases}</strong></div>
                  <div><small>Avertissements (12 mois)</small><strong style={{ color: o.warnings_12m ? "var(--red)" : undefined }}>{o.warnings_12m}</strong></div>
                  <div><small>Félicitations (12 mois)</small><strong style={{ color: o.congratulations_12m ? "var(--green)" : undefined }}>{o.congratulations_12m}</strong></div>
                </div>
                {Object.keys(o.metrics).length > 0 && (
                  <>
                    <small>Moyennes des mesures validées</small>
                    <ul className="list-plain">
                      {Object.entries(o.metrics).map(([k, m]) => <li key={k}><span>{metricLabel(k)}</span><strong>{fmtNumber(m.average, 2)} {m.unit}</strong></li>)}
                    </ul>
                  </>
                )}
              </Card>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 14 }}>Classes : {label("GOOD")}, {label("MEDIUM")}, {label("POOR")} — à lire avec les preuves du dossier avant toute décision.</p>
        </>
      )}
    </>
  )
}
