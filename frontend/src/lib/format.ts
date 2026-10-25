/** Formatage et libellés français des valeurs renvoyées par l'API. */

export const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "—")
export const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"
export const fmtNumber = (n?: number | null, digits = 0) =>
  n === null || n === undefined ? "—" : n.toLocaleString("fr-FR", { maximumFractionDigits: digits })
export const fmtPct = (n?: number | null, digits = 1) => (n === null || n === undefined ? "—" : `${fmtNumber(n, digits)} %`)

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")
}

export type Tone = "blue" | "green" | "orange" | "red" | "gray" | "teal"

/** code API → [libellé, couleur] */
const DICT: Record<string, [string, Tone]> = {
  // classes de qualité
  GOOD: ["Bonne", "green"],
  MEDIUM: ["Moyenne", "orange"],
  POOR: ["Mauvaise", "red"],
  // soumissions
  SUBMITTED: ["Soumis", "blue"],
  UNDER_REVIEW: ["En examen", "blue"],
  CORRECTION_REQUIRED: ["Correction demandée", "orange"],
  ACCEPTED: ["Accepté", "green"],
  REJECTED: ["Rejeté", "red"],
  // rapports de validation
  VALID: ["Valide", "green"],
  VALID_WITH_WARNINGS: ["Valide avec avertissements", "orange"],
  INVALID: ["Invalide", "red"],
  // dossiers
  OPEN: ["Ouvert", "blue"],
  AWAITING_OPERATOR_RESPONSE: ["Réponse attendue", "orange"],
  UNDER_CORRECTION: ["En correction", "orange"],
  DECIDED: ["Décision rendue", "teal"],
  CLOSED: ["Clos", "gray"],
  QOS_ANOMALY: ["Anomalie de qualité", "gray"],
  DATA_QUALITY: ["Qualité des données", "gray"],
  COMPLAINT_FOLLOWUP: ["Suite à réclamation", "gray"],
  OTHER: ["Autre", "gray"],
  // décisions
  EXPLANATION_REQUEST: ["Demande d’explication", "blue"],
  RECOMMENDATION: ["Recommandation", "blue"],
  CORRECTION_REQUEST: ["Demande de correction", "orange"],
  WARNING: ["Avertissement", "red"],
  CONGRATULATIONS: ["Félicitation", "green"],
  NO_BREACH: ["Aucun manquement établi", "green"],
  CLOSURE: ["Clôture", "gray"],
  // actions correctives
  REQUESTED: ["Demandée", "orange"],
  IN_PROGRESS: ["En cours", "blue"],
  VERIFIED: ["Vérifiée", "green"],
  NOT_COMPLIED: ["Non réalisée", "red"],
  // réclamations
  NEW: ["Nouvelle", "blue"],
  IN_REVIEW: ["En traitement", "blue"],
  AWAITING_INFO: ["Informations attendues", "orange"],
  RESOLVED: ["Traitée", "green"],
  PUBLIC_COMPLAINT: ["Réclamation du public", "gray"],
  REPORT: ["Signalement", "gray"],
  OPERATOR_CONTESTATION: ["Contestation", "gray"],
  REVIEW_REQUEST: ["Demande de réexamen", "gray"],
  // sondages / publications / commentaires
  DRAFT: ["Brouillon", "gray"],
  PENDING_APPROVAL: ["En attente de validation", "orange"],
  PUBLISHED: ["Publié", "green"],
  ARCHIVED: ["Archivé", "gray"],
  SCHEDULED: ["Planifiée", "blue"],
  PENDING: ["En attente", "orange"],
  APPROVED: ["Approuvé", "green"],
  HIDDEN: ["Masqué", "gray"],
  PRESS_RELEASE: ["Communiqué", "gray"],
  INFORMATION: ["Information", "gray"],
  CONSULTATION: ["Consultation", "gray"],
  PUBLIC: ["Public", "gray"],
  INTERNAL: ["Interne", "gray"],
  // modèles / exécutions
  READY: ["Prêt", "green"],
  NOT_READY: ["Données insuffisantes", "orange"],
  LOW_QUALITY: ["Performances insuffisantes", "orange"],
  TRAINING: ["Entraînement", "blue"],
  FAILED: ["Échec", "red"],
  RETIRED: ["Retiré", "gray"],
  RUNNING: ["En cours", "blue"],
  COMPLETED: ["Terminée", "green"],
  // scraping
  ACTIVE: ["Active", "green"],
  PAUSED: ["En pause", "gray"],
  SUCCESS: ["Succès", "green"],
  BLOCKED: ["Bloquée", "red"],
  VALIDATED: ["Validée", "green"],
  // types de données / sources
  QOS_MEASUREMENT: ["Mesures QoS", "gray"],
  LABELED_TRAINING: ["Jeu étiqueté", "gray"],
  TECHNICAL: ["Mesure technique", "gray"],
  DECLARED: ["Déclaré", "gray"],
  SURVEY: ["Sondage", "gray"],
  SCRAPED: ["Web scraping", "gray"],
  // fréquence
  MANUAL: ["Manuelle", "gray"],
  HOURLY: ["Horaire", "gray"],
  DAILY: ["Quotidienne", "gray"],
  WEEKLY: ["Hebdomadaire", "gray"],
  // rôles
  OPERATOR_USER: ["Opérateur", "blue"],
  ARTEC_PUBLISHER: ["ARTEC Publications", "teal"],
  ARTEC_REGULATOR: ["ARTEC Régulation", "teal"],
  SYSTEM_ADMIN: ["Administrateur", "gray"],
}

export const label = (code?: string | null) => (code ? (DICT[code]?.[0] ?? code) : "—")
export const toneOf = (code?: string | null): Tone => (code ? (DICT[code]?.[1] ?? "gray") : "gray")

export const METRIC_LABELS: Record<string, string> = {
  download_speed: "Débit descendant",
  upload_speed: "Débit montant",
  latency: "Latence",
  jitter: "Gigue",
  packet_loss: "Perte de paquets",
  availability: "Disponibilité",
  call_success_rate: "Appels aboutis",
  drop_rate: "Appels coupés",
  satisfaction: "Satisfaction",
}
export const metricLabel = (m: string) => METRIC_LABELS[m] ?? m

export const QUESTION_TYPES: [string, string][] = [
  ["SATISFACTION", "Échelle de satisfaction (1 à 5)"],
  ["NUMBER", "Valeur numérique"],
  ["YES_NO", "Oui / non"],
  ["SINGLE_CHOICE", "Choix unique"],
  ["MULTIPLE_CHOICE", "Choix multiple"],
  ["SHORT_TEXT", "Texte court"],
  ["LONG_TEXT", "Commentaire libre"],
]

export const CLASS_COLORS = { GOOD: "#1f8a5b", MEDIUM: "#d98e04", POOR: "#c0392b" } as const
