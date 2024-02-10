# Déploiement sur github.com (Pour les devs)  

## Installation (MacOS)

- lancer le script **install_mkdocs_deps.sh**

## Faire les modifications en md

- `mkdocs serve` pour tester en local
- `git commit -am "msg`" pour confirmer les modifications sur la `branche` `main`
- `git push` pour mettre a jour le repo github

## Déploiement du site statique

- `mkdocs build` pour verifier que tout va bien (corriger le cas échéant)
- `mkdocs build --verbose` pour avoir plus de logs
- `mkdocs gh-deploy --force` pour mettre a jour le site github pages

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
