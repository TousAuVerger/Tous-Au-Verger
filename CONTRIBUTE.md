# Déploiment sur github.com (Pour les devs)  

## Faire les modification en md

- `mkdocs serve` pour tester en local
- `git commit -am "msg`" pour confirmer les modifications sur la `branche` `main`
- `git push` pour mettre a jour le repo github

## Déploiement du site statique

- `mkdocs build` pour verifier que tout va bien (corriger le cas echéant)
- `mkdocs build --verbose` pour avoir plus de logs
- `mkdocs gh-deploy --force` pour mettre a jour le site github pages
`
