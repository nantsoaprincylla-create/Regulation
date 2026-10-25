import { useState } from "react"
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Database,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Sparkles,
  TriangleAlert,
  Upload,
  UsersRound,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { qosTrend, submissions } from "../data/demo"
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  DemoNotice,
  Heading,
  Input,
  Select,
  Text,
} from "../components/ui"

type Mode = "regulation" | "operator" | "publications"

const dashboardCopy = {
  regulation: {
    eyebrow: "CENTRE DE CONTRÔLE ANALYTIQUE",
    title: "Bonjour, Direction de la régulation",
    subtitle:
      "Suivez les soumissions, analyses QoS et dossiers réglementaires.",
  },
  operator: {
    eyebrow: "ESPACE OPÉRATEUR · YAS",
    title: "Bonjour, équipe YAS",
    subtitle: "Suivez vos collectes, datasets et échanges avec l’ARTEC.",
  },
  publications: {
    eyebrow: "ESPACE ÉDITORIAL",
    title: "Bonjour, Cellule publications",
    subtitle:
      "Pilotez les contenus publics, sondages et opérations de modération.",
  },
}

const statSets = {
  regulation: [
    ["Datasets reçus", "84", "+12 ce mois", Database, "up"],
    ["En attente d’examen", "11", "3 prioritaires", Clock3, "neutral"],
    ["Prédictions réalisées", "126", "+18 ce mois", BrainCircuit, "up"],
    ["Dossiers ouverts", "9", "2 échéances proches", FileText, "warning"],
  ],
  operator: [
    ["Sondages actifs", "4", "+1 ce mois", BarChart3, "up"],
    ["Réponses collectées", "3 248", "+14,2 %", UsersRound, "up"],
    ["Datasets préparés", "18", "4 brouillons", Database, "neutral"],
    ["Soumissions en attente", "3", "1 correction", Send, "warning"],
  ],
  publications: [
    ["Publications actives", "36", "+5 ce mois", FileText, "up"],
    ["Sondages ouverts", "6", "2 clôtures proches", BarChart3, "warning"],
    ["Brouillons", "12", "4 à relire", FileCheck2, "neutral"],
    ["Commentaires signalés", "7", "3 prioritaires", AlertCircle, "warning"],
  ],
}

export default function Dashboard({ mode }: { mode: Mode }) {
  const copy = dashboardCopy[mode]
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <Text as="small" className="eyebrow">
            {copy.eyebrow}
          </Text>
          <Heading as="h1">{copy.title}</Heading>
          <Text>{copy.subtitle}</Text>
        </div>
        <div className="dashboard-actions">
          <Button variant="secondary">
            <Download size={17} /> Exporter
          </Button>
          <Button>
            {mode === "regulation" ? (
              <>
                <Plus size={17} /> Nouveau dossier
              </>
            ) : mode === "operator" ? (
              <>
                <Upload size={17} /> Importer un dataset
              </>
            ) : (
              <>
                <Plus size={17} /> Nouvelle publication
              </>
            )}
          </Button>
        </div>
      </div>
      <DemoNotice />
      <div className="dashboard-filters">
        <div>
          <CalendarDays size={17} />
          <Text as="small">Période d’analyse</Text>
          <strong>30 derniers jours</strong>
        </div>
        <Select aria-label="Région">
          <option>Toutes les régions</option>
          <option>Analamanga</option>
          <option>Atsinanana</option>
        </Select>
        <Select aria-label="Service">
          <option>Tous les services</option>
          <option>Internet mobile</option>
          <option>Voix</option>
          <option>SMS</option>
        </Select>
        <Button variant="ghost">
          <Filter size={17} /> Filtres
        </Button>
      </div>
      <div className="stats-cards">
        {statSets[mode].map(([label, value, detail, Icon, trend]) => (
          <Card className="stat-card" key={label as string}>
            <div className="stat-card-top">
              <span className="stat-icon">
                <Icon size={20} />
              </span>
              <Button variant="ghost" size="sm">
                <MoreHorizontal size={18} />
              </Button>
            </div>
            <Text as="small">{label as string}</Text>
            <strong className="stat-value">{value as string}</strong>
            <span className={`stat-trend ${trend}`}>
              {trend === "up" ? (
                <ArrowUpRight size={14} />
              ) : trend === "warning" ? (
                <TriangleAlert size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}
              {detail as string}
            </span>
          </Card>
        ))}
      </div>
      {mode === "regulation" ? (
        <RegulationContent />
      ) : mode === "operator" ? (
        <OperatorContent />
      ) : (
        <PublicationContent />
      )}
    </>
  )
}

