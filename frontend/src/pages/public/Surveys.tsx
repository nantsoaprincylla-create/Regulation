import { useMemo, useState } from "react"
import { Link, useParams } from "react-router"
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react"
import { Alert, Badge, Button, ButtonLink, Card, Empty, Input, Loading, Select } from "../../components/ui"
import { api, describeError, type Page } from "../../lib/api"
import { fmtDate, fmtNumber } from "../../lib/format"
import { useApi } from "../../lib/useApi"

type SurveyItem = { id: number; title: string; description: string; organization_code: string; target_operator: string | null; status: string; ends_at: string | null; estimated_minutes: number; responses_count: number }
type Choice = { id: number; label: string }
type Question = { id: number; text: string; question_type: string; is_required: boolean; min_value: number | null; max_value: number | null; choices: Choice[] }
type SurveyDetail = SurveyItem & { questions: Question[]; is_open: boolean }
type Region = { id: number; name: string; cities: { id: number; name: string }[] }
type Overview = { operators: string[] }
type Answer = string | number | boolean | number[] | undefined

export function SurveysPage() {
  const [search, setSearch] = useState("")
  const { data, error, loading } = useApi<Page<SurveyItem>>("/surveys/", { auth: false, query: { search } })
  return (
    <div className="container section" style={{ paddingTop: 36 }}>
      <header className="page-head">
        <div>
          <span className="eyebrow">Participation</span>
          <h1>Sondages publics</h1>
          <p>Répondez sans compte et de façon anonyme. Vos réponses sont agrégées avant toute exploitation.</p>
        </div>
      </header>
      <div className="table-tools">
        <Input aria-label="Rechercher un sondage" placeholder="Rechercher un sondage…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 0 }} />
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {loading && !data && <Loading />}
      {data && data.results.length === 0 && <Empty title="Aucun sondage" text="Aucun sondage ne correspond à votre recherche." />}
      <div className="cards-3">
        {data?.results.map((s) => (
          <Link key={s.id} to={`/sondages/${s.id}`} className="card item-card">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge tone={s.status === "PUBLISHED" ? "green" : "gray"}>{s.status === "PUBLISHED" ? "Ouvert" : "Clos"}</Badge>
              <Badge tone="teal">{s.organization_code}</Badge>
              {s.target_operator && <Badge>{s.target_operator}</Badge>}
            </div>
            <h3>{s.title}</h3>
            <p>{s.description}</p>
            <div className="item-meta">
              <span>{s.estimated_minutes} min</span>
              <span>{fmtNumber(s.responses_count)} réponses</span>
              {s.ends_at && <span>jusqu’au {fmtDate(s.ends_at)}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function QuestionField({ q, value, onChange }: { q: Question; value: Answer; onChange: (v: Answer) => void }) {
  const legend = (
    <legend className="field-label" style={{ marginBottom: 8 }}>
      {q.text} {q.is_required && <span aria-label="obligatoire">*</span>}
    </legend>
  )
  if (q.question_type === "SATISFACTION")
    return (
      <fieldset style={{ border: 0, padding: 0, margin: "0 0 20px" }}>
        {legend}
        <div className="rating-scale">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className={value === n ? "on" : ""} aria-pressed={value === n} onClick={() => onChange(n)}>
              {n}
            </button>
          ))}
        </div>
        <small>1 = très insatisfait · 5 = très satisfait</small>
      </fieldset>
    )
  if (q.question_type === "YES_NO")
    return (
      <fieldset style={{ border: 0, padding: 0, margin: "0 0 20px" }}>
        {legend}
        <div className="rating-scale">
          {[
            [true, "Oui"],
            [false, "Non"],
          ].map(([v, l]) => (
            <button key={String(l)} type="button" style={{ width: 80 }} className={value === v ? "on" : ""} onClick={() => onChange(v as boolean)}>
              {l as string}
            </button>
          ))}
        </div>
      </fieldset>
    )
  if (q.question_type === "SINGLE_CHOICE")
    return (
      <fieldset style={{ border: 0, padding: 0, margin: "0 0 20px" }}>
        {legend}
        {q.choices.map((c) => (
          <label key={c.id} className="check-row">
            <input type="radio" name={`q${q.id}`} checked={value === c.id} onChange={() => onChange(c.id)} />
            <span>{c.label}</span>
          </label>
        ))}
      </fieldset>
    )
  if (q.question_type === "MULTIPLE_CHOICE") {
    const sel = Array.isArray(value) ? value : []
    return (
      <fieldset style={{ border: 0, padding: 0, margin: "0 0 20px" }}>
        {legend}
        {q.choices.map((c) => (
          <label key={c.id} className="check-row">
            <input type="checkbox" checked={sel.includes(c.id)} onChange={(e) => onChange(e.target.checked ? [...sel, c.id] : sel.filter((x) => x !== c.id))} />
            <span>{c.label}</span>
          </label>
        ))}
      </fieldset>
    )
  }
  if (q.question_type === "NUMBER")
    return (
      <Input
        label={q.text + (q.is_required ? " *" : "")}
        type="number"
        min={q.min_value ?? undefined}
        max={q.max_value ?? undefined}
        step="any"
        value={typeof value === "number" ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        hint={q.min_value !== null || q.max_value !== null ? `Entre ${q.min_value ?? "…"} et ${q.max_value ?? "…"}` : undefined}
      />
    )
  return (
    <Input label={q.text + (q.is_required ? " *" : "")} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} />
  )
}

export function SurveyFormPage() {
  const { id } = useParams()
  const survey = useApi<SurveyDetail>(id ? `/surveys/${id}/` : null, { auth: false })
  const regions = useApi<Region[]>("/organizations/regions/", { auth: false })
  const overview = useApi<Overview>("/analytics/public/overview/", { auth: false })
  const s = survey.data
  const token = useApi<{ participation_token: string }>(s?.is_open ? `/surveys/${id}/participation-token/` : null, { auth: false })

  const [step, setStep] = useState(1)
  const [regionId, setRegionId] = useState("")
  const [cityId, setCityId] = useState("")
  const [context, setContext] = useState<"USAGE" | "RESIDENCE">("USAGE")
  const [operator, setOperator] = useState("")
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [website, setWebsite] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState("")

  const cities = useMemo(() => regions.data?.find((r) => String(r.id) === regionId)?.cities ?? [], [regions.data, regionId])
  const effectiveOperator = s?.target_operator ?? operator
  const empty = (v: Answer) => v === undefined || v === "" || (Array.isArray(v) && v.length === 0)
  const missing = s ? s.questions.filter((q) => q.is_required && empty(answers[q.id])) : []

  const submit = async () => {
    if (!s) return
    setBusy(true)
    setFormError("")
    try {
      await api(`/surveys/${s.id}/responses/`, {
        method: "POST",
        auth: false,
        body: {
          region: Number(regionId),
          city: Number(cityId),
          location_context: context,
          operator: effectiveOperator || null,
          participation_token: token.data?.participation_token,
          website,
          answers: Object.entries(answers)
            .filter(([, v]) => !empty(v))
            .map(([q, v]) => ({ question: Number(q), value: v })),
        },
      })
      setDone(true)
    } catch (e) {
      setFormError(describeError(e))
    } finally {
      setBusy(false)
    }
  }

  const wrap = (children: React.ReactNode) => (
    <div className="container narrow section" style={{ paddingTop: 32 }}>
      {children}
    </div>
  )
  if (survey.error) return wrap(<Alert tone="error">{survey.error}</Alert>)
  if (!s) return wrap(<Loading />)
  if (done)
    return wrap(
      <Card>
        <div className="empty">
          <CheckCircle2 size={44} color="var(--green)" />
          <h2>Merci pour votre participation</h2>
          <p>Votre réponse a été enregistrée de façon anonyme.</p>
          <ButtonLink to="/sondages" variant="secondary">
            Retour aux sondages
          </ButtonLink>
        </div>
      </Card>,
    )

  const steps = ["Localisation", "Opérateur", "Évaluation", "Envoi"]
  return wrap(
    <>
      <Link to="/sondages" className="muted" style={{ textDecoration: "none", display: "inline-flex", gap: 6, alignItems: "center", marginBottom: 14 }}>
        <ArrowLeft size={16} /> Tous les sondages
      </Link>
      <Badge tone={s.is_open ? "green" : "gray"}>{s.is_open ? "Sondage ouvert" : "Sondage clos"}</Badge>
      <h1 style={{ marginTop: 8 }}>{s.title}</h1>
      <p className="muted">
        Publié par {s.organization_code} · environ {s.estimated_minutes} min
      </p>
      {s.description && <p>{s.description}</p>}
      {!s.is_open ? (
        <Alert tone="info">Ce sondage n’accepte plus de réponses.</Alert>
      ) : (
        <>
          <div aria-label={`Étape ${step} sur 4`}>
            <div className="survey-progress">
              <span style={{ width: `${step * 25}%` }} />
            </div>
            <small>
              Étape {step} sur 4 · {steps[step - 1]}
            </small>
          </div>
          <Card className="" >
            {step === 1 && (
              <>
                <h2>Où avez-vous utilisé le service ?</h2>
                <Alert tone="info">
                  Aucune adresse exacte, position GPS, identité ou numéro de téléphone ne vous est demandé.
                </Alert>
                {regions.data?.length === 0 && <Alert tone="warn">Le référentiel des régions n’est pas encore configuré.</Alert>}
                <div className="form-grid">
                  <Select
                    label="Région *"
                    value={regionId}
                    onChange={(e) => {
                      setRegionId(e.target.value)
                      setCityId("")
                    }}
                  >
                    <option value="">Sélectionner</option>
                    {regions.data?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                  <Select label="Ville *" disabled={!regionId} value={cityId} onChange={(e) => setCityId(e.target.value)}>
                    <option value="">Sélectionner</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <Select label="Cette localisation correspond à" value={context} onChange={(e) => setContext(e.target.value as "USAGE" | "RESIDENCE")}>
                  <option value="USAGE">Mon lieu d’utilisation du service</option>
                  <option value="RESIDENCE">Mon lieu de résidence</option>
                </Select>
              </>
            )}
            {step === 2 && (
              <>
                <h2>Quel opérateur évaluez-vous ?</h2>
                <Select label="Opérateur" value={effectiveOperator} disabled={!!s.target_operator} onChange={(e) => setOperator(e.target.value)}>
                  <option value="">Non précisé</option>
                  {(overview.data?.operators ?? []).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </Select>
              </>
            )}
            {step === 3 && (
              <>
                <h2>Votre évaluation</h2>
                {s.questions.map((q) => (
                  <QuestionField key={q.id} q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
                ))}
                <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: "absolute", left: "-9999px" }} />
              </>
            )}
            {step === 4 && (
              <>
                <h2>Vérification</h2>
                <dl className="kv">
                  <dt>Région</dt>
                  <dd>{regions.data?.find((r) => String(r.id) === regionId)?.name}</dd>
                  <dt>Ville</dt>
                  <dd>{cities.find((c) => String(c.id) === cityId)?.name}</dd>
                  <dt>Opérateur</dt>
                  <dd>{effectiveOperator || "Non précisé"}</dd>
                  <dt>Réponses</dt>
                  <dd>{Object.values(answers).filter((v) => !empty(v)).length} renseignée(s)</dd>
                </dl>
                {missing.length > 0 && <Alert tone="warn">Questions obligatoires sans réponse : {missing.length}.</Alert>}
                {token.error && <Alert tone="error">{token.error}</Alert>}
                {formError && <Alert tone="error">{formError}</Alert>}
              </>
            )}
            <div className="form-actions" style={{ justifyContent: "space-between" }}>
              <Button variant="secondary" disabled={step === 1} onClick={() => setStep((n) => n - 1)}>
                Précédent
              </Button>
              {step < 4 ? (
                <Button disabled={(step === 1 && (!regionId || !cityId)) || (step === 3 && missing.length > 0)} onClick={() => setStep((n) => n + 1)}>
                  Continuer <ArrowRight size={16} />
                </Button>
              ) : (
                <Button loading={busy} disabled={missing.length > 0 || !token.data} onClick={submit}>
                  Envoyer ma réponse
                </Button>
              )}
            </div>
          </Card>
        </>
      )}
    </>,
  )
}
