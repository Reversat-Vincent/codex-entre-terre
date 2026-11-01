# Codex de l'Entre-terre

Application web compagnon d'*Elden Ring*. **État : en cours de développement, rien n'est encore publié.**

Un tableau de bord recalcule ses recommandations selon des critères configurables : armes à obtenir à chaque étape de la partie, origine optimale, ordre des boss de l'histoire principale avec le niveau recommandé. Un explorateur donne accès à toutes les données du jeu extraites du wiki eldenring.wiki.gg, contenus des DLC compris et étiquetés.

- **Site** : https://reversat-vincent.github.io/codex-entre-terre/, une fois publié.
- **Langues** : interface en français, données en anglais, comme sur le wiki.
- **Fonctionnement** : tout se passe dans le navigateur, sans compte ni serveur. Les réglages y restent et s'exportent dans un fichier, qui peut être réimporté. Le site fonctionne hors ligne après une première visite.

Outil de fan non officiel. *Elden Ring* est une marque de FromSoftware et Bandai Namco ; ce projet n'est pas affilié à ces sociétés.

## Contenu du dépôt

| Emplacement | Contenu |
|---|---|
| `data/` | Les 18 fichiers JSON du jeu et leur documentation (`data/README.md`) |
| `docs/cahier_des_charges.md` | Périmètre, exigences, critères d'acceptation et décisions |
| `docs/design/` | Copie du design : écrans, notes de spécification et design system (`ds/`) |
| `docs/brief/design_prompt.md` | Brief qui a servi à produire le design |
| `tools/wiki/` | Scripts Python d'extraction du wiki |
| `CLAUDE.md`, `.claude/` | Instructions du chef de projet, sous-agents, règles et permissions de Claude Code |
| `lancer-dev.cmd` | Lance la session de développement |

## Licences

- **Code** : aucune licence. Il reste soumis au droit d'auteur : on peut le consulter, pas le réutiliser sans autorisation.
- **Données** (`data/` et les fichiers qui en dérivent) : elles proviennent d'Eldenpedia (eldenring.wiki.gg) et restent sous licence [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0). Toute rediffusion crédite les contributeurs d'eldenring.wiki.gg et garde la même licence.