function RegulationContent() {
  return (
    <>
      <div className="dashboard-grid two-one">
        <Card className="chart-card">
          <CardHeader
            title="Évolution de la qualité agrégée"
            subtitle="Répartition des classes QoS — données de démonstration"
            action="6 derniers mois"
          />
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={qosTrend}>
                <CartesianGrid
                  stroke="#E2E8F0"
                  vertical={false}
                  strokeDasharray="4 4"
                />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} unit="%" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="bonne"
                  name="Bonne"
                  stroke="#1D4ED8"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="moyenne"
                  name="Moyenne"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="mauvaise"
                  name="Mauvaise"
                  stroke="#DC2626"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="model-card">
          <CardHeader
            title="Dernière prédiction"
            subtitle="Modèle Softmax v2.4"
            action=""
          />
          <div className="prediction-result">
            <span className="prediction-icon">
              <Sparkles size={24} />
            </span>
            <div>
              <Text as="small">CLASSE PRÉDITE</Text>
              <Heading as="h2">Qualité bonne</Heading>
              <Text>Confiance du modèle : 73 %</Text>
            </div>
          </div>
          <div className="probability-list">
            <Probability label="Bonne" value={73} tone="blue" />
            <Probability label="Moyenne" value={20} tone="orange" />
            <Probability label="Mauvaise" value={7} tone="red" />
          </div>
          <div className="model-warning">
            <AlertCircle size={17} />
            <Text as="small">
              Résultat fictif. Une prédiction assiste l’analyse et ne constitue
              pas une décision réglementaire.
            </Text>
          </div>
          <ButtonLink
            to="/regulation/predictions"
            variant="secondary"
            className="full-button"
          >
            Ouvrir le module de prédiction <ArrowRight size={16} />
          </ButtonLink>
        </Card>
      </div>
      <SubmissionsTable />
      <Workflow />
    </>
  )
}

