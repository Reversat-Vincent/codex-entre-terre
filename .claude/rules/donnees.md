---
paths:
  - "data/**"
  - "tools/**"
  - "scripts/**"
  - "docs/contenu/**"
---

# Règles sur les données du jeu

- `data/*.json` est la seule source des faits du jeu, extraite d'eldenring.wiki.gg (CC BY-SA 4.0). Structure et limites : `data/README.md`.
- Ces fichiers pèsent jusqu'à 2,4 Mo : interroge-les par script ou par Grep, ne les lis jamais en entier.
- `data/` ne change que sur décision du chef de projet, pour appliquer un correctif validé. Chaque modification est consignée dans `data/CHANGELOG.md` : fichier, entrée, champ, ancienne et nouvelle valeur, URL de la page wiki.
- `null` signifie « non documenté par le wiki » : jamais remplacé par 0, une chaîne vide ou une valeur supposée.
- Chaque entrée garde son `source` (`Base game`, `Shadow of the Erdtree`, `Tarnished Pack`, `Base game + Shadow of the Erdtree`) et son `url`.
- Les estimations restent dans leurs champs (`upgrade.estimate_if_undocumented`), avec leur confiance, et ne sont jamais présentées comme des faits.
- Les fichiers de données de l'application sont générés par script à la compilation, jamais édités à la main.

## Wiki
- API MediaWiki : `https://eldenring.wiki.gg/api.php`. Wikitext : `action=query&prop=revisions&rvprop=content&rvslots=main&formatversion=2&redirects=1`. Recherche de pages : `action=query&list=search&srsearch=<texte>`.
- 50 titres au plus par requête, au moins 1,5 s entre deux requêtes, User-Agent identifiable (celui de `tools/wiki/fetch_pages.py`).
- Téléchargements dans `.cache/wiki/`, hors du dépôt ; scripts Python lancés avec `python -I`.
- Pages « Nightreign: » exclues : elles concernent un autre jeu.
