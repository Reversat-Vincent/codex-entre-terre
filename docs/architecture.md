# Architecture du Codex de l'Entre-terre

> Référence commune des sous-agents, version du 01/11/2026, avant toute ligne de code. Tenue par le chef de projet : un écart se signale dans le rapport, il ne s'applique pas en silence. Priorité : décisions du développeur (`ROADMAP.md`) > cahier des charges > ce document > design > brief.
> Calculs : `docs/design/ds/calculs.md` (« `calculs.md` »), mis à jour par le chef de projet ; vérification du référent contenu : `docs/contenu/verification-calculs.md`. « **À confirmer** » : structure fixée, valeur attendue d'une décision de contenu.

## 0. Décisions appliquées

| # | Décision | § |
|---|---|---|
| A1 | Vue 3 (`<script setup lang="ts">`), Vite, TS strict, Vue Router (hash), Pinia, Vitest ; Playwright sur son Chromium ; `base` `/codex-entre-terre/` ; `dist/` ; Node 24 (Windows, CI Linux) | 2, 11 |
| A2 | Dépendances minimales justifiées, aucune bibliothèque d'interface, graphiques, virtualisation, recherche, glisser-déposer ou utilitaires | 14 |
| A3 | `vite-plugin-pwa` en mode « prompt », précache du site, des polices et des données | 11 |
| A4 | Données préparées par `scripts/` à chaque `dev` et `build`, hors dépôt, sans perte ; chargement par fichier ; index de recherche ; ids slug | 3, 4, 8 |
| A5 | Logique pure testée ; stores = orchestration ; composants sans calcul ni stockage ; configuration unique | 5, 6 |
| A6 | Persistance unique, versionnée, migrations, mode dégradé, export, import remplaçant avec « Annuler » | 7 |
| A7 | Tokens dans `src/styles/tokens.css`, seul fichier à couleurs ; `data-theme` sur `<html>` ; sans préprocesseur | 10 |
| A8 | Scripts npm `dev` `build` `preview` `test` `lint` `typecheck` `e2e` `check` | 11 |
| A9 | Interface et commentaires en français, identifiants en anglais ; aucun `v-html` | 10 |
| C1 | Runes : la table 1–713 de `mechanics.json` fait foi ; la formule entière n'est qu'un test de cohérence | 5.2 |
| C2 | Statistiques dérivées : tables 1–99 (Vigor, Mind, Endurance), colonne `Increments` ignorée | 3.2 |
| C3 | Puissance d'attaque « Calculé » : estimation bornée isolée dans `engine/attackPower.ts` (mode `estimate`, choisi par le développeur, D25), réductible à « valeurs publiées seulement » (`published`) | 5.2 |
| C8 | Liens externes (D25, D26) : « Voir sur le wiki » (eldenring.wiki.gg, `url`), « Voir sur Fextralife » par l'adresse de recherche du site, carte interactive et guides en liens qui s'ouvrent dans un nouvel onglet ; aucune donnée ni ressource de Fextralife chargée | 10.4 |
| C4 | Widget A : candidats selon le style ; puissance de sort à +0 pour les catalyseurs | 5.2 |
| C5 | Dérivés : butin de PNJ envahisseur, régions déduites si `acquisition[].region` est `null` ; Remembrance → boss par table | 3.2 |
| C6 | Correctifs de `data/` appliqués par dev-donnees avant la préparation ; contrôle « coef de scaling ≤ 3 » | 3.5 |
| C7 | Décisions de contenu D10 à D16 de `ROADMAP.md` (étapes, DLC en une étape triée par sous-zone, Remembrance → boss, frise, niveau recommandé M3 et bénédiction, archétypes du prototype) : valeurs de `src/engine/config/`, méthodes dans `calculs.md` | 5.3 |

## 1. Vue d'ensemble

```
data/*.json ──npm run data (scripts/prepare-data.ts, Node 24)──► public/data/*.<hash>.json + manifest.json
                                                                       │ fetch par fichier (src/data/loader.ts)
src/engine/config/* (pondérations, étapes, frise…)                     ▼
          └──────────► src/engine/* (fonctions pures → Calc<T>) ◄── useDataStore (données figées)
                                   ▲
       useCriteriaStore, useProfilesStore… (entrées)
                                   ▼
              useAnalysisStore (getters mémoïsés) ──► widgets, vues, composants Cx* (affichage seul)
src/persistence/ ◄──► localStorage (un document versionné), export et import JSON
```

## 2. Arborescence et propriétaires