function OperatorContent() {
  return (
    <>
      <div className="dashboard-grid two-one">
        <Card className="chart-card">
          <CardHeader
            title="Réponses aux sondages"
            subtitle="Évolution mensuelle — données propres à YAS"
            action="6 derniers mois"
          />
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qosTrend}>
                <CartesianGrid
                  stroke="#E2E8F0"
                  vertical={false}
                  strokeDasharray="4 4"
                />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar
                  dataKey="bonne"
                  name="Réponses"
                  fill="#2563EB"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="requests-card">
          <CardHeader
            title="Demandes de l’ARTEC"
            subtitle="Actions requises"
            action=""
          />
          <RequestItem
            tone="red"
            title="Correction du dataset DS-2025-083"
            date="Échéance : 24 juin"
          />
          <RequestItem
            tone="orange"
            title="Explication sur l’indicateur DATA-04"
            date="Échéance : 28 juin"
          />
          <RequestItem
            tone="blue"
            title="Complément documentaire"
            date="Échéance : 2 juillet"
          />
          <Button variant="secondary" className="full-button">
            Voir toutes les demandes
          </Button>
        </Card>
      </div>
      <Card className="table-card">
        <CardHeader
          title="Dernières soumissions"
          subtitle="Datasets transmis par votre organisation uniquement"
          action="Voir toutes"
        />
        <table className="data-table">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Type de données</th>
              <th>Date</th>
              <th>Statut</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {submissions
              .filter((item) => item.operator === "YAS")
              .concat([
                {
                  id: "DS-2025-076",
                  operator: "YAS",
                  type: "Mesures data 4G",
                  date: "8 juin 2025",
                  status: "Accepté",
                },
                {
                  id: "DS-2025-068",
                  operator: "YAS",
                  type: "Qualité voix",
                  date: "30 mai 2025",
                  status: "Accepté",
                },
              ])
              .map((item) => (
                <SubmissionRow key={item.id} item={item} showOperator={false} />
              ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}

function PublicationContent() {
  const data = [
    { name: "Publiés", value: 36 },
    { name: "Planifiés", value: 8 },
    { name: "Brouillons", value: 12 },
  ]
  return (
    <>
      <div className="dashboard-grid two-one">
        <Card className="chart-card">
          <CardHeader
            title="Audience des contenus"
            subtitle="Consultations des publications publiques"
            action="30 derniers jours"
          />
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={qosTrend}>
                <CartesianGrid
                  stroke="#E2E8F0"
                  vertical={false}
                  strokeDasharray="4 4"
                />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="bonne"
                  name="Consultations"
                  stroke="#1D4ED8"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="donut-card">
          <CardHeader
            title="État des contenus"
            subtitle="Répartition éditoriale"
            action=""
          />
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={58}
                  outerRadius={82}
                  dataKey="value"
                  paddingAngle={4}
                >
                  {["#1D4ED8", "#60A5FA", "#CBD5E1"].map((color) => (
                    <Cell key={color} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <strong>56</strong>
              <small>contenus</small>
            </div>
          </div>
          <div className="legend-list">
            {data.map((item, index) => (
              <span key={item.name}>
                <i className={`legend-dot dot-${index}`} />
                {item.name}
                <strong>{item.value}</strong>
              </span>
            ))}
          </div>
        </Card>
      </div>
      <Card className="table-card">
        <CardHeader
          title="Publications récemment modifiées"
          subtitle="Activité éditoriale de votre équipe"
          action="Gérer les publications"
        />
        <table className="data-table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Catégorie</th>
              <th>Dernière modification</th>
              <th>Statut</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Observatoire de la qualité mobile</strong>
              </td>
              <td>Rapport</td>
              <td>Il y a 2 h</td>
              <td>
                <Badge tone="green">Publié</Badge>
              </td>
              <td>
                <MoreHorizontal size={18} />
              </td>
            </tr>
            <tr>
              <td>
                <strong>Consultation publique QoS</strong>
              </td>
              <td>Consultation</td>
              <td>Il y a 5 h</td>
              <td>
                <Badge tone="blue">Planifié</Badge>
              </td>
              <td>
                <MoreHorizontal size={18} />
              </td>
            </tr>
            <tr>
              <td>
                <strong>Évolution des services numériques</strong>
              </td>
              <td>Actualité</td>
              <td>Hier</td>
              <td>
                <Badge tone="gray">Brouillon</Badge>
              </td>
              <td>
                <MoreHorizontal size={18} />
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </>
  )
}

function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle: string
  action: string
}) {
  return (
    <div className="card-header">
      <div>
        <Heading as="h3">{title}</Heading>
        <Text as="small">{subtitle}</Text>
      </div>
      {action && (
        <Button variant="ghost" size="sm">
          {action} <ChevronRight size={15} />
        </Button>
      )}
    </div>
  )
}

function Probability({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="probability">
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="prob-track">
        <span className={tone} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function RequestItem({
  title,
  date,
  tone,
}: {
  title: string
  date: string
  tone: string
}) {
  return (
    <div className="request-item">
      <span className={`request-mark ${tone}`} />
      <div>
        <strong>{title}</strong>
        <small>{date}</small>
      </div>
      <ChevronRight size={17} />
    </div>
  )
}

function SubmissionsTable() {
  return (
    <Card className="table-card">
      <CardHeader
        title="Soumissions récentes"
        subtitle="Datasets transmis par les opérateurs"
        action="Voir toutes les soumissions"
      />
      <div className="table-tools">
        <div className="search-box">
          <Search size={17} />
          <Input placeholder="Rechercher une soumission…" />
        </div>
        <Select>
          <option>Tous les opérateurs</option>
          <option>YAS</option>
          <option>AIRTEL</option>
          <option>ORANGE</option>
        </Select>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Opérateur</th>
            <th>Type de données</th>
            <th>Date</th>
            <th>Statut</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {submissions.map((item) => (
            <SubmissionRow key={item.id} item={item} showOperator />
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function SubmissionRow({
  item,
  showOperator,
}: {
  item: typeof submissions[number]
  showOperator: boolean
}) {
  const tone =
    item.status === "Accepté"
      ? "green"
      : item.status === "Correction demandée"
        ? "orange"
        : "blue"
  return (
    <tr>
      <td>
        <strong>{item.id}</strong>
      </td>
      {showOperator && (
        <td>
          <span className="operator-cell">
            <span>{item.operator.slice(0, 2)}</span>
            {item.operator}
          </span>
        </td>
      )}
      <td>{item.type}</td>
      <td>{item.date}</td>
      <td>
        <Badge tone={tone}>{item.status}</Badge>
      </td>
      <td>
        <Button variant="ghost" size="sm">
          <Eye size={17} />
        </Button>
      </td>
    </tr>
  )
}

function Workflow() {
  const steps = [
    "Collecte",
    "Validation",
    "Soumission",
    "Examen",
    "Analyse",
    "Vérification",
    "Explication",
    "Réponse",
    "Décision",
    "Notification",
    "Suivi",
    "Clôture",
  ]
  return (
    <Card className="workflow-card">
      <CardHeader
        title="Workflow réglementaire"
        subtitle="La prédiction assiste l’analyse, elle ne remplace jamais le jugement humain."
        action=""
      />
      <div className="workflow">
        {steps.map((step, index) => (
          <div
            key={step}
            className={index < 4 ? "done" : index === 4 ? "active" : ""}
          >
            <span>
              {index < 4 ? <CheckCircle2 size={17} /> : <CircleDot size={17} />}
            </span>
            <small>{index + 1}</small>
            <strong>{step}</strong>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function PredictionPage() {
  const [ran, setRan] = useState(false)
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <Text as="small" className="eyebrow">
            ANALYSE ASSISTÉE
          </Text>
          <Heading as="h1">Prédiction Softmax</Heading>
          <Text>
            Évaluez un dataset validé à l’aide d’un modèle disponible.
          </Text>
        </div>
        <Badge tone="blue">Aide à la décision</Badge>
      </div>
      <DemoNotice />
      <div className="dashboard-grid one-one">
        <Card className="prediction-form">
          <CardHeader
            title="Configurer l’analyse"
            subtitle="Les calculs seront exécutés par l’API sécurisée."
            action=""
          />
          <Select label="Dataset validé">
            <option>DS-2025-079 · Mesures SMS · ORANGE</option>
            <option>DS-2025-076 · Mesures data 4G · YAS</option>
          </Select>
          <Select label="Modèle de classification">
            <option>Softmax QoS v2.4 · Validé le 12/05/2025</option>
            <option>Softmax QoS v2.3 · Archivé</option>
          </Select>
          <div className="variables-box">
            <Text as="small">VARIABLES D’ENTRÉE VÉRIFIÉES</Text>
            {[
              "latence_ms",
              "debit_descendant",
              "taux_perte",
              "disponibilite",
            ].map((item) => (
              <span key={item}>
                <CheckCircle2 size={16} />
                {item}
              </span>
            ))}
          </div>
          <Button className="full-button" onClick={() => setRan(true)}>
            <Sparkles size={17} /> Lancer la simulation
          </Button>
        </Card>
        <Card className="prediction-output">
          <CardHeader
            title="Résultat de la prédiction"
            subtitle="Aucune sanction ne peut être déclenchée automatiquement."
            action=""
          />
          {!ran ? (
            <div className="empty-output">
              <BrainCircuit size={40} />
              <Heading as="h3">En attente d’analyse</Heading>
              <Text>
                Sélectionnez un dataset et un modèle, puis lancez la simulation.
              </Text>
            </div>
          ) : (
            <>
              <div className="prediction-result large">
                <span className="prediction-icon">
                  <Sparkles size={25} />
                </span>
                <div>
                  <Text as="small">CLASSE PRÉDITE</Text>
                  <Heading as="h2">Qualité bonne</Heading>
                  <Text>Résultat fictif issu d’un scénario prédéfini.</Text>
                </div>
              </div>
              <div className="probability-list">
                <Probability label="Bonne" value={73} tone="blue" />
                <Probability label="Moyenne" value={20} tone="orange" />
                <Probability label="Mauvaise" value={7} tone="red" />
              </div>
              <div className="model-warning">
                <TriangleAlert size={17} />
                <Text as="small">
                  À vérifier avec les preuves disponibles avant tout constat ou
                  décision.
                </Text>
              </div>
            </>
          )}
        </Card>
      </div>
      <Card className="metrics-card">
        <CardHeader
          title="Métriques du modèle sélectionné"
          subtitle="Mesures de validation documentées — scénario de démonstration"
          action="Voir la fiche du modèle"
        />
        <div className="metric-row">
          {[
            ["Exactitude", "91,2 %"],
            ["F1-score macro", "0,89"],
            ["Jeu de validation", "4 800 lignes"],
            ["Version", "2.4"],
          ].map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

export function GenericAppPage({ title }: { title: string }) {
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <Text as="small" className="eyebrow">
            ESPACE PROFESSIONNEL
          </Text>
          <Heading as="h1">{title}</Heading>
          <Text>
            Module préparé pour l’intégration avec l’API Django REST Framework.
          </Text>
        </div>
        <Button>
          <Plus size={17} /> Nouvelle action
        </Button>
      </div>
      <DemoNotice />
      <Card className="placeholder-card">
        <Database size={38} />
        <Heading>Connexion backend requise</Heading>
        <Text>
          Les actions, données et permissions de ce module seront chargées
          depuis le serveur selon l’organisation et le rôle authentifiés.
        </Text>
        <Button variant="secondary">Actualiser les données</Button>
      </Card>
    </>
  )
}
