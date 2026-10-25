# Frontend — Plateforme de régulation des télécommunications

React 19 + TypeScript + Vite, React Router 7, Recharts. CSS maison (design system dans `src/index.css`), sans Tailwind.

## Démarrage
```bash
cp .env.example .env            # VITE_API_URL=http://localhost:8000/api/v1
npm install                     # régénère package-lock.json
npm run dev                     # http://localhost:5173
npm run build                   # tsc -b && vite build
npm run lint
```
Le backend doit tourner sur le port 8000 et l'origine du frontend doit figurer dans `CORS_ALLOWED_ORIGINS` (`.env` du backend).

## Principe
Aucune donnée fictive : chaque chiffre, tableau et graphique vient de l'API. Le rôle est toujours lu depuis `GET /auth/me/` ; les gardes d'interface (`RequireSpace`) n'enlèvent rien au contrôle serveur.

## Organisation
* `src/lib/` : `api.ts` (JWT, renouvellement, erreurs lisibles, téléchargement), `format.ts` (libellés français de tous les statuts), `useApi.ts`, session (`AuthProvider`, `RequireSpace`).
* `src/components/` : `ui.tsx` (boutons, champs, modale accessible, toasts…), `DataTable.tsx` (tableau paginé avec filtres et actions avec motif), `AppLayout.tsx`, `PublicLayout.tsx`.
* `src/pages/public/` : accueil, publications + commentaires, sondages (parcours en 4 étapes), qualité des services, réclamation et suivi par jeton, pages statiques, connexion.
* `src/pages/shared/` : tableaux de bord par rôle, sondages, publications, modération, datasets, soumissions, scraping, dossiers de régulation, réclamations/contestations, notifications, audit, paramètres.
* `src/pages/regulation/` : évaluation des opérateurs, prédictions et modèles Softmax, indicateurs QoS.
* `src/pages/admin/` : comptes utilisateurs.

## Espaces
| Rôle | Espace | Contenu |
|---|---|---|
| ARTEC Régulation | `/regulation` | évaluation des opérateurs, soumissions, datasets, prédictions/modèles, dossiers et décisions (avertissement, félicitation…), réclamations, QoS, scraping |
| Opérateur | `/operateur` | sondages, publications, commentaires, datasets et import, soumissions, scraping, dossiers (réponses), contestations |
| ARTEC Publications | `/publications-admin` | publications, sondages (validation des sondages d'opérateurs), modération |
| Administrateur | `/administration` | comptes |
| Public (sans compte) | `/` | sondages, publications, qualité, réclamations |
