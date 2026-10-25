import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Alert, Card, CardHead, Empty, Loading } from "../../components/ui"
import { fmtNumber, metricLabel } from "../../lib/format"
import { useApi } from "../../lib/useApi"

type Quality = {
  min_sample: number
  measures: { operator: string; metric: string; unit: string; method: string; average: number; n: number }[]
  satisfaction: { operator: string; average: number; n: number }[]
  download_speed_by_region: { region: string; values: { operator: string; average: number; unit: string }[] }[]
  note: string
}
const COLORS: Record<string, string> = { YAS: "#d98e04", AIRTEL: "#b83227", ORANGE: "#e07b00" }

export default function QualityPage() {
  const { data, error, loading } = useApi<Quality>("/analytics/public/quality/", { auth: false })
  const groups = new Map<string, Quality["measures"]>()
  data?.measures.forEach((m) => {
    const k = `${m.metric}|${m.method}`
    groups.set(k, [...(groups.get(k) ?? []), m])
  })
  return (
    <div className="container section" style={{ paddingTop: 36 }}>
      <header className="page-head">
        <div>
          <span className="eyebrow">Transparence</span>
          <h1>Qualité des services</h1>
          <p>Indicateurs agrégés issus de mesures validées par l’ARTEC et de sondages publics.</p>
        </div>
      </header>
      {loading && !data && <Loading />}
      {error && <Alert tone="error">{error}</Alert>}
      {data && (
        <>
          <Alert tone="info">
            {data.note} Seuls les groupes d’au moins {data.min_sample} observations sont affichés.
          </Alert>
          {data.satisfaction.length > 0 && (
            <Card>
              <CardHead title="Satisfaction des utilisateurs" subtitle="Moyenne sur 5, sondages dont les résultats sont publics" />
              <div className="chart-box" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.satisfaction}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="operator" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Bar dataKey="average" name="Satisfaction" fill="#0b6b5d" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
          {[...groups.entries()].map(([k, rows]) => (
            <Card key={k}>
              <CardHead title={metricLabel(rows[0].metric)} subtitle={`Méthode de mesure : ${rows[0].method} · unité : ${rows[0].unit}`} />
              <div className="chart-box" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="operator" />
                    <YAxis />
                    <Tooltip formatter={(v) => `${fmtNumber(Number(v), 2)} ${rows[0].unit}`} />
                    <Bar dataKey="average" name="Moyenne" radius={[6, 6, 0, 0]} fill="#0b6b5d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          ))}
          {data.download_speed_by_region.length > 0 && (
            <Card>
              <CardHead title="Débit descendant par région" />
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Région</th>
                      <th>Opérateur</th>
                      <th>Moyenne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.download_speed_by_region.flatMap((r) =>
                      r.values.map((v) => (
                        <tr key={`${r.region}-${v.operator}`}>
                          <td>{r.region}</td>
                          <td style={{ color: COLORS[v.operator] }}>
                            <strong>{v.operator}</strong>
                          </td>
                          <td>
                            {fmtNumber(v.average, 2)} {v.unit}
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          {data.measures.length === 0 && data.satisfaction.length === 0 && <Empty title="Pas encore de données publiables" text="Les indicateurs apparaîtront dès que des mesures validées et assez de réponses seront disponibles." />}
        </>
      )}
    </div>
  )
}
