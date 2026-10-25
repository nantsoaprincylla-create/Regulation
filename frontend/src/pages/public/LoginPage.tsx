import { useState, type FormEvent } from "react"
import { Navigate, useLocation, useNavigate } from "react-router"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import { SPACE_PATH, useAuth } from "../../lib/auth-context"
import { describeError } from "../../lib/api"
import { Alert, Button, Card, Input } from "../../components/ui"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, login } = useAuth()
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (user) return <Navigate to={SPACE_PATH[user.space]} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const u = await login(email.trim(), password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from.startsWith(SPACE_PATH[u.space]) ? from : SPACE_PATH[u.space], { replace: true })
    } catch (err) {
      setError(describeError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-aside">
        <div className="brand">
          <span className="brand-mark">
            <ShieldCheck size={22} />
          </span>
          <span className="brand-copy">
            <strong>QoS Madagascar</strong>
            <small>Régulation des télécommunications</small>
          </span>
        </div>
        <div>
          <small style={{ letterSpacing: "0.14em", fontWeight: 700 }}>ESPACE SÉCURISÉ</small>
          <h1>Des données fiables pour une régulation éclairée.</h1>
          <p>Collecter, analyser et agir pour améliorer durablement la qualité des services de télécommunications.</p>
        </div>
        <small>Accès réservé aux organismes habilités · Les connexions sont journalisées</small>
      </div>
      <div className="login-main">
        <Card className="login-card">
          <h2>Connexion organisme</h2>
          <p className="muted">ARTEC, Yas, Airtel et Orange : accédez à votre espace professionnel.</p>
          <form onSubmit={submit} style={{ marginTop: 18 }}>
            <Input label="Adresse e-mail professionnelle" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="pw-wrap">
              <Input label="Mot de passe" type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button variant="ghost" size="sm" onClick={() => setShow((s) => !s)} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </Button>
            </div>
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" className="full" loading={loading}>
              Accéder à mon espace
            </Button>
          </form>
          <p className="muted" style={{ marginTop: 16, fontSize: "0.82rem" }}>
            Votre espace est déterminé par le serveur à partir de votre compte : aucun rôle n’est choisi sur cette page. Le public n’a pas de compte : il participe depuis le site ouvert.
          </p>
        </Card>
      </div>
    </div>
  )
}
