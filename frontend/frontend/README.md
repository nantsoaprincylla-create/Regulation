# Frontend TeleReg

Interface React + TypeScript séparée du backend Django existant.

## Démarrer

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Démarrer séparément Django sur `http://localhost:8000`. Ajouter `http://localhost:5173` aux `CORS_ALLOWED_ORIGINS` de la configuration backend **sans modifier son code**.

La connexion utilise les endpoints JWT réels du backend (`auth/login/`, `auth/refresh/`, `auth/me/`, `auth/logout/`). Les modules sont visibles selon les rôles déclarés par Django. Les pages listent les données renvoyées par l’API ; aucune statistique fictive n’est affichée.

**Périmètre actuel :** authentification, navigation par rôle, tableau de bord, listes paginées, recherche locale, consultation détaillée, changement de mot de passe. Les formulaires métier et workflows de validation spécifiques nécessitent des écrans supplémentaires.
