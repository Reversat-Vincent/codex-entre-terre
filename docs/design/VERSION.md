# Copie du design

Copie de lecture des fichiers `project/` de deux artefacts claude.ai, faite le 01/11/2026. Les artefacts en ligne restent la référence visuelle.

| Dossier | Artefact | Version copiée |
|---|---|---|
| `docs/design/` | Codex de l'Entre-terre — prototype : https://claude.ai/artifact/5q5odBbwiwVvfb4LSWhiRM | `1793479576-f5e5` |
| `docs/design/ds/` | Design system du Codex : https://claude.ai/artifact/9Dj4PS2EkVjivTWHSqEQY7 | `1793448860-548b` |

## Ce que contient la copie
- Les écrans (`*.dc.html`) sont des prototypes au format de l'éditeur de design. Ils ne s'affichent pas hors de claude.ai, car son moteur (`support.js`) n'est pas copié. Ils servent de référence pour la structure, les classes, les textes et les comportements.
- Les notes de spécification de chaque écran sont dans `canvas.json`, clé `notes`.
- Les écrans font référence à `ds/codex/…`, la copie du design system rangée dans l'artefact du prototype. C'est la même version que `ds/`.
- Les écrans chargent leurs polices depuis Google Fonts. L'application, elle, les sert elle-même (`.claude/rules/code.md`).
- Non copiés : les fichiers de l'éditeur (`artifact-type/`, `SKILL.md`, `index.html`) et `project/ds/` du prototype, doublon du design system.

## Refaire la copie
Si un artefact change : lire ses fichiers `project/` avec l'outil Artifact (action `read`), les ranger ici (prototype dans `docs/design/`, design system dans `docs/design/ds/`), sans les fichiers listés ci-dessus, puis mettre à jour la date et les versions de ce fichier.
