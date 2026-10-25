# Regulation — Plateforme de régulation des télécommunications

Application web qui collecte des données (sondages publics, datasets des opérateurs, web scraping)
pour évaluer la qualité de service des opérateurs Yas, Airtel et Orange et assister l'ARTEC
dans sa régulation du marché.

## Acteurs
- **ARTEC** : régule le marché, évalue les offres (bonne, moyenne, mauvaise), émet avertissements et félicitations.
- **Opérateurs (Yas, Airtel, Orange)** : collectent leurs données, les soumettent à l'ARTEC, publient des sondages et peuvent contester une décision.
- **Public** : répond aux sondages, commente les publications et dépose des réclamations, sans compte.

## Technologies
- Frontend : React, TypeScript, Vite
- Backend : Django, Django REST Framework
- Base de données : PostgreSQL
- Prédiction : classification multiclasse par régression logistique Softmax

## Lancer le projet

### Backend (dossier `backend2/project`)
```
pip install -r requirements.txt
```
Copier `.env.example` vers `.env`, puis renseigner la connexion à PostgreSQL.
```
python manage.py migrate
python manage.py setup_platform
python manage.py runserver
```

### Frontend (dossier `frontend`)
```
npm install
npm run dev
```
Copier `.env.example` vers `.env` avant de lancer. Le site s'ouvre sur http://localhost:5173.

## Auteur
Nantsoa — projet académique.
