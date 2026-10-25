import { useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Alert, Card, CardHead, Loading, PageHeader, Select, Tabs } from "../../components/ui"
import { DataTable } from "../../components/DataTable"
import { fmtDateTime, fmtNumber, label, metricLabel } from "../../lib/format"
import { useApi } from "../../lib/useApi"

type Summary = { operator: string; metric_name: string; unit: string; measurement_method: string; technology: string; source_type: string; average: number; count: number }
type Measure = { id: number; operator: string; metric_name: string; metric_value: number; unit: string; technology: string; measurement_method: string; source_type: string; measured_at: string; region_name?: string; region?: number | string }
type Threshold = { id: number; metric_name: string; technology: string; service_type: string; good_threshold?: number; poor_threshold?: number; origin?: string; unit?: string }

export function QosPage() {
  const [tab, setTab] = useState<"summary" | "measures" | "thresholds">("summary")
  const metrics = useApi<Record<string, string[]>>("/qos/measurements/metrics/")
  const [metric, setMetric] = useState("download_speed")
  const summary = useApi<Summary[]>("/qos/measurements/summary/", { query: { metric_name: metric } })
  const groups = new Map<string, Summary[]>()
  summary.data?.forEach((s) => {
    const k = `${s.measurement_method} · ${s.technology} · ${label(s.source_type)}`
    groups.set(k, [...(groups.get(k) ?? []), s])
  })
  return (
    <>
      <PageHeader eyebrow="Pilotage" title="Indicateurs QoS" subtitle="Mesures validées issues des datasets acceptés. Les méthodes, technologies et sources ne sont jamais mélangées dans une même moyenne." />
      <Tabs tabs={[["summary", "Synthèse"], ["measures", "Mesures"], ["thresholds", "Seuils de référence"]]} value={tab} onChange={setTab} />
      {tab === "summary" && (
        <>
          <div className="table-tools">
            <Select aria-label="Indicateur" value={metric} onChange={(e) => setMetric(e.target.value)}>
              {Object.keys(metrics.data ?? { download_speed: [] }).map((m) => <option key={m} value={m}>{metricLabel(m)}</option>)}
            </Select>
          </div>
          {summary.loading && !summary.data && <Loading />}
          {summary.error && <Alert tone="error">{summary.error}</Alert>}
          {summary.data && groups.size === 0 && <Alert tone="info">Aucune mesure validée pour cet indicateur.</Alert>}
          {[...groups.entries()].map(([k, rows]) => (
            <Card key={k}>
              <CardHead title={metricLabel(metric)} subtitle={`${k} · unité ${rows[0].unit}`} />
              <div className="chart-box" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="operator" />
                    <YAxis />
                    <Tooltip formatter={(v) => `${fmtNumber(Number(v), 2)} ${rows[0].unit}`} />
                    <Bar dataKey="average" name="Moyenne" fill="#0b6b5d" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          ))}
        </>
      )}
      {tab === "measures" && (
        <Card>
          <DataTable<Measure>
            endpoint="/qos/measurements/"
            searchable={false}
            filters={[{ name: "operator__code", label: "Opérateur", options: [["YAS", "YAS"], ["AIRTEL", "AIRTEL"], ["ORANGE", "ORANGE"]] }]}
            columns={[
              { header: "Opérateur", render: (m) => <strong>{m.operator}</strong> },
              { header: "Indicateur", render: (m) => metricLabel(m.metric_name) },
              { header: "Valeur", render: (m) => `${fmtNumber(m.metric_value, 2)} ${m.unit}` },
              { header: "Technologie", render: (m) => m.technology },
              { header: "Méthode", render: (m) => m.measurement_method },
              { header: "Mesurée le", render: (m) => fmtDateTime(m.measured_at) },
            ]}
          />
        </Card>
      )}
      {tab === "thresholds" && (
        <Card>
          <Alert tone="info">Seuils utilisés pour interpréter les indicateurs. Leur origine (réglementaire ou interne) doit être précisée avant tout usage dans une décision.</Alert>
          <DataTable<Threshold>
            endpoint="/qos/thresholds/"
            searchable={false}
            columns={[
              { header: "Indicateur", render: (t) => metricLabel(t.metric_name) },
              { header: "Technologie", render: (t) => t.technology || "—" },
              { header: "Service", render: (t) => t.service_type || "—" },
              { header: "Origine", render: (t) => t.origin ?? "—" },
            ]}
            emptyTitle="Aucun seuil défini"
          />
        </Card>
      )}
    </>
  )
}