| Chemin | Rôle | Propriétaire |
|---|---|---|
| `index.html` | `lang="fr"`, `<meta name="robots" content="noindex, nofollow">`, `theme-color`, `<body class="cx">` | outillage · **partagé** |
| `package.json`, `vite.config.ts` (Vitest compris), `tsconfig*.json`, `eslint.config.js`, `playwright.config.ts`, `.editorconfig`, `.gitignore` | configuration | outillage · **partagé** |
| `.github/workflows/`, `public/icons/`, `scripts/icons.ts` (PNG d'`i-mark` par Playwright), `src/pwa/` | publication, icônes, service worker | outillage |
| `public/data/` | **généré**, ignoré par git, vidé à chaque génération | données |
| `scripts/prepare-data.ts`, `scripts/data/` | lecture, contrôle, dérivation, écriture, rapport | données |
| `src/data/types/`, `src/data/datasets.ts` (registre : clé, fichier, genre, libellé, routes ; **partagé** en lecture), `src/data/slug.ts`, `src/data/keys.ts` | types et identité des données | données |
| `src/data/loader.ts`, `links.ts`, `wikiText.ts` | chargement, liens croisés, analyse du texte du wiki | logique |
| `src/engine/` (dont `config/`), `src/catalog/`, `src/search/`, `src/persistence/`, `src/stores/` | moteur, catalogues (facettes, tri), recherche, persistance, stores ; `stores/app.ts` = store racine **partagé** ; valeurs de `config/` = décisions du chef de projet | logique |
| `src/main.ts` | création de l'app, `useAppStore().boot()` | logique · **partagé** |
| `src/App.vue`, `src/router/`, `src/styles/` (`tokens.css`, `fonts.css`, `base.css`) | coquille, routes, styles globaux | interface · **partagé** |
| `src/components/ds/` (`Cx*`), `components/shell/`, `components/criteria/`, `components/domain/`, `src/views/`, composants de `src/widgets/` | interface | interface |
| `src/widgets/registry.ts` | identifiants, fichiers requis, largeurs | logique |
| `src/composables/`, `src/ui/` | `useDatasets` (logique) ; `format.ts`, `useBreakpoint`, `useFocusTrap`, `useHotkeys`, `useVirtualList`, `useReorder`, `labels.ts`, `explainText.ts`, `breakpoints.ts` (interface, D20) | selon le fichier |
| `tests/unit/<module>/`, `tests/fixtures/` (extraits **réels** de `data/`), `tests/e2e/` | tests | auteur du module ; fixtures : données ; e2e : outillage |
| `.cache/` | rapports, captures, sorties de Playwright | — |

Deux tâches ne touchent jamais en même temps un fichier **partagé** : un besoin de modification se signale.

## 3. Données

### 3.1 Fichiers produits (`public/data/`, servis sous `<base>data/`)

| Clé | Contenu | Taille (minifié / gzip) |
|---|---|---|
| 18 clés = noms de `data/` sans extension (`melee_armaments`…) | `DatasetFile` : `metadata` d'origine dans `meta`, entrées d'origine intégrales + `id` + `derived`, liste `transforms` | 7,7 Mo / 1,38 Mo pour les 18 jeux de données, 8,77 Mo / 1,51 Mo avec `tables` et `search-index` ; `melee_armaments` 1,58 Mo / 261 Ko (mesuré le 05/11) |
| `tables` | tables de calcul extraites de `mechanics.json`, chacune avec sa source | 65 Ko / 14 Ko |
| `search-index` | documents de recherche (§ 8) | 932 Ko / 108 Ko |
| `manifest.json` (nom fixe) | fichiers, tailles, empreintes ; `path` relatif à `manifest.json` (le chargeur fait `new URL(path, urlDuManifeste)`) | ≈ 4 Ko |

Nom servi : `<clé>.<sha256 sur 10 caractères>.json` ; sortie déterministe (sans date) ; pas de découpage en v1 (gzip suffit).

### 3.2 Transformations

- Chaque clé d'origine garde sa valeur exacte (`null`, `source`, `url`, estimations, `infobox`…) ; échec si une entrée a déjà `id` ou `derived`.
- Formes hétérogènes ramenées sans perte à une forme, consignée dans `transforms` : `npcs[].overview`, `character_information`, `questline` (liste ou objet) → `RichSection { text: string[]; tables: WikiTableData[] }`.
- `key_items` : 6 Grandes Runes en double (même `wiki_page`, seule `category` diffère) → une entrée, `derived.alsoListedIn` ; contenu différent → échec.
- `derived` (faits restructurés, jamais une valeur supposée) :

| Champ | Règle |
|---|---|
| `displayName` | `name`, ou `wiki_page` si plusieurs entrées d'un genre ont le même `name` (Viridian Amber Medallion ×3, « (Fletched) », « (Altered) ») |
| `upgrade` (armes) | `{ material, maxLevel, reliability, confidence?, basis? }`, `reliability` parmi `wiki`, `deduced` (`material_info_source` commence par `deduced` ou `game rule`), `estimate`, `null`, `not-upgradeable` ; `maxLevel` d'une estimation déduit du matériau, marqué estimation |
| `inconsistent` | liste `{ field, reference, reason?, url? }` : `upgrade.tables` (`reference: 'infobox'`) si `tables_consistent_with_infobox === false`, l'infobox fait foi ; `upgrade.material` (`reference: 'list'`) pour une arme de `metadata.material_inconsistencies_flagged`, la liste du wiki fait foi (D34). `CxValue` montre `reason` dans l'info-bulle du badge Incohérence |
| `regions` | par acquisition, avec provenance, selon `docs/contenu/decisions-progression.md` § 1.4 (D10) : `location` découpé sur ` / ` et résolu (valeur connue, suffixe `X (Région)`, `locations.json` `name` → `region`, `npcs.json` `listed_region`) et `region` découpé sur `/` ; région parente retirée quand une valeur plus précise existe (`Mt. Gelmir` + `Volcano Manor` → `Volcano Manor`, hiérarchie de `locations.json`) ; repli au niveau de l'entrée sur `regions_mentioned` ; équipements de départ ignorés ; restes d'extraction (`"through Rauh Base"`) rattachés au lieu cité et signalés. Pas d'étape : le moteur l'applique avec `config/stages.ts`, sans charger `locations` |
| `invaderDrop` | dans `encounters[].drops` d'un boss de rang `Invaders and other minibosses` (aucun indicateur dans `acquisition_flags`) ; couverture faible : 3 pages de ce rang sur 14 ont un butin |
| `methods` | `acquisition[].method` normalisé (`purchase`, `drop`, `guaranteed-drop`, `loot`, `trade`, `quest`, `starting`, `other`) ; la valeur brute reste affichée |

- `tables` : `levelCosts` (sujet Level, 713 lignes, fait foi), `hpByVigor`, `fpByMind`, `staminaByEndurance`, `equipLoadByEndurance` (1–99) ; colonne `Increments` ignorée, table « Stamina » incomplète non utilisée ; chaque table porte `source: { file: 'mechanics', title, path }`.

### 3.3 Identifiants

- **Slug** (`src/data/slug.ts`, partagé script/app) : NFD, sans diacritiques, minuscules, apostrophes `'` `’` supprimées, autre suite hors `[a-z0-9]` → `-`, tirets de bord retirés.
- **Id** = `slug(wiki_page)` ; mécaniques : `slug(title)`. Vérifié unique dans chaque fichier (hors doublons `key_items`).
- **Genres** (`EntityKind`, unicité par genre vérifiée) : `weapon` (mêlée, distance, boucliers), `ash`, `armor`, `talisman`, `spell`, `spirit`, `item` (outils, matériaux d'amélioration, objets clés, artisanat, munitions), `boss`, `location`, `npc`, `origin`, `mechanic`. Des doublons existent entre genres (`patches` boss et PNJ, `golden-seed` mécanique et objet).
- **`EntityRef`** = `` `${kind}:${id}` `` (`weapon:moonveil`) : seule forme stockée (Ma liste, comparateur) et base des routes.
- **Rencontre** : `slug(name)` ; doublon dans le boss → `slug(name + ' ' + variant)`, puis `+ ' ' + location` ; sinon échec (Elemer ×5, Fia's Champions ×3, Erdtree Avatar ×4 : résolus).
- **`EncounterKey`** = `` `${bossId}/${encounterId}` ``, ou `bossId` seul pour les 15 boss sans rencontre (Sir Gideon Ofnir en a une depuis le correctif C1).
- Changer le slug = changer le schéma de persistance (migration, § 7).

### 3.4 Types (`src/data/types/`)

- `common.ts` (`SourceTag`, `Acquisition`, `RichSection`, `WikiTableData` à lignes objets ou tableaux, `Grade`, `DatasetFile<E, M>`…) ; un fichier par jeu de données (`meleeArmaments.ts`… `mechanics.ts`) exportant `<Nom>Entry` et `<Nom>File` ; `tables.ts`, `searchIndex.ts`, `manifest.ts`.
- Fidèles à `data/` : nullable → `T | null`, parfois absent → `?`, unions réelles gardées (`fp_cost` des sorts : `number | string | null`) ; tout `readonly`.
- Sémantique vérifiée : `scaling.<attr> === null` = **pas de scaling** ; `requirements.<attr> === 0` = aucun prérequis ; `attack_power.<type> === 0` = aucun dégât ; `status_resistance` mêle nombres, `"Immune"`, `"no"` et textes à plusieurs valeurs (affichage brut, immunité si `"Immune"`) ; `hp`, `runes` = texte du wiki, `*_values` = nombres trouvés (plusieurs lieux ou NG+).
- `src/data/keys.ts` : `AttributeKey` (`vig mnd end str dex int fai arc`, depuis `vigor…` des origines et `str…` des armes), `DamageKey`, `StatusKey` (`blood_loss frostbite poison scarlet_rot sleep madness death_blight`) et icônes `i-st-*`.
- Code importé par `scripts/` (donc tout le projet) : syntaxe effaçable seulement (`erasableSyntaxOnly` : ni `enum`, ni `namespace`, ni propriété de paramètre), `import type`, imports relatifs avec extension `.ts`.

### 3.5 Contrôles d'intégrité (arrêt avec message clair, aucune correction)

| Contrôle | Bloquant |
|---|---|
| 18 fichiers, JSON valide, clé de liste attendue ; champs et types conformes aux types ; `source` dans l'énumération | oui |
| `url` commence par `https://eldenring.wiki.gg/wiki/` (seuls liens externes rendus) | oui |
| Unicité des `id` par genre et des rencontres par boss | oui |
| `scaling.<attr>.coef` des tableaux d'amélioration ≤ 3 dans les trois fichiers d'armes (décimales mal lues, cas Horn Bow) | oui |
| Tables continues (niveaux 1–713, attributs 1–99) ; Σ attributs − 79 = `level` pour chaque origine | oui |
| Références de `src/engine/config/` présentes dans les données (test unitaire) | oui |
| Noms non résolus, régions absentes de la table d'étapes, restes de balisage (`ER Icon … .png`) | non : compte dans `.cache/data/report.json` |

Le script affiche taille et entrées de chaque fichier produit. Les correctifs validés sont appliqués dans `data/` par dev-donnees avant la préparation (`data/CHANGELOG.md`).

### 3.6 Manifeste

```ts
interface DataManifest {
  schema: 1; dataVersion: string; retrieved: string;   // empreinte globale ; date d'extraction du wiki
  files: Record<FileKey, { path: string; bytes: number; sha256: string; entries: number; label: string }>;
}
type FileKey = DatasetKey | 'tables' | 'search-index';
```

## 4. Chargement

`src/data/loader.ts` (sans Vue) : `fetchManifest(base, fetchFn)` (`no-cache`) ; `fetchDataFile(key, entry, onProgress?, fetchFn?, base?)` lit le flux (progression en octets), parse, vérifie clé et nombre d'entrées ; erreurs `network`, `http`, `parse`, `mismatch`.

```ts
type FileStatus = 'idle' | 'loading' | 'ready' | 'error';
// useDataStore
state:   manifest: DataManifest | null; files: Record<FileKey, { status: FileStatus; bytesLoaded: number; bytesTotal: number; error: DataLoadError | null }>
getters: progress; statusOf(keys): 'loading' | 'ready' | 'error'; dataset(key): DatasetOf<K> | null; entity(ref: EntityRef)
actions: ensure(keys: FileKey[]): Promise<void>   /* idempotent */ ; retry(key)
```

- Démarrage : manifeste, fichiers des widgets visibles, puis ceux de la route ; index de recherche à la première ouverture de la palette ou au repos ; le reste à la demande.
- Données en `markRaw` / `shallowRef`, index `Map` par id construits une fois : jamais de réactivité profonde sur 7 Mo.
- `useDatasets(keys)` : `ensure` + état agrégé pour `CxWidgetShell` (fichier fautif nommé, « Réessayer »).

Widgets (`src/widgets/registry.ts`) : `requires` (liste, ou fonction `(criteria) => FileKey[]`) ; `enhancedBy` = section partielle tant que le fichier manque.

| Widget | `requires` | `enhancedBy` |
|---|---|---|
| A `weapons-by-stage` | `origins`, `bosses` + fichiers des candidats (`score.ts`) : mêlée → `melee_armaments`, distance ou magie → `ranged_weapons_catalysts`, hybride → les deux, `shields_torches` si une classe préférée en relève | — |
| B `optimal-origin` | `origins`, `tables` | fichiers d'armes |
| C `boss-order`, D1 `weakness-matrix` | `bosses` | — |
| D2 `upgrade-plan` | fichiers d'armes, `key_items` | — |
| D5 `rune-calculator` | `tables` | `bosses` |
| D8 `data-coverage` | fichiers d'armes, `bosses` | — |
| Recherche, Ma liste, liens croisés | `search-index` | — |

## 5. Moteur de calcul (`src/engine/`)

### 5.1 Type commun

```ts
type Reliability = 'wiki' | 'deduced' | 'estimate' | 'null' | 'inconsistent' | 'calculated';
type MethodId = 'stage' | 'weapon-score' | 'requirements' | 'optimal-origin' | 'target-attributes' | 'boss-level'
  | 'readiness' | 'rune-cost' | 'upgrade-plan' | 'derived-stats' | 'attack-power' | 'level' | 'coverage';
interface DataRef { file: DatasetKey | 'tables' | 'config'; entry?: string; field: string; value?: string | number | boolean | null; reliability: Reliability }
interface Explanation {
  method: MethodId;   // section de calculs.md
  components: { code: string; value: number | null; max?: number; params?: Record<string, string | number> }[];
  inputs: DataRef[];  // fichier, entrée, champ lus
  limits: { code: string; params?: Record<string, string | number> }[];
}
interface Calc<T> { value: T | null; estimate: { confidence: 'high' | 'medium' } | null; explanation: Explanation }
```

- Le moteur renvoie des **codes**, jamais du texte d'interface : `src/ui/explainText.ts` les traduit (un test vérifie que chaque code a son texte).
- `null` en entrée → composant `null` et limite (`hp-missing`, `region-unknown`…), jamais 0. Entrée estimée → `estimate` rempli, badge Estimation sur le résultat (plan de Moonveil).
- Chaque fonction exportée cite sa section de `calculs.md` ; aucune ne lit un store ni le stockage.

### 5.2 Modules

| Module | Signatures publiques (résumé) | Méthode |
|---|---|---|
| `level.ts` | `levelOf(attrs): Calc<number>` (Σ − 79) | Origine optimale |
| `stage.ts` | `stageOfRegion(region, cfg)` ; `weaponStage(w, ctx): Calc<StageId>` (acquisition la plus précoce ; Remembrance → boss ; équipement de départ pour l'origine retenue seulement) ; `currentStage(progress, ctx): Calc<StageId>` ; sous-zone DLC (`entry`, `core`, `enir-ilim`) comme clé de tri (D11) | Étape |
| `requirements.ts` | `compareRequirements(w, attrs, hands, cfg): RequirementCheck[]` (`required`, `effective`, `met`, `gap`, `twoHandApplied`) ; exceptions à deux mains par configuration | Prérequis |
| `score.ts` | `candidateWeapons(data, style, cfg)` (mêlée → `melee_armaments` ; distance → Light Bows, Bows, Greatbows, Crossbows, Ballistas ; magie → Staves, Sacred Seals ; hybride → tout ; boucliers et torches si leur catégorie est préférée) ; `filterWeapons → { kept, hidden: Record<HiddenReason, number> }` ; `scoreWeapon: Calc<WeaponScore>` (4 × 25 ; catalyseur : Puissance sur la puissance de sort à +0) ; `recommendByStage`, `alternatives`, `widenSuggestions` | Score |
| `target.ts` | `targetAttributes(archetype \| null, targetLevel, current, cfg): Calc<Attributes>` ; `buildWeights(...)` | Build cible (D16) |
| `origins.ts` | `rankOrigins(origins, target, ctx): Calc<OriginRank>[]` (`finalLevel`, `wastedPoints`, `earlyFit`) ; `effectiveOrigin(choice, ranking)` | Origine optimale |
| `derivedStats.ts` | `derivedStats(attrs, tables): Calc<{ hp; fp; stamina; equipLoad }>` (tables, jamais `origins[].base_stats` : anomalie Heavy Knight) ; l'équilibre reste une donnée | Statistiques dérivées |
| `timeline.ts` | `buildTimeline(bosses, progress, cfg): TimelineView` (étapes, « N parmi M », « ou », prérequis boss ou textuels, voie DLC et « ordre libre », prochain boss) | Frise (D13) |
| `bossLevel.ts` | `recommendedLevel(boss, encounter \| null, position, cfg): Calc<{ level; scadutree? }>` ; `readiness(level, rec, defeated)` → `ready` (≥ rec), `limit` (≥ rec − 8), `early`, `defeated`, `unknown` (aucune rencontre) ; `gaugeMax` = `max(rec + 30, level + 12, 60)` | Niveau recommandé (M3, D14) |
| `runes.ts` | `runeCost(level, tables)`, `runesBetween(from, to, tables)` : `Calc<number>` lus dans la table 1–713 ; la formule entière n'existe que dans les tests | Coût en runes |
| `upgradePlan.ts` | `upgradePlan(w, from, to, bellBearings, ctx): Calc<UpgradePlan>` (pierres par palier, pierres anciennes, Bell Bearings et leur étape) ; `null` si type inconnu ou « Not upgradeable » | Plan d'amélioration |
| `weakness.ts` | `bestDamageTypes(enc, n)`, `immunities(enc)`, `absorptionBand(v)` (seuils d'AbsorptionHeatmap) | lecture de données |
| `attackPower.ts` | `attackPower(w, affinity, level, attrs, hands, cfg): Calc<AttackBreakdown> \| { unavailable: string }`. Mode `estimate` : base au niveau choisi depuis `upgrade.tables` (interpolée sinon, badge Estimation ; infobox à +0 si `derived.inconsistent`), −40 % par type lié à un prérequis non atteint, bonus de scaling seulement si les coefficients existent (43 armes), sinon « non calculable ». Mode `published` : valeur du tableau si documentée, sinon `unavailable`. Aucun autre module ne dépend du détail | Hypothèse C3 |
| `coverage.ts` | `coverage(data, timelineCfg): CoverageRow[]` (documenté, estimé, non documenté, par source) | Couverture |
| `attributeYield.ts` | `attributeYield(attrs, tables): Calc<YieldCurve[]>` : pour Vigor, Mind et Endurance, valeur par niveau 1–99 (PV, FP, endurance, charge), gain du point suivant, paliers où le gain baisse, position du profil (D23) | Statistiques dérivées |
| `methods.ts`, `codes.ts` | identifiant et section de `calculs.md` de chaque `MethodId` ; liste unique des codes de composantes et de limites (les textes sont dans `src/ui/explainText.ts`) | — |
| `readiness.ts` | préparation et jauge, réexportées par `bossLevel.ts` ; `checkRequirements` (avec explication) s'ajoute à `compareRequirements` ; les fonctions qui citent un fichier reçoivent `ctx.file` | D32 |

### 5.3 Configuration (`src/engine/config/`, chaque valeur commentée)

| Fichier | Contenu | État |
|---|---|---|
| `weights.ts` | pondérations du score, seuil Limite 8, jauge, budget de charge (ratios 0,3 / 0,7 / 1, part 0,25 : prototype) | `calculs.md` suit chaque changement |
| `stages.ts` | `STAGES` (`early mid late endgame dlc`), `REGION_STAGE` et `DLC_ZONE` sur les noms réels (`decisions-progression.md` § 1.3, option A) | décidé (D10, D11) |
| `remembrances.ts` | `Record<EntityRef, { remembrance: ItemId; boss: BossId; encounter: EncounterKey }>`, table § 2.2 (52 objets), références contrôlées par test | décidé (D12) |
| `timeline.ts` | étapes `{ n, labelCode, kind: 'choice' \| 'or' \| 'one', need, stage, nodes: { boss, keys: EncounterKey[], match: 'all' \| 'any', prereqs? (boss ou texte) }[] }` ; voie DLC `{ gate: BossId[]; nodes; freeOrder? }` (§ 3.2) | décidé (D13) |
| `bossLevel.ts`, `archetypes.ts` | paliers de zone et ancres (M1), calage des runes NG (M2), niveau d'entrée du DLC, bénédiction par sous-zone ; archétypes, poids, gabarits cibles et poids automatiques du prototype (`Main.dc.html` : `ARCH`, `FLOOR`, `targetFor`, `autoW`) | décidé (D14, D16) |
| `twoHanded.ts`, `upgrade.ts` | catégories et armes sans posture à deux mains, exceptions, toujours à deux mains ; Bell Bearings → paliers couverts | décidé (D5) |
| `attackPower.ts`, `weaponPools.ts` | `mode: 'estimate' \| 'published'`, courbe générique, attributs par type ; catégories candidates par style | C3, C4 |

### 5.4 Ordre d'évaluation (cycle A ↔ B)

L'origine « Automatique » est le rang 1 de B ; B départage avec les armes de A ; A donne un bonus à l'équipement de départ. Ordre fixé dans `useAnalysisStore` : scores sans bonus d'origine → classement des origines → origine retenue → scores définitifs. Le « Pourquoi ? » de B le mentionne.

## 6. État de l'utilisateur (`src/stores/`)

| Store | État | Actions | Persisté |
|---|---|---|---|
| `app` (racine) | `appVersion`, `storage: 'ok' \| 'unavailable' \| 'readonly-newer'` | `boot()` : lecture, migration, hydratation, thème, données, service worker | — |
| `data` | § 4 | § 4 | non |
| `criteria` | `Criteria` de travail | `set`, `toggleDefeated(key)` (passe le mode en `boss`), `reset()` (vers le profil enregistré, avec Annuler) | oui |
| `profiles` | `items: { id, name, criteria, savedAt }[]`, `activeId`, getter `dirty` | `save`, `saveAs`, `load`, `rename`, `remove` | oui |
| `analysis` | — | getters qui appellent le moteur (scores, étapes, origines, frise, préparation, puces de critères) | non |
| `pins` | `items: { ref: EntityRef; addedAt; done }[]` | `pin`, `unpin` (« Épinglé à Ma liste », Annuler 5 s), `toggleDone`, `reorder` | oui |
| `compare` | `items: EntityRef[]` (2 à 4, même genre) | `add` (refus motivé), `remove`, `clear` | non (§ 15) |
| `layout` | `order`, `hidden`, `collapsed`, `collapsedMobile` (D réduits par défaut) | `move`, `add`, `remove`, `toggleCollapse`, `reset` | oui |
| `preferences` | `theme: 'sombre' \| 'parchemin'`, `navRail: 'auto' \| 'rail' \| 'expanded'`, `criteriaCollapsed`, `catalogView: Record<catalogue, 'table' \| 'grid'>`, `catalogColumns: Record<catalogue, string[]>` | setters ; le thème écrit `data-theme` | oui |
| `search` | `open`, `query`, `recent` (8 au plus) | `openPalette`, `close`, `commit` | `recent` |
| `catalogs`, `toasts` | filtres (ordre d'ajout), tri, page ; notifications | — | non |

```ts
interface Criteria {
  content: { base: true; sote: boolean; tp: boolean };
  character: { origin: OriginId | 'auto'; attributes: Attributes };          // niveau calculé
  target: { archetype: ArchetypeId | null; level: number };
  style: { mode: 'melee' | 'ranged' | 'magic' | 'hybrid'; classes: string[]; hands: 1 | 2; status: StatusKey | null; load: 'light' | 'mid' | 'heavy' };
  progress: { mode: 'stage' | 'boss' | 'region'; stage: StageId; regions: string[]; defeated: EncounterKey[] };
  constraints: { excludeRemembrance: boolean; excludeRandomDrop: boolean; excludeQuest: boolean; stonePreference: 'none' | 'normal' | 'somber' };
  reliability: { includeEstimates: boolean };
}
```

Les boss vaincus font partie des critères de travail : ils suivent le personnage et entrent dans les profils. Chaque store persisté expose `snapshot()` et `hydrate(slice)`, appelés seulement par `persistence/bridge.ts`.

## 7. Persistance (`src/persistence/`)

| Élément | Règle |
|---|---|
| Stockage | `localStorage` derrière une interface `StorageLike` injectable (tests en `node`) ; aucun autre accès au stockage dans le code |
| Clés | `codex-entre-terre:state` ; `codex-entre-terre:backup-v<N>` (copie brute avant migration) |
| Document | `{ app: 'codex-entre-terre'; schemaVersion; savedAt; appVersion; state: { criteria; profiles; pins; layout; preferences; recentSearches } }` |
| Écriture | abonnement aux stores, écriture après 300 ms de calme et à `pagehide` ; `storage` d'un autre onglet → réhydratation |
| Migrations | `Record<number, (s: unknown) => unknown>` de N vers N + 1, en chaîne, chacune testée ; `CURRENT_SCHEMA = 1` |
| Mode dégradé | test d'écriture au démarrage ; échec ou quota → mémoire seule et bandeau « Vos réglages ne seront pas conservés sur cet appareil » ; version stockée plus récente → lecture seule, rien n'est écrasé |
| Export | `{ app, kind: 'export', schemaVersion, exportedAt, appVersion, state }`, fichier `codex-entre-terre-AAAA-MM-JJ.json` |
| Import | ≤ 1 Mo ; `JSON.parse` protégé ; `validateDocument(x: unknown): Result<PersistedState, ValidationIssue[]>` complète (chemins, types, énumérations, bornes : attributs 1–99, niveau ≤ 713, 50 profils, 2 000 épinglés, chaînes ≤ 200 ; objets reconstruits depuis les clés connues, `__proto__` ignoré) ; version inconnue ou plus récente → refus clair sans écriture ; plus ancienne → migrations ; confirmation avec résumé ; instantané ; remplacement complet ; « Annuler » dans la notification et sur la page Profil jusqu'à la fin de la session |
| Références inconnues | un `EntityRef` absent des données ne bloque pas l'import : « Élément introuvable » à l'affichage |

## 8. Recherche (`src/search/`)

```ts
interface SearchDoc {
  ref: EntityRef; group: SearchGroup;     // weapon ash armor talisman spell spirit item boss location npc origin mechanic skill
  name: string; norm: string;             // derived.displayName et sa forme normalisée
  source: SourceTag | null; ctx: string[];// contexte brut (classe, région, rang), joint par « · »
  terms?: { field: 'skill' | 'acquisition' | 'region'; text: string; norm: string }[];
}
```

- `skill` : compétences des armes et des Cendres ; cible = la Cendre si elle existe, sinon l'arme. L'index sert aussi aux liens croisés : `links.ts` (nom exact normalisé → `EntityRef[]`, `resolveName(name, preferredKinds)`, sinon texte simple).
- `normalize` : `normalizeText` de `src/data/slug.ts`, partagée avec la préparation (NFD, sans diacritiques, minuscules, apostrophes supprimées, autres signes → espace) ; pas de seconde implémentation. Tous les mots de la requête sont exigés.
- Classement : 0 nom qui commence par la requête ; 1 chaque mot est un début de mot ; 2 sous-chaîne ; 3 `terms` (le contexte nomme le champ). Départage : position, longueur, ordre alphabétique (`localeCompare('en')`). Sans résultat, tolérance aux fautes légères : Damerau-Levenshtein ≤ 1 (mots de 4 à 7 lettres), ≤ 2 au-delà.
- `search(index, q, { groups?, perGroup: 4 })` ; « Voir les N » → `/recherche`. `highlight(name, q): { text; match }[]` sur le nom d'origine.
- Groupes : ceux qui ont des résultats, plus « Actions » (`actions.ts`). Saisie vide : récentes, épinglés, actions. Aucun résultat : noms en anglais, suggestions, recherche sur le wiki. Parcours linéaire (~3 500 documents) : ni index inversé ni worker.

## 9. Routage (`createWebHashHistory`)

| Chemin | Nom | Vue | Dessiné |
|---|---|---|---|
| `/` | `dashboard` | `DashboardView` | oui |
| `/plein-ecran/:widgetId` | `widgetFullscreen` | `WidgetFullscreenView` (vue dédiée pour A) | A |
| `/explorer` | `explore` | `ExploreView` (liste des catalogues, onglet mobile) | non |
| `/armes` `?famille=` (`melee`, `distance`, `boucliers`) · `/armes/:id` | `weapons` · `weapon` | `CatalogView` · `WeaponSheetView` | mêlée, fiche |
| `/boss` · `/boss/:id` `?rencontre=` | `bosses` · `boss` | `CatalogView` · `BossSheetView` | fiche |
| `/cendres-de-guerre`, `/armures`, `/talismans`, `/sorts`, `/esprits`, `/lieux`, `/pnj`, `/origines` (+ `/:id`) | `ashes`/`ash`, `armors`/`armor`, `talismans`/`talisman`, `spells`/`spell`, `spirits`/`spirit`, `locations`/`location`, `npcs`/`npc`, `origins`/`origin` | `CatalogView` · `<Genre>SheetView` | non |
| `/objets` `?type=` (`outils`, `amelioration`, `cles`, `artisanat`, `munitions`) · `/objets/:id` | `items` · `item` | `CatalogView` · `ItemSheetView` | non |
| `/mecaniques` · `/mecaniques/:id` `?section=` | `mechanics` · `mechanic` | sommaire · `MechanicArticleView` | non |
| `/ma-liste`, `/comparateur` `?e=<ref>,<ref>`, `/profil` | `myList`, `compare`, `profile` | Profil : profils, préférences, stockage, export et import, versions, licences | non |
| `/recherche` `?q=&groupe=` | `search` | tous les résultats d'un groupe | palette |
| `/:pathMatch(.*)*` | `notFound` | `NotFoundView` | non |

Titre de page `<titre> — Codex de l'Entre-terre` (`meta.title` ou nom de l'entité) ; id inconnu → « Élément introuvable » ; défilement restauré au retour ; palette de recherche en surcouche globale (Ctrl/⌘ + K), plein écran sous 768 px.

## 10. Interface

### 10.1 Coquille (`src/components/shell/`)

| Taille | Navigation | Critères (tableau de bord, plein écran A) | Recherche |
|---|---|---|---|
| ≥ 1280 | `AppSideNav` 232 px, rail 64 px (repli automatique sous 1600 px si les critères sont ouverts) | `CriteriaPanel` 304 px, repliable à 52 px | `AppTopBar` |
| 768–1279 | rail | tiroir (`CxSheet` latéral) | `AppTopBar` |
| < 768 | `AppTabBar` : Accueil, Explorer, Ma liste, Mécaniques, Profil (cibles ≥ 44 px) | `CxSheet` du bas à 88 %, « Voir N armes » | palette plein écran |

Aussi : `AppFooter` (mention du cahier § 6 et date d'extraction), `AppLoadProgress`, `AppStorageBanner`, `AppUpdatePrompt`, `CxToastHost`, `CxDialog` (`<dialog>` natif). Points de rupture : `src/ui/breakpoints.ts` (767, 1279, 1600), en dur dans les media queries.

### 10.2 Composants (`src/components/ds/`)

Un composant du design system = un fichier `Cx<Nom>.vue` : `CxButton`, `CxIcon` + `IconSprite` (sprite copié tel quel de `Iconography/preview.html`, inséré une fois dans `App.vue`), `CxSourceBadge`, `CxReliabilityBadge`, `CxEntityName` + `CxWikiLink` (`target="_blank" rel="noopener noreferrer"`), `CxTooltip` (survol, focus et appui), `CxTabs`, `CxSegmented`, `CxToggle`, `CxCheckbox`, `CxSelect`, `CxRange` (FormControls), `CxAttributeStepper`, `CxCriteriaChips`, `CxDamageChip`, `CxScalingChips` (scaling `null` = pas de puce, P3), `CxRequirementChips`, `CxDataTable` (tri multi-colonnes, `null` en dernier, en-tête collant, pagination, virtualisation au-delà de 100 lignes de 34 px), `CxFacetFilters`, `CxWeaponCard`, `CxWhyPanel` (rend une `Explanation`), `CxWidgetShell` (états `ready loading empty partial error`), `CxEmptyState`, `CxSkeleton`, `CxProgress`, `CxNote` (States), `CxProgressThread`, `CxReadinessGauge`, `CxBossTimeline` (+ `BossNode`), `CxAbsorptionHeatmap`, `CxCoverageBar`, `CxLineChart` (SVG maison + vue tableau), `CxCommandPalette`. Hors design system : `CxValue` (point unique des conventions, § 10.4) et son adaptateur `CxCalcValue`, `CxChip`, `CxFilterChips`, `CxDialog`, `CxMenu`, `CxSheet`, `WikiText`, `WikiTable`, `AbsorptionBars` ; la pagination est intégrée à `CxDataTable` (D35).

Styles : les règles de `bundle.css` d'un composant vont dans son `<style>` non limité, mêmes classes `cx-*` ; les vues n'ont que leur mise en page (`<style scoped>`). Jamais livrés : `.cx-mq`, `.cx-mqv`, `.cx-mq-banner`, `.cx-hide-mq`, `.cx-proto`, `--mock`, `--mock-wash` (retirés de la copie de `tokens.css`, écart noté en tête).

### 10.3 Widgets (`src/widgets/`)

| Id | Composant | Largeur | Plein écran |
|---|---|---|---|
| `weapons-by-stage` | `WeaponsByStageWidget` (onglets par étape sur mobile) | 12 | `WeaponsFullscreenView` (note `spec-full`) |
| `optimal-origin` | `OptimalOriginWidget` | 12 | — |
| `boss-order` | `BossOrderWidget` | 12 | oui |
| `weakness-matrix` | `WeaknessMatrixWidget` | 12 | oui |
| `upgrade-plan` | `UpgradePlanWidget` | 7, double hauteur | — |
| `rune-calculator` | `RuneCalculatorWidget` (Prochain boss, Build cible, Autre) | 5 | — |
| `data-coverage` | `DataCoverageWidget` | 5 | — |
| `attribute-yield` | `AttributeYieldWidget` (`CxLineChart`, vue tableau ; requiert `tables`) (D23) | 7 | oui |

Registre : `{ id, titleCode, howCode, span, requires, enhancedBy, fullscreen, collapsedOnMobile, component }`. D3, D4, D6, D7 du prototype : hors v1, absents. Réordonnancement par Pointer Events (`useReorder`) et au clavier (menu).

### 10.4 Conventions de données

| Convention | Information | Rendu |
|---|---|---|
| Source | `source` de l'entrée ou de la rencontre | `CxSourceBadge` après chaque nom |
| Non documenté | `null` | `CxValue` (∅) ; case hachurée `.cx-null` en tableau ; tri en dernier |
| Estimation | `derived.upgrade.reliability === 'estimate'`, `Calc.estimate` | badge avec confiance, exports compris |
| Wiki (déduit), Incohérence | `derived.upgrade.reliability === 'deduced'`, `derived.inconsistent` | badge ; info-bulle : champ et valeur retenue |
| Calculé | tout `Calc<T>` | `gold-text`, badge, « Pourquoi ? », à côté de la valeur de base |
| Voir sur le wiki | `url` | `CxWikiLink` |
| Liens externes (D26) | `src/data/externalLinks.ts` (logique) : `fextralifeSearchUrl(name)` (`https://eldenring.wiki.fextralife.com/index.php?search=<nom encodé>`), carte interactive, pages de guides | `CxWikiLink` (variante secondaire), nouvel onglet, `rel="noopener noreferrer"` ; aucune requête de l'application vers ces sites |

### 10.5 Icônes, polices, thème, formatage, textes du wiki

- Icônes : sprite unique, `currentColor`, aucune icône du jeu. Polices servies par le site (`src/styles/fonts.css`, paquets `@fontsource`, sous-ensembles `latin` et `latin-ext`) : Cormorant Garamond 500 italique, 600, 600 italique, 700 ; Source Sans 3 400, 600, 700 (relevé dans `bundle.css`).
- Thème : `data-theme` sur `<html>`, posé avant le montage ; sombre par défaut.
- `src/ui/format.ts`, seul module de formatage : `formatInt` (U+202F dès 4 chiffres), `formatDecimal` (virgule), `formatPercent` (U+00A0 avant `%`, moins U+2212), `formatWeight`, `formatSigned`. Un `null` est traité par `CxValue`, jamais ici. Libellés des clés de données : `src/ui/labels.ts`.
- `parseWikiLines(lines, 'list' | 'paragraphs'): WikiBlock[]` reconnaît `[Titre]` et les `→` répétés ; `WikiText` rend `h3`/`h4`, listes imbriquées ou paragraphes par interpolation seulement (`white-space: pre-line`). `WikiTable` accepte lignes objets ou tableaux ; un en-tête `A / B` donne deux niveaux.

## 11. Hors ligne et déploiement

| Sujet | Règle |
|---|---|
| PWA | `registerType: 'prompt'`, `injectRegister: false` ; `globPatterns` `**/*.{js,css,html,svg,png,woff2,json}` ; `maximumFileSizeToCacheInBytes` 4 Mio ; `cleanupOutdatedCaches` ; `navigateFallback: 'index.html'` |
| Manifeste | « Codex de l'Entre-terre », « Codex », `fr`, `start_url` et `scope` `./`, `standalone`, couleurs de `--bg` et `--surface` sombres (seule exception aux tokens, commentée), `public/icons/` |
| Mise à jour | `src/pwa/registerSW.ts` (`virtual:pwa-register/vue`) : `needRefresh`, `update()` ; `AppUpdatePrompt` propose « Recharger ». Données et manifeste précachés : une version servie est complète |
| Non-indexation | `<meta name="robots" content="noindex, nofollow">` ; ni `robots.txt` ni sitemap |
| `deploy.yml` | push sur `main` et lancement manuel ; Node 24 ; `npm ci`, `lint`, `typecheck`, `test`, `build` ; `actions/upload-pages-artifact` puis `actions/deploy-pages`, versions du guide de Vite |
| Version | `version` de `package.json` → `__APP_VERSION__` (`define`) : export, page Profil |

| Script | Commande |
|---|---|
| `data` | `node scripts/prepare-data.ts` (types supprimés nativement, vérifié sous Node 24.21) |
| `dev` · `build` · `preview` | `npm run data && vite` · `npm run data && vite build` · `vite preview` |
| `test` · `lint` | `vitest run` · `eslint .` |
| `typecheck` | `vue-tsc --noEmit` (application) et `tsc --noEmit` (scripts, configurations) |
| `e2e` | `playwright test` (lance `vite preview` ; suppose `dist/` à jour) |
| `check` | `npm run lint && npm run typecheck && npm run test && npm run build && npm run e2e` |

## 12. Tests

| Type | Emplacement | Contenu minimal |
|---|---|---|
| Moteur | `tests/unit/engine/` | runes 1 → 673, 150 → 153 680, 712 → 8 879 348 (table), formule entière = table sur 1–712 (cohérence) ; Vigor 15 → 522 PV ; Σ − 79 pour les 12 origines ; deux mains `floor(STR × 1,5)`, écart `ceil(prérequis / 1,5) − STR` (Greatbow 20 → 14) ; seuils de préparation et jauge ; plan +0 → +25 (96 pierres + 1 ancienne) et sombre +0 → +10 ; Blasphemous Blade → Rykard → Volcano Manor → Fin ; moyenne 0,5 → 25 ; propagation `null` et estimation |
| Recherche, catalogues | `tests/unit/search/`, `catalog/` | accents et casse (« Jolán »), rangs, surlignage, tolérance ; compteurs de facettes (sans leur propre sélection), tri, `null` en dernier |
| Persistance | `tests/unit/persistence/` | export puis import = même état ; invalide, inconnu ou plus récent refusé sans écriture ; migrations ; stockage indisponible ; Annuler |
| Données, format | `tests/unit/data/`, `ui/` | slug, unicité, rencontres, dédoublonnage, tables, références de la configuration ; U+202F, U+00A0, U+2212 ; `→` et `[Titre]` |
| E2E | `tests/e2e/` | `screens.spec.ts` : chaque route à 390 × 844, 1024 × 768, 1440 × 900 → `.cache/e2e/screens/` ; `offline.spec.ts` : première visite, service worker actif, `setOffline(true)`, rechargement, widgets affichés ; `persistence.spec.ts` |

Playwright : projet unique `chromium`, ni `channel` ni `executablePath`, sorties dans `.cache/playwright/`. Vitest en environnement `node` ; composants vérifiés par captures et revue.

## 13. Conventions de nommage

| Objet | Convention | Exemple |
|---|---|---|
| Composant | PascalCase ; `Cx` (design system), `App` (coquille), suffixes `View`, `Widget`, `SheetView` | `CxWeaponCard.vue` |
| Module TS · composable · store | camelCase · `useXxx.ts` · fichier = domaine, `useXxxStore` | `upgradePlan.ts`, `stores/pins.ts` |
| Type · configuration | PascalCase sans `I`, unions plutôt qu'`enum` · `UPPER_SNAKE_CASE` | `StageId` · `REGION_STAGE` |
| Jeu de données · widget · route | nom du fichier · kebab-case · nom camelCase, chemin français | `melee_armaments` · `boss-order` · `/cendres-de-guerre` |
| CSS · tests · imports | `cx-*`, `v-*` (mise en page) · `<module>.test.ts`, `<sujet>.spec.ts` · relatifs avec extension | `'../data/slug.ts'` |

Chaque fichier commence par un commentaire de rôle ; chaque export a son TSDoc (`eslint-plugin-jsdoc`).

## 14. Dépendances

| Paquet | Type | Justification |
|---|---|---|
| `vue`, `vue-router`, `pinia` | exécution | stack imposée |
| `@fontsource/cormorant-garamond`, `@fontsource/source-sans-3` | exécution | polices servies par le site, woff2 versionnés, licence OFL |
| `vite`, `@vitejs/plugin-vue`, `typescript`, `vue-tsc`, `@types/node`, `vitest` | dév. | compilation, types, tests |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-vue`, `eslint-plugin-jsdoc` | dév. | lint, `vue/no-v-html`, TSDoc des exports (`jsdoc/require-jsdoc`, `publicOnly`) |
| `@playwright/test` | dév. | e2e, icônes |
| `vite-plugin-pwa`, `workbox-window` | dév. | service worker ; `workbox-window` pour le module d'enregistrement (à confirmer) |

Refusés : Prettier (`.editorconfig` suffit), jsdom, `tsx`/`ts-node` (Node 24 exécute le TypeScript), bibliothèques de validation et celles de A2. Tout ajout passe par le chef de projet et se consigne ici.

## 15. Points arbitrés et en attente

| # | Sujet | Décision du chef de projet (D17 sauf mention) |
|---|---|---|
| P1 | Puissance d'attaque (C3) | mode `estimate`, choisi par le développeur (D25) ; `published` reste disponible dans `config/attackPower.ts` |
| P2 | Étapes, Remembrance → boss, frise, niveau recommandé, archétypes | décidés (D10 à D16) ; replis gardés : étape non déterminée, limite affichée |
| P3 | README ScalingChip (`null` → « ? ») contre `field_notes` (`null` = pas de scaling) | suivre les données : pas de puce, écart au design |
| P4 | Recherche : 5 par groupe (README CommandPalette) ou 4 (note `spec-search`) | 4 ; union des groupes |
| P5 | Catalogue : pagination et virtualisation | pages de 50, « Tout afficher » virtualisé ; plein écran A toujours virtualisé |
| P6 | 303 tableaux d'affinité sur 361 ont deux niveaux ou moins | graphique des seuls niveaux documentés ; moins de 3 points → tableau et note « tableau partiel » ; l'interpolation reste dans la colonne Calculé |
| P7 | Comparateur | mémoire seule, reflété dans `?e=` |
| P8 | Prix des Bell Bearings absents de `data/` | plan sans prix en v1 (D8) |
| P9 | Exceptions à deux mains, plan `null` et « Not upgradeable » | textes du référent dans `calculs.md` (D5), `twoHanded.ts`, `upgrade.ts` |
| P10 | e2e dans le workflow | en local et en vérification ; le workflow s'arrête à la compilation |
| P11 | Méthodes de calcul dans l'application | résumés de `methods.ts` dans l'info-bulle et « Pourquoi ? » ; pas de page en v1 |
| P12 | Double transfert au premier chargement | accepté ; mesuré |
| P13 | Suggestions français → anglais (« lune » → « moon ») | petit glossaire de mots courants `src/search/glossary.ts` (logique), sans fait du jeu |
| P14 | Polices statiques ou variables | statiques ; poids mesuré par dev-outillage |
