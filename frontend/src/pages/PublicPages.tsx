import { useMemo, useState } from "react"
import { Link } from "react-router"
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileText,
  Landmark,
  MessageSquareText,
  RadioTower,
  Search,
  ShieldCheck,
  Signal,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { publicIndicators, qosTrend, regions, surveys } from "../data/demo"
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  DemoNotice,
  Heading,
  Input,
  Select,
  Text,
} from "../components/ui"

const publications = [
  {
    type: "Rapport",
    title: "Observatoire de la qualité des services mobiles",
    date: "12 juin 2025",
    org: "ARTEC",
    excerpt:
      "Synthèse méthodologique des indicateurs rendus publics pour la période étudiée.",
  },
  {
    type: "Communiqué",
    title: "Consultation publique sur les indicateurs QoS",
    date: "6 juin 2025",
    org: "ARTEC",
    excerpt:
      "Ouverture d’une consultation destinée aux acteurs et usagers des télécommunications.",
  },
  {
    type: "Information",
    title: "Maintenance programmée des services numériques",
    date: "2 juin 2025",
    org: "YAS",
    excerpt:
      "Information publique communiquée par l’opérateur et validée pour publication.",
  },
]

export function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-grid" />
        <div className="container hero-content">
          <div className="hero-copy">
            <Badge tone="blue">
              <Landmark size={14} /> Initiative de régulation numérique
            </Badge>
            <Heading as="h1">
              Une meilleure qualité des télécommunications,{" "}
              <span>mesurée ensemble.</span>
            </Heading>
            <Text>
              Une plateforme nationale pour collecter, analyser et partager des
              données fiables sur la qualité des services de télécommunications
              à Madagascar.
            </Text>
            <div className="hero-actions">
              <ButtonLink to="/sondages">
                Participer à un sondage <ArrowRight size={18} />
              </ButtonLink>
              <ButtonLink to="/rapports" variant="secondary">
                Consulter les rapports
              </ButtonLink>
            </div>
            <div className="hero-trust">
              <span>
                <CheckCircle2 size={16} /> Participation sans compte
              </span>
              <span>
                <ShieldCheck size={16} /> Données agrégées
              </span>
              <span>
                <FileCheck2 size={16} /> Rapports validés
              </span>
            </div>
          </div>
          <Card className="hero-panel">
            <div className="panel-head">
              <div>
                <Text as="small">APERÇU PUBLIC</Text>
                <Heading as="h3">Qualité des services</Heading>
              </div>
              <Badge tone="green">Mise à jour récente</Badge>
            </div>
            <DemoNotice compact />
            <div className="hero-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={qosTrend}>
                  <defs>
                    <linearGradient id="blueArea" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#2563EB"
                        stopOpacity={0.22}
                      />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#E2E8F0"
                    strokeDasharray="4 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 11 }}
                  />
                  <YAxis hide domain={[50, 80]} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="bonne"
                    stroke="#2563EB"
                    strokeWidth={3}
                    fill="url(#blueArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-summary">
              <div>
                <span className="status-mark good" />
                <Text as="small">Qualité bonne</Text>
                <strong>73%</strong>
              </div>
              <div>
                <span className="status-mark medium" />
                <Text as="small">Qualité moyenne</Text>
                <strong>20%</strong>
              </div>
              <div>
                <span className="status-mark poor" />
                <Text as="small">Qualité mauvaise</Text>
                <strong>7%</strong>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="stats-strip">
        <div className="container stats-grid">
          {publicIndicators.map((item) => (
            <div key={item.label} className="public-stat">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              <small>{item.detail}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="section-heading centered">
          <Text as="small" className="eyebrow">
            UNE MISSION PARTAGÉE
          </Text>
          <Heading>Des données au service de l’intérêt général</Heading>
          <Text>
            La plateforme réunit citoyens, opérateurs et autorité de régulation
            autour d’une information vérifiable.
          </Text>
        </div>
        <div className="feature-grid">
          <Card className="feature-card">
            <span className="feature-icon">
              <MessageSquareText />
            </span>
            <Heading as="h3">Écouter les usagers</Heading>
            <Text>
              Recueillir des retours structurés sur la qualité ressentie, par
              région et par service.
            </Text>
            <Link to="/sondages">
              Voir les sondages <ChevronRight size={16} />
            </Link>
          </Card>
          <Card className="feature-card">
            <span className="feature-icon">
              <BarChart3 />
            </span>
            <Heading as="h3">Mesurer objectivement</Heading>
            <Text>
              Comparer les mesures techniques selon une méthodologie commune et
              transparente.
            </Text>
            <Link to="/qualite">
              Découvrir les indicateurs <ChevronRight size={16} />
            </Link>
          </Card>
          <Card className="feature-card">
            <span className="feature-icon">
              <ShieldCheck />
            </span>
            <Heading as="h3">Éclairer la régulation</Heading>
            <Text>
              Fournir aux agents des analyses traçables, sans automatiser les
              décisions officielles.
            </Text>
            <Link to="/a-propos">
              Comprendre la démarche <ChevronRight size={16} />
            </Link>
          </Card>
        </div>
      </section>

      <section className="section section-muted">
        <div className="container">
          <div className="section-heading split">
            <div>
              <Text as="small" className="eyebrow">
                PARTICIPEZ
              </Text>
              <Heading>Sondages actuellement ouverts</Heading>
            </div>
            <ButtonLink to="/sondages" variant="secondary">
              Voir tous les sondages <ArrowRight size={16} />
            </ButtonLink>
          </div>
          <div className="survey-grid">
            {surveys.map((survey) => (
              <SurveyCard key={survey.title} survey={survey} />
            ))}
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading split">
          <div>
            <Text as="small" className="eyebrow">
              INFORMATIONS
            </Text>
            <Heading>Dernières publications</Heading>
          </div>
          <ButtonLink to="/publications" variant="ghost">
            Toutes les publications <ArrowRight size={16} />
          </ButtonLink>
        </div>
        <div className="publication-list">
          {publications.map((item) => (
            <Card className="publication-item" key={item.title}>
              <span className="document-icon">
                <FileText />
              </span>
              <div className="publication-content">
                <div>
                  <Badge tone="blue">{item.type}</Badge>
                  <Text as="small">
                    {item.org} · {item.date}
                  </Text>
                </div>
                <Heading as="h3">{item.title}</Heading>
                <Text>{item.excerpt}</Text>
              </div>
              <ButtonLink
                to="/publications"
                variant="ghost"
                aria-label="Lire la publication"
              >
                <ArrowRight size={19} />
              </ButtonLink>
            </Card>
          ))}
        </div>
      </section>

      <section className="participate-band">
        <div className="container participate-content">
          <span className="large-icon">
            <UsersRound />
          </span>
          <div>
            <Heading>Votre expérience compte</Heading>
            <Text>
              Répondez en quelques minutes. Aucun nom, numéro de téléphone ou
              position GPS n’est demandé.
            </Text>
          </div>
          <ButtonLink to="/sondages" variant="secondary">
            Participer maintenant <ArrowRight size={17} />
          </ButtonLink>
        </div>
      </section>
    </>
  )
}

function SurveyCard({ survey }: { survey: typeof surveys[number] }) {
  return (
    <Card className="survey-card">
      <div className="survey-top">
        <Badge tone="green">{survey.status}</Badge>
        <span>
          <Clock3 size={15} /> {survey.time}
        </span>
      </div>
      <Heading as="h3">{survey.title}</Heading>
      <Text>
        Partagez votre expérience récente afin de contribuer à une meilleure
        compréhension de la qualité perçue.
      </Text>
      <div className="survey-meta">
        <span>
          <Landmark size={16} />
          <small>Publié par</small>
          <strong>{survey.organization}</strong>
        </span>
        <span>
          <Signal size={16} />
          <small>Opérateur évalué</small>
          <strong>{survey.target}</strong>
        </span>
      </div>
      <div className="survey-footer">
        <span>
          <CalendarDays size={15} /> Jusqu’au {survey.date}
        </span>
        <span>{survey.responses} réponses</span>
      </div>
      <ButtonLink to="/sondages" className="full-button">
        Participer <ArrowRight size={16} />
      </ButtonLink>
    </Card>
  )
}

export function SurveysPage() {
  return (
    <section className="page-section">
      <div className="container">
        <div className="page-heading">
          <div>
            <Text as="small" className="eyebrow">
              PARTICIPATION PUBLIQUE
            </Text>
            <Heading as="h1">Sondages et consultations</Heading>
            <Text>
              Exprimez votre expérience des services de télécommunications.
              Aucun compte n’est nécessaire.
            </Text>
          </div>
          <DemoNotice />
        </div>
        <Card className="filter-bar">
          <div className="search-box">
            <Search size={18} />
            <Input placeholder="Rechercher un sondage…" />
          </div>
          <Select aria-label="Statut">
            <option>Tous les statuts</option>
            <option>Ouverts</option>
            <option>À venir</option>
            <option>Clôturés</option>
          </Select>
          <Select aria-label="Organisme">
            <option>Tous les organismes</option>
            <option>ARTEC</option>
            <option>YAS</option>
            <option>AIRTEL</option>
            <option>ORANGE</option>
          </Select>
          <Button variant="secondary">
            <SlidersHorizontal size={17} /> Plus de filtres
          </Button>
        </Card>
        <div className="results-line">
          <Text>
            <strong>3 sondages ouverts</strong> sur 8 résultats
          </Text>
          <Select aria-label="Tri">
            <option>Plus récents</option>
            <option>Date de clôture</option>
          </Select>
        </div>
        <div className="survey-grid">
          {surveys.map((survey) => (
            <SurveyCard key={survey.title} survey={survey} />
          ))}
        </div>
      </div>
    </section>
  )
}

export function SurveyFormPage() {
  const [region, setRegion] = useState("")
  const [city, setCity] = useState("")
  const [step, setStep] = useState(1)
  const cities = useMemo(() => regions[region] ?? [], [region])
  return (
    <section className="page-section survey-form-page">
      <div className="container narrow">
        <Link to="/sondages" className="back-link">
          ← Retour aux sondages
        </Link>
        <div className="form-title">
          <div>
            <Badge tone="green">Sondage ouvert</Badge>
            <Heading as="h1">Qualité de l’internet mobile</Heading>
            <Text>Publié par l’ARTEC · Temps estimé : 4 minutes</Text>
          </div>
          <DemoNotice compact />
        </div>
        <div className="progress-wrap">
          <div className="progress-labels">
            <span>Localisation</span>
            <span>Service utilisé</span>
            <span>Évaluation</span>
            <span>Vérification</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${step * 25}%` }} />
          </div>
          <Text as="small">Étape {step} sur 4</Text>
        </div>
        <Card className="survey-form-card">
          {step === 1 && (
            <>
              <div className="form-section-head">
                <span className="step-icon">1</span>
                <div>
                  <Heading as="h2">Où avez-vous utilisé le service ?</Heading>
                  <Text>
                    Ces informations servent uniquement à agréger les résultats
                    par zone.
                  </Text>
                </div>
              </div>
              <div className="privacy-note">
                <ShieldCheck size={20} />
                <Text>
                  Aucune adresse exacte, coordonnée GPS, identité ou numéro de
                  téléphone ne vous sera demandé.
                </Text>
              </div>
              <div className="form-grid">
                <Select
                  label="Région *"
                  value={region}
                  onChange={(event) => {
                    setRegion(event.target.value)
                    setCity("")
                  }}
                >
                  <option value="">Sélectionner une région</option>
                  {Object.keys(regions).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
                <Select
                  label="Ville *"
                  disabled={!region}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                >
                  <option value="">Sélectionner une ville</option>
                  {cities.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </Select>
              </div>
              <Checkbox>
                Il s’agit du lieu d’utilisation du service, différent de mon
                lieu de résidence.
              </Checkbox>
            </>
          )}
          {step === 2 && (
            <>
              <div className="form-section-head">
                <span className="step-icon">2</span>
                <div>
                  <Heading as="h2">Quel service avez-vous utilisé ?</Heading>
                  <Text>
                    Sélectionnez le contexte correspondant à votre expérience.
                  </Text>
                </div>
              </div>
              <div className="choice-grid">
                {[
                  "Internet mobile 4G",
                  "Internet mobile 3G",
                  "Appels vocaux",
                  "SMS",
                ].map((item) => (
                  <Button
                    variant="secondary"
                    className="choice-button"
                    key={item}
                  >
                    <RadioTower size={20} />
                    {item}
                  </Button>
                ))}
              </div>
              <Select label="Opérateur concerné *">
                <option value="">Sélectionner</option>
                <option>YAS</option>
                <option>AIRTEL</option>
                <option>ORANGE</option>
              </Select>
            </>
          )}
          {step > 2 && (
            <div className="empty-step">
              <Signal size={34} />
              <Heading>Évaluation du service</Heading>
              <Text>
                Les questions de démonstration seraient chargées ici depuis
                l’API du sondage.
              </Text>
            </div>
          )}
          <div className="form-actions">
            <Button
              variant="secondary"
              disabled={step === 1}
              onClick={() => setStep(Math.max(1, step - 1))}
            >
              Précédent
            </Button>
            <Text as="small">
              Vos réponses restent uniquement dans ce navigateur tant que le
              formulaire est ouvert.
            </Text>
            <Button
              disabled={step === 1 && (!region || !city)}
              onClick={() => setStep(Math.min(4, step + 1))}
            >
              Continuer <ArrowRight size={17} />
            </Button>
          </div>
        </Card>
      </div>
    </section>
  )
}

export function PlaceholderPublicPage({ title }: { title: string }) {
  return (
    <section className="page-section">
      <div className="container">
        <div className="page-heading">
          <div>
            <Text as="small" className="eyebrow">
              ESPACE PUBLIC
            </Text>
            <Heading as="h1">{title}</Heading>
            <Text>
              Consultez les informations publiques validées et autorisées à la
              publication.
            </Text>
          </div>
          <DemoNotice />
        </div>
        <Card className="placeholder-card">
          <FileText size={36} />
          <Heading>Contenu public validé</Heading>
          <Text>
            Cette section est prête à être alimentée par l’API Django REST
            Framework. Les données affichées dans ce prototype sont fictives.
          </Text>
          <ButtonLink to="/" variant="secondary">
            Retour à l’accueil
          </ButtonLink>
        </Card>
      </div>
    </section>
  )
}
