# ReliabilityBadge

Dit d'où vient une valeur : wiki, estimation, non documentée, incohérente ou calculée par l'application.

| Variante | Classe | Icône | Quand |
|---|---|---|---|
| Wiki | `cx-rel-wiki` | `i-book` | Valeur documentée sur la page. Implicite dans les tableaux denses ; affichée à côté d'une estimation pour comparer. |
| Wiki (déduit) | `cx-rel-wiki` | `i-book` | Valeur déduite d'une règle du wiki (type d'amélioration déduit de la classe). |
| Estimation (haute, moyenne) | `cx-rel-est` | `i-approx` | `upgrade.estimate_if_undocumented` : afficher la confiance. |
| Non documenté | `cx-rel-nodata`, `.cx-null` | `i-empty` | Valeur `null`. Jamais « 0 », jamais vide. |
| Incohérence | `cx-rel-incoh` | `i-alert` | Le tableau de la page contredit son infobox. Discret, explication au survol, lien vers le wiki. |
| Calculé | `cx-rel-calc` | `i-calc` | Score, niveau recommandé, étape, valeur à +X : méthode au survol, détail dans « Pourquoi ? ». |

- Le badge suit immédiatement la valeur qu'il qualifie, sur la même ligne.
- Une valeur calculée à partir d'une estimation porte le badge Estimation.
- L'info-bulle d'une incohérence nomme le champ concerné et la valeur retenue.
- `.cx-mq` (« valeur de maquette ») et `.cx-mqv` sont des annotations du prototype : ne les livrez pas.
