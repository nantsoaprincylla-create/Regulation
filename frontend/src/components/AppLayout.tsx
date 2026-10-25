import { useEffect, useState, type ComponentType } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router"
import {
  Bell,
  BookOpen,
  Database,
  FileText,
  Gauge,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ScanSearch,
  Settings,
  ShieldCheck,
  Sparkles,
  Gavel,
  Scale,
  Users,
  Cpu,
  X,
  ClipboardList,
  Newspaper,
  Megaphone,
} from "lucide-react"
import { api } from "../lib/api"
import { label } from "../lib/format"
import { useAuth, type Space } from "../lib/auth-context"
import { Button } from "./ui"

type Icon = ComponentType<{ size?: number }>
type Item = { to: string; label: string; icon: Icon; end?: boolean }

const BASE: Record<Space, string> = {
  regulation: "/regulation",
  operator: "/operateur",
  publications: "/publications-admin",
  admin: "/administration",
}

const NAV: Record<Space, { title: string; items: Item[] }[]> = {
  regulation: [
    {
      title: "PILOTAGE",
      items: [
        { to: "", label: "Vue d’ensemble", icon: LayoutDashboard, end: true },
        { to: "/operateurs", label: "Évaluation des opérateurs", icon: Scale },
        { to: "/indicateurs", label: "Indicateurs QoS", icon: Gauge },
      ],
    },
    {
      title: "DONNÉES",
      items: [
        { to: "/soumissions", label: "Soumissions reçues", icon: ClipboardList },
        { to: "/datasets", label: "Datasets ARTEC", icon: Database },
        { to: "/scraping", label: "Web scraping", icon: ScanSearch },
      ],
    },
    {
      title: "PRÉDICTION",
      items: [
        { to: "/predictions", label: "Prédictions", icon: Sparkles },
        { to: "/modeles", label: "Modèles Softmax", icon: Cpu },
      ],
    },
    {
      title: "RÉGULATION",
      items: [
        { to: "/dossiers", label: "Dossiers et décisions", icon: Gavel },
        { to: "/reclamations", label: "Réclamations", icon: MessagesSquare },
      ],
    },
  ],
  operator: [
    {
      title: "ACTIVITÉ",
      items: [
        { to: "", label: "Vue d’ensemble", icon: LayoutDashboard, end: true },
        { to: "/sondages", label: "Sondages", icon: BookOpen },
        { to: "/publications", label: "Publications", icon: Newspaper },
        { to: "/commentaires", label: "Commentaires", icon: MessageSquare },
      ],
    },
    {
      title: "DONNÉES",
      items: [
        { to: "/datasets", label: "Datasets et import", icon: Database },
        { to: "/soumissions", label: "Soumissions à l’ARTEC", icon: ClipboardList },
        { to: "/scraping", label: "Web scraping", icon: ScanSearch },
      ],
    },
    {
      title: "ÉCHANGES AVEC L’ARTEC",
      items: [
        { to: "/dossiers", label: "Dossiers et demandes", icon: Gavel },
        { to: "/reclamations", label: "Contestations", icon: MessagesSquare },
      ],
    },
  ],
  publications: [
    {
      title: "ÉDITORIAL",
      items: [
        { to: "", label: "Vue d’ensemble", icon: LayoutDashboard, end: true },
        { to: "/contenus", label: "Publications", icon: FileText },
        { to: "/sondages", label: "Sondages", icon: Megaphone },
        { to: "/commentaires", label: "Modération", icon: MessageSquare },
      ],
    },
  ],
  admin: [
    {
      title: "ADMINISTRATION",
      items: [{ to: "", label: "Comptes utilisateurs", icon: Users, end: true }],
    },
  ],
}

const TITLE: Record<Space, string> = {
  regulation: "ARTEC · Régulation",
  operator: "Espace opérateur",
  publications: "ARTEC · Publications",
  admin: "Administration",
}

