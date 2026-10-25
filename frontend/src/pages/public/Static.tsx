import { Link } from "react-router"
import { ButtonLink } from "../../components/ui"

function Doc({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container narrow section" style={{ paddingTop: 40 }}>
      <h1>{title}</h1>
      <div className="prose">{children}</div>
    </div>
  )
}

export function AboutPage() {
  return (
    <Doc title="À propos">
      <p>
        Cette plateforme aide l’ARTEC à réguler le marché des télécommunications en s’appuyant sur des données : sondages publics, datasets soumis par les opérateurs,
        mesures de qualité de service et collecte contrôlée sur le web.
      </p>
      <h2>Les acteurs</h2>
      <p>
        <strong>L’ARTEC</strong> évalue la qualité des offres (bonne, moyenne, mauvaise), adresse avertissements et félicitations, et publie rapports et sondages.{" "}
        <strong>Yas, Airtel et Orange</strong> collectent leurs données, les soumettent à l’ARTEC, publient leurs sondages (après validation) et peuvent contester une décision.{" "}
        <strong>Le public</strong> répond aux sondages, commente les publications et dépose des réclamations, sans compte.
      </p>
      <h2>Comment sont utilisées les prédictions ?</h2>
      <p>
        L’ARTEC utilise un modèle de classification multiclasse (régression logistique Softmax) qui estime une probabilité pour chaque classe de qualité. Le résultat est une aide à la
        décision : il ne constitue jamais, à lui seul, un constat de manquement ni une sanction. Toute décision est prise et justifiée par une personne habilitée.
      </p>
      <ButtonLink to="/qualite">Consulter les indicateurs</ButtonLink>
    </Doc>
  )
}

export function PrivacyPage() {
  return (
    <Doc title="Confidentialité">
      <p>Les sondages sont anonymes : nous ne demandons ni nom, ni téléphone, ni adresse exacte, ni position GPS.</p>
      <ul>
        <li>La localisation se limite à la région et à la ville.</li>
        <li>L’adresse IP n’est pas conservée avec vos réponses ; une protection anti-doublon utilise un jeton de participation.</li>
        <li>Les résultats ne sont publiés que de façon agrégée, et masqués lorsque l’échantillon est trop faible.</li>
        <li>Les commentaires sont modérés avant publication. N’y indiquez pas de données personnelles.</li>
        <li>Les réclamations sont suivies avec un jeton secret que vous seul détenez.</li>
      </ul>
      <p>
        Questions ? Utilisez la page <Link to="/reclamation">Réclamation</Link>.
      </p>
    </Doc>
  )
}

export function AccessibilityPage() {
  return (
    <Doc title="Accessibilité">
      <p>
        Le site est conçu pour être utilisable au clavier et avec un lecteur d’écran, avec des contrastes suffisants, des champs étiquetés et une mise en page adaptée aux téléphones.
        Si vous rencontrez un obstacle, signalez-le via la page <Link to="/reclamation">Réclamation</Link>.
      </p>
    </Doc>
  )
}

export function NotFoundPage() {
  return (
    <Doc title="Page introuvable">
      <p>La page demandée n’existe pas ou a été déplacée.</p>
      <ButtonLink to="/">Retour à l’accueil</ButtonLink>
    </Doc>
  )
}
