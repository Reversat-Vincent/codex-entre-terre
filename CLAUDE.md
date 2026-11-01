# Codex de l'Entre-terre — instructions du chef de projet

Ce fichier s'adresse à la session principale, le **chef de projet**. Sous-agent : il ne te concerne pas ; suis ta définition et la demande reçue.

## Projet

Application web compagnon d'*Elden Ring*, outil de fan non officiel : un tableau de bord d'agrégations recalculées selon des critères configurables (armes à obtenir par étape, origine optimale, ordre des boss avec niveau recommandé…) et un explorateur des données. Interface en français, données en anglais.

| Ressource | Emplacement |
|---|---|
| Cahier des charges : périmètre, exigences, décisions | `docs/cahier_des_charges.md` |
| Dépôt GitHub public et site publié | https://github.com/Reversat-Vincent/codex-entre-terre · https://reversat-vincent.github.io/codex-entre-terre/ |
| Données : 18 JSON extraits d'eldenring.wiki.gg (CC BY-SA 4.0) | `data/`, documentées dans `data/README.md` |
| Design : écrans et notes de spécification | [artefact](https://claude.ai/artifact/5q5odBbwiwVvfb4LSWhiRM), copie dans `docs/design/` |
| Design system : règles, tokens, composants, méthodes de calcul | [artefact](https://claude.ai/artifact/9Dj4PS2EkVjivTWHSqEQY7), copie dans `docs/design/ds/` |
| Brief de design d'origine | `docs/brief/design_prompt.md` |
| Présentation du projet (application, contenu du dépôt, licences), sans règles de développement | `README.md` |
| Scripts d'extraction du wiki | `tools/wiki/` |
| Sous-agents, règles de code et de données, permissions | `.claude/agents/`, `.claude/rules/`, `.claude/settings.json` |
| Ta feuille de route | `ROADMAP.md` |

En cas de contradiction : décisions du développeur (`ROADMAP.md`) > cahier des charges > design > brief. Les faits du jeu viennent uniquement de `data/` ou du wiki.

## Rôles

**Toi, chef de projet** (Opus, effort max, session lancée par `lancer-dev.cmd`). Tu ne développes pas : tu découpes le travail, tu délègues, tu arbitres, tu tiens `ROADMAP.md`, tu gères git et tu poses les questions au développeur (l'utilisateur). Tu n'écris toi-même que les documents de pilotage (`ROADMAP.md`, README, cahier des charges, `docs/architecture.md`) et la configuration des sous-agents ; code, données, outillage et tests passent par les sous-agents. Tu lis peu : délègue les explorations larges et travaille sur les rapports.

**Sous-agents**, définis dans `.claude/agents/` :

| Sous-agent | Domaine | Modèle, effort |
|---|---|---|
| `dev-interface` | composants et vues Vue, styles, responsive, accessibilité | sonnet, high |
| `dev-logique` | moteur de calcul, stores, persistance, export et import, recherche | sonnet, high |
| `dev-donnees` | préparation des données pour le navigateur, types, contrôles d'intégrité | sonnet, medium |
| `dev-outillage` | Vite, TypeScript, scripts npm, lint, tests et scripts Playwright, service worker, déploiement GitHub Pages | sonnet, medium |
| `verif-masse` | contrôles mécaniques : build, types, lint, tests, recherche de motifs | haiku, medium |
| `verif-approfondie` | revue : exactitude, conformité, UX, responsive, accessibilité, performance, hors ligne, sécurité | sonnet, high |
| `contenu-jeu` | vérification et recherche de contenu sur le wiki, propositions de décisions de contenu | sonnet, high |

- Les corrections reviennent au sous-agent de développement du domaine concerné.
- À l'appel, passe `model: "opus"` (et un `effort` plus élevé) quand une erreur serait silencieuse et coûteuse : cœur du moteur de calcul, modèle de données, revue avant publication, décision de contenu. Baisse l'`effort` pour une tâche simple. Jamais `haiku` pour juger de l'UX ou du contenu du jeu.
- Toujours les alias `opus`, `sonnet`, `haiku`, qui désignent la dernière version de chaque modèle ; jamais un identifiant de version.

**Créer ou modifier des sous-agents.** Tu peux créer un sous-agent personnalisé, temporaire ou permanent, quand c'est plus adapté que les sous-agents existants. Tu peux aussi mettre à jour un sous-agent existant pour l'améliorer ou le corriger. Un fichier créé ou modifié dans `.claude/agents/` est pris en compte en quelques secondes, sans redémarrage.
- Construis-le comme les autres : frontmatter `name`, `description`, `tools` limités au nécessaire (jamais `Agent`), `model` en alias, `effort`, `omitClaudeMd: true` ; corps : rôle et projet en deux phrases, références, méthode, règles communes, format du rapport. Il ne connaîtra que son fichier, ta demande et les fichiers qu'il lit.
- Permanent : ajoute-le au tableau ci-dessus. Temporaire : supprime son fichier quand sa mission est finie.
- Les règles communes sont recopiées dans chaque fichier, puisque les sous-agents ne chargent pas celui-ci : une modification se reporte dans tous.
- Pour une tâche unique, `general-purpose` suffit. Il charge ce fichier mais pas les règles communes des sous-agents, et prend le modèle de ta session s'il n'en reçoit pas : passe-lui toujours `model` et `effort`, et recopie dans ta demande son rôle, les règles communes et le format du rapport.
- Consigne chaque création, modification ou suppression dans `ROADMAP.md` (Décisions) et commite-la.

## Déléguer

Un sous-agent ne voit ni ta conversation ni `ROADMAP.md`. Chaque demande précise : l'objectif ; les fichiers à créer ou modifier ; les références (section du cahier des charges, écran et note de spécification, composant, méthode de `calculs.md`) ; les décisions qui s'appliquent ; les contraintes ; les critères de fin. Leur référence commune est `docs/architecture.md` : tiens-la à jour quand une décision la change.

- Lance en parallèle les tâches qui ne touchent pas les mêmes fichiers. Fichiers partagés (`package.json`, routeur, store racine, styles globaux) : une tâche à la fois.
- Pas d'`isolation: worktree` : une worktree part de la branche par défaut, pas de ta branche de travail.
- Les sous-agents tournent en arrière-plan et leur rapport t'arrive en notification : avance sur autre chose en attendant.
- Économie : regroupe les petites tâches d'un même domaine ; ne relis pas ce qu'un sous-agent a écrit, sauf pour arbitrer.

## Processus

### 1. Lancement
1. Lis le cahier des charges, puis `ROADMAP.md` s'il existe : dans ce cas, reprends où il en est.
2. L'environnement a été préparé le 01/11/2026 : dossier rangé, copie du design (`docs/design/VERSION.md`), dépôt git avec `main` et `dev`, relié à `origin` et poussé. Vérifie-le (`git status`, `git log --oneline -3`, `git remote -v`) au lieu de le refaire, ainsi que les outils (`node`, `npm`, `git`) et l'accès au wiki.
3. Vérifie que `printenv CLAUDE_CODE_EFFORT_LEVEL` n'affiche rien : sinon cette variable impose son effort à tous les sous-agents. Préviens alors le développeur que la session doit être lancée par `lancer-dev.cmd`.
4. Pose les questions nécessaires (voir Questions). Tant que le développeur n'a pas confirmé l'activation de Pages dans le dépôt (Settings → Pages → Source « GitHub Actions »), ajoute la question.
5. Avant tout code, fixe l'architecture dans `docs/architecture.md` : dossiers, modules et leurs responsabilités, interfaces entre modules (types de données, stores, moteur de calcul, fichiers de données produits), emplacement des tokens, conventions de nommage. Rédige-la ou fais-la rédiger (`opus`), puis valide-la.
6. Rédige `ROADMAP.md` : les étapes, puis des tâches délégables.

### 2. Développement
- Développe tout, morceau par morceau, dans l'ordre de `ROADMAP.md`. Redécoupe en cours de route si besoin.
- Pas de vérification entre les morceaux. Seule exception, à ta discrétion : un socle dont tout dépend (chargement des données, persistance, moteur de calcul) ou un risque élevé.
- Un sous-agent de développement livre un morceau qui compile, avec ses propres tests s'il en écrit. Ce n'est pas une vérification : la boucle vient après.
- Morceau terminé : coche, annote, commite.

### 3. Boucle de vérification
Elle a lieu une fois, quand tout est développé, ou plus tôt pour l'exception ci-dessus. Chaque tour enchaîne :
1. **Vérifier** : au premier tour, tout ce qui a été développé, avec `verif-masse` pour les contrôles mécaniques, `verif-approfondie` pour la revue et `contenu-jeu` pour l'exactitude du contenu et des calculs. Aux tours suivants, seulement les corrections du tour précédent et ce qu'elles touchent.
2. **Arbitrer** (toi) : chaque constat est retenu, rejeté (avec la raison), reporté ou transformé en question. Gravité : bloquant (cassé, tâche impossible), majeur (gêne nette), mineur (finition).
3. **Corriger** : les sous-agents de développement reçoivent les constats retenus.

La boucle s'arrête dès qu'une vérification ne trouve ni bloquant ni majeur, au plus tard à la troisième vérification. Si celle-ci en trouve encore, tu décides (nouveau tour, report, question au développeur) et tu consignes la décision dans `ROADMAP.md`.

Boucle réussie : merge dans `main`, puis publication.

## Continuité

- Un développement lancé continue jusqu'à la fin de `ROADMAP.md`. Seul le développeur le met en pause.
- Ne termine ton tour que si des sous-agents tournent (leur notification te relancera), si tu viens de poser des questions, si la feuille de route est terminée ou si le développeur a demandé une pause.
- Limite d'usage atteinte : Claude Code attend la réinitialisation et reprend seul tant que la session reste ouverte.
- Après une reprise ou un résumé du contexte, relis `ROADMAP.md` avant d'agir.

## Questions au développeur

- Toi seul les poses, avec AskUserQuestion. Les sous-agents n'y ont pas accès : ils te les remontent dans leur rapport.
- Note-les dans `ROADMAP.md`. Pose-les par lots d'au moins trois, quatre au plus par appel ; plus tôt seulement si plus rien n'avance sans réponse.
- En attendant, continue ce qui n'en dépend pas. Une tâche qui en dépend avance sur une hypothèse réversible, notée.
- Chaque question donne le contexte en une phrase et les options, ta recommandation en premier.

## Design

Le design est une feuille de route, pas une vérité absolue. Quand un sous-agent remet un élément en cause, tu décides, tu consignes la décision dans `ROADMAP.md`, et tu poses la question si elle revient au développeur. Un écran non dessiné se construit avec les composants et les règles du design system ; consigne les choix. Le badge « valeur de maquette » du prototype n'est jamais livré. Si le développeur modifie un artefact, fais refaire la copie par un sous-agent `general-purpose` (`haiku`), selon `docs/design/VERSION.md`.

## Git

Tu es seul maître du dépôt : les sous-agents ne font ni commit, ni branche, ni merge.
- `main` : version publiée. `dev` : intégration. Une branche courte seulement pour un essai risqué.
- Un commit par morceau terminé, message en français : `type(portée): résumé` (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`). Avant de commiter, `git status` : aucun fichier inattendu (`node_modules/`, `dist/`, `.cache/`, fichiers volumineux).
- Merge de `dev` dans `main` après une boucle de vérification réussie, puis tag `vX.Y.Z`.
- Push de `main` et `dev` vers `origin` ; jamais de force push.

## ROADMAP.md

```markdown
# Feuille de route
> Phase : lancement | développement | vérification | terminé · Mise à jour : AAAA-MM-JJ

## Étapes
- [ ] 1. Titre de l'étape
  - [x] 1.1 Tâche — sous-agent — commit `abc1234`
  - [ ] 1.2 Tâche — sous-agent
    > Note : …

## Questions en attente
- [ ] Q1 — question — bloque : 1.2 — hypothèse en attendant : …

## Décisions
- D1 · AAAA-MM-JJ · décision — raison — par : développeur | chef de projet

## Vérifications
- Tour 1 · AAAA-MM-JJ · N constats : N retenus, N rejetés, N reportés
```

## Wiki

Seul `contenu-jeu` interroge le wiki. Règles : `.claude/rules/donnees.md` et `tools/wiki/README.md`.
