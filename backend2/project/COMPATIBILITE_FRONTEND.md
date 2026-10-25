# Compatibilité frontend React / backend Django

Référence : `frontend.zip` et `project(3).zip` fournis par l’utilisateur.

## Ajustements réalisés
- Champ calculé `is_open` ajouté à la représentation complète des sondages, sans modifier le modèle ni les règles métier.
- Routes publiques existantes préservées : liste/détail des sondages, jeton de participation, réponses, publications et commentaires.
- Tests de résolution des routes publiques ajoutés.
- Configuration et applications Django d’origine conservées.

## Vérifications nécessaires
- `python manage.py check` et `pytest` avec les dépendances installées et la base de données configurée.
- Tester la connexion, les permissions par rôle, les formulaires et les réponses API avec des données réelles.
- Vérifier que l’URL VITE_API_URL du frontend correspond au serveur et que CORS autorise son origine.

Ce correctif est ciblé : il ne constitue pas une validation complète de tous les écrans du frontend.
