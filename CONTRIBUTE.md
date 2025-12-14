# Déploiement sur github.com (Pour les devs)  

## Installation (MacOS)

- lancer le script **install_mkdocs_deps.sh**
- source .env/bin/activate

## Faire les modifications en md

- `mkdocs serve` pour tester en local
- `git commit -am "msg`" pour confirmer les modifications sur la `branche` `main`
- `git push` pour mettre a jour le repo github

## Déploiement du site statique

- `mkdocs build` pour verifier que tout va bien (corriger le cas échéant)
- `mkdocs build --verbose` pour avoir plus de logs
- `mkdocs gh-deploy --force` pour mettre à jour le site github pages

## Deploiement sur le site de preproduction (Pour les devs)

Depuis la branch preprod :
- git push 

# Contenus

## Ajouter un Album Google Photo en widget de type SlideShow

- Suivre les instructions sur [Public Album](https://www.publicalbum.org/blog/embedding-google-photos-albums)

## Ajouter une carte FallingFruit

## Ajouter une carte GoogleMap

## Ajouter une carte StreetView

## Ajouter une carte OpenStreetMap

Aller sur [Umap](http://umap.openstreetmap.fr/fr/map/verger-de-vitre_543437) et partager une carte !
- Bien faire pointer le centre de la carte 
- 500 px de haut

## Ajouter une actu dans la page d'accueil
- ajouter une image dans le repertoire img

## Developpement avec environment virtuel Python

update pip freeze > requirements.txt

python -m venv .env
source .env/bin/activate  # On macOS/Linux
pip install -r requirements.txt

## Liens 

Gestion du site :
- https://help.ovhcloud.com/

Site en production :
- https://www.tousauverger.fr

Site en preproduction :
- https://preprod.tousauverger.fr

Site en local :
- http://127.0.0.1:8000
 
Liste des evenements (lecture seule) :
- [Fichier excel publié en HTML](https://docs.google.com/spreadsheets/d/e/2PACX-1vQGs5jLZ5O8hINJqv9GoR-GG4P57ceLdZIyzBo8oMC7lHI0HYQEsHv0U1gYyatjciroHZ4Z2L-j7oKZ/pub?gid=0&single=true&output=html)
- [Fichier excel publié en CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vQGs5jLZ5O8hINJqv9GoR-GG4P57ceLdZIyzBo8oMC7lHI0HYQEsHv0U1gYyatjciroHZ4Z2L-j7oKZ/pub?gid=0&single=true&output=csv)

Liste des evenments (édition) :
- https://docs.google.com/spreadsheets/d/1oXOlIHnJ-YtRRvtpALcW66Up9oh56V_rtVji2F6gLcg/edit?gid=0#gid=0

Gestion du cache (pour verifier les mises à jour immediateness),
- ajouter "?nocache=1 pour supprimer le cache
  - http://127.0.0.1:8000/?nocache=1
  - https://www.tousauverger.fr/?nocache=1
  - https://preprod.tousauverger.fr/?nocache=1
