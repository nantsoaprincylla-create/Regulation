import { useState } from "react"
import { Link, NavLink, Outlet } from "react-router"
import { Building2, ChevronRight, Menu, ShieldCheck, X } from "lucide-react"
import { Button, ButtonLink } from "./ui"

const LINKS: [string, string][] = [
  ["Accueil", "/"],
  ["Publications", "/publications"],
  ["Sondages", "/sondages"],
  ["Qualité des services", "/qualite"],
  ["Réclamation", "/reclamation"],
  ["À propos", "/a-propos"],
]

function Brand({ light }: { light?: boolean }) {
  return (
    <Link to="/" className="brand" aria-label="QoS Madagascar — accueil">
      <span className="brand-mark">
        <ShieldCheck size={22} />
      </span>
      <span className="brand-copy">
        <strong style={light ? { color: "#fff" } : undefined}>QoS Madagascar</strong>
        <small>Régulation des télécommunications</small>
      </span>
    </Link>
  )
}

export default function PublicLayout() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <a href="#principal" className="sr-only">
        Aller au contenu
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Brand />
          <nav className={`public-nav ${open ? "open" : ""}`} aria-label="Navigation principale">
            {LINKS.map(([text, to]) => (
              <NavLink key={to} to={to} end={to === "/"} onClick={() => setOpen(false)}>
                {text}
              </NavLink>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ButtonLink to="/connexion" variant="secondary">
              <Building2 size={16} /> Espace organismes
            </ButtonLink>
            <Button variant="ghost" className="menu-toggle" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
              {open ? <X size={21} /> : <Menu size={21} />}
            </Button>
          </div>
        </div>
      </header>
      <main id="principal">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <Brand light />
            <p style={{ marginTop: 12 }}>Un espace numérique au service de la transparence et de la qualité des services de télécommunications.</p>
          </div>
          <div>
            <div className="t">Accès rapide</div>
            <Link to="/publications">Publications</Link>
            <Link to="/sondages">Sondages publics</Link>
            <Link to="/qualite">Qualité des services</Link>
          </div>
          <div>
            <div className="t">Informations</div>
            <Link to="/a-propos">À propos</Link>
            <Link to="/confidentialite">Confidentialité</Link>
            <Link to="/accessibilite">Accessibilité</Link>
          </div>
          <div>
            <div className="t">Participation publique</div>
            <p>Aucun compte n’est requis pour répondre aux sondages ouverts ni pour déposer une réclamation.</p>
            <Link to="/sondages">
              Voir les sondages <ChevronRight size={14} style={{ verticalAlign: "middle" }} />
            </Link>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} QoS Madagascar — Plateforme de régulation</span>
          <span>Aucune donnée personnelle directe n’est collectée dans les sondages.</span>
        </div>
      </footer>
    </>
  )
}