export default function AppLayout({ space }: { space: Space }) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [unread, setUnread] = useState(0)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const base = BASE[space]

  useEffect(() => {
    let alive = true
    const load = () =>
      api<{ count: number }>("/notifications/unread-count/")
        .then((d) => alive && setUnread(d.count))
        .catch(() => undefined)
    load()
    const t = window.setInterval(load, 60_000)
    const onChange = () => load()
    window.addEventListener("notifications:changed", onChange)
    return () => {
      alive = false
      window.clearInterval(t)
      window.removeEventListener("notifications:changed", onChange)
    }
  }, [])

  const fullName = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : ""
  const initials = (fullName.match(/\b\p{L}/gu) ?? ["?"]).slice(0, 2).join("").toUpperCase()
  const orgName = user?.organization?.name ?? TITLE[space]

  const doLogout = async () => {
    await logout()
    navigate("/connexion", { replace: true })
  }

  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Navigation de l’espace">
        <div className="sidebar-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link to="/" className="brand" aria-label="Retour au site public">
            <span className="brand-mark">
              <ShieldCheck size={22} />
            </span>
            <span className="brand-copy">
              <strong>QoS Madagascar</strong>
              <small>{TITLE[space]}</small>
            </span>
          </Link>
          <Button variant="ghost" className="mobile-only" style={{ color: "#fff" }} onClick={() => setOpen(false)} aria-label="Fermer le menu">
            <X size={20} />
          </Button>
        </div>
        <div className="who">
          <strong>{orgName}</strong>
          <small>{user ? label(user.role) : ""}</small>
        </div>
        <nav className="side-nav">
          {NAV[space].map((group) => (
            <div key={group.title}>
              <div className="nav-title">{group.title}</div>
              {group.items.map(({ to, label: text, icon: I, end }) => (
                <NavLink key={to} to={base + to} end={end} onClick={() => setOpen(false)} title={text}>
                  <I size={19} />
                  <span>{text}</span>
                </NavLink>
              ))}
            </div>
          ))}
          {space !== "admin" && (
            <div>
              <div className="nav-title">COMPTE</div>
              <NavLink to={`${base}/notifications`} onClick={() => setOpen(false)} title="Notifications">
                <Bell size={19} />
                <span>Notifications</span>
                {unread > 0 && <b className="count">{unread}</b>}
              </NavLink>
              <NavLink to={`${base}/historique`} onClick={() => setOpen(false)} title="Journal d’audit">
                <History size={19} />
                <span>Journal d’audit</span>
              </NavLink>
            </div>
          )}
          <div>
            {space === "admin" && <div className="nav-title">COMPTE</div>}
            <NavLink to={`${base}/parametres`} onClick={() => setOpen(false)} title="Paramètres">
              <Settings size={19} />
              <span>Paramètres</span>
            </NavLink>
            {space === "admin" && (
              <NavLink to={`${base}/historique`} onClick={() => setOpen(false)} title="Journal d’audit">
                <History size={19} />
                <span>Journal d’audit</span>
              </NavLink>
            )}
          </div>
        </nav>
        <div className="side-foot">
          <button type="button" onClick={doLogout} title="Déconnexion">
            <LogOut size={19} />
            <span>Déconnexion</span>
          </button>
          <button type="button" className="desktop-only" onClick={() => setCollapsed((c) => !c)} title="Réduire le menu">
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            <span>Réduire le menu</span>
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <Button variant="ghost" className="mobile-only" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
              <Menu size={21} />
            </Button>
            <div>
              <small>{TITLE[space]}</small>
              <strong>{orgName}</strong>
            </div>
          </div>
          <div className="topbar-right">
            {space !== "admin" && (
              <Link to={`${base}/notifications`} className="icon-btn" aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}>
                <Bell size={19} />
                {unread > 0 && <span className="dot">{unread > 99 ? "99+" : unread}</span>}
              </Link>
            )}
            <div className="profile">
              <span className="avatar" aria-hidden>
                {initials}
              </span>
              <span>
                <strong>{fullName}</strong>
                <small>{user?.email}</small>
              </span>
            </div>
          </div>
        </header>
        <main className="content" id="contenu">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
