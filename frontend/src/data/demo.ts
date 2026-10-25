export const qosTrend = [
  { month: "Jan", bonne: 62, moyenne: 27, mauvaise: 11 },
  { month: "Fév", bonne: 65, moyenne: 25, mauvaise: 10 },
  { month: "Mar", bonne: 68, moyenne: 23, mauvaise: 9 },
  { month: "Avr", bonne: 66, moyenne: 25, mauvaise: 9 },
  { month: "Mai", bonne: 71, moyenne: 21, mauvaise: 8 },
  { month: "Juin", bonne: 73, moyenne: 20, mauvaise: 7 },
]

export const operatorComparison = [
  { name: "YAS", voix: 78, data: 71, sms: 88 },
  { name: "AIRTEL", voix: 73, data: 69, sms: 84 },
  { name: "ORANGE", voix: 81, data: 76, sms: 87 },
]

export const publicIndicators = [
  {
    value: "12",
    label: "rapports publics",
    detail: "validés pour publication",
  },
  { value: "6", label: "sondages ouverts", detail: "accessibles sans compte" },
  {
    value: "8 420",
    label: "réponses agrégées",
    detail: "échantillon de démonstration",
  },
  {
    value: "18",
    label: "régions couvertes",
    detail: "dans les données publiées",
  },
]

export const surveys = [
  {
    title: "Qualité de l’internet mobile",
    organization: "ARTEC",
    target: "Tous les opérateurs",
    date: "30 juin 2025",
    time: "4 min",
    responses: "2 481",
    status: "Ouvert",
  },
  {
    title: "Expérience des appels vocaux",
    organization: "ARTEC",
    target: "Tous les opérateurs",
    date: "18 juillet 2025",
    time: "3 min",
    responses: "1 207",
    status: "Ouvert",
  },
  {
    title: "Disponibilité des services 4G",
    organization: "YAS",
    target: "YAS",
    date: "24 juillet 2025",
    time: "5 min",
    responses: "684",
    status: "Ouvert",
  },
]

export const submissions = [
  {
    id: "DS-2025-084",
    operator: "ORANGE",
    type: "Mesures data 4G",
    date: "18 juin 2025",
    status: "En examen",
  },
  {
    id: "DS-2025-083",
    operator: "YAS",
    type: "Disponibilité réseau",
    date: "17 juin 2025",
    status: "Correction demandée",
  },
  {
    id: "DS-2025-082",
    operator: "AIRTEL",
    type: "Qualité voix",
    date: "16 juin 2025",
    status: "En examen",
  },
  {
    id: "DS-2025-079",
    operator: "ORANGE",
    type: "Mesures SMS",
    date: "12 juin 2025",
    status: "Accepté",
  },
]

export const regions: Record<string, string[]> = {
  Analamanga: ["Antananarivo", "Ambohidratrimo", "Ankazobe"],
  Vakinankaratra: ["Antsirabe", "Betafo", "Ambatolampy"],
  Atsinanana: ["Toamasina", "Brickaville", "Vatomandry"],
  Boeny: ["Mahajanga", "Marovoay", "Ambato-Boeny"],
}
