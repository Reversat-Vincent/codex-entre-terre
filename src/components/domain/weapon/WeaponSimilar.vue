<!-- Encart « Autres <classe> » : fiches voisines de la même classe, avec leur source et leur score pour le profil quand l'arme est évaluée. -->
<script setup lang="ts">
import { entityRoute } from '../../../router/entityRoute.ts'
import type { EntityRef } from '../../../data/datasets.ts'
import { formatInt } from '../../../ui/format.ts'
import { WEAPON_CLASS_ICONS } from '../../../ui/labels.ts'
import type { SourceName } from '../../../ui/labels.ts'
import CxIcon from '../../ds/CxIcon.vue'
import CxSourceBadge from '../../ds/CxSourceBadge.vue'
import WeaponSection from './WeaponSection.vue'

/** Arme voisine à lister. */
export interface SimilarWeapon {
  readonly ref: EntityRef
  readonly name: string
  readonly source: SourceName
  /** Score pour le profil ; `null` : arme « Non classé » ; `undefined` : arme non évaluée (hors du style). */
  readonly score: number | null | undefined
}

/**
 * Armes de la même classe, de la plus proche du profil à la moins proche. Chaque nom est un vrai lien vers sa fiche.
 * Le score est celui du moteur pour les critères courants ; il est omis (jamais remplacé par 0) quand l'arme n'est pas évaluée.
 */
defineProps<{
  /** Classe (`category` de data/), en anglais comme dans les données. */
  category: string
  weapons: readonly SimilarWeapon[]
}>()
</script>

<template>
  <WeaponSection
    v-if="weapons.length > 0"
    :title="`Autres ${category}`"
    subtitle="Score pour votre profil"
  >
    <ul class="wp-sim">
      <li
        v-for="w in weapons"
        :key="w.ref"
      >
        <CxIcon
          v-if="WEAPON_CLASS_ICONS[category]"
          :name="WEAPON_CLASS_ICONS[category] ?? ''"
          size="sm"
          class="cx-muted"
        />
        <RouterLink
          class="wp-sim-name"
          :to="entityRoute(w.ref)"
        >
          {{ w.name }}
        </RouterLink>
        <CxSourceBadge :source="w.source" />
        <span
          v-if="w.score !== undefined"
          class="wp-sim-score cx-num"
        >
          <template v-if="w.score === null">Non classé</template>
          <template v-else>{{ formatInt(w.score) }}<span class="cx-sr"> sur 100</span></template>
        </span>
      </li>
    </ul>
  </WeaponSection>
</template>

<style scoped>
.wp-sim { display: grid; gap: 2px; }
.wp-sim li { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); padding: 8px 0; border-top: 1px solid var(--line); }
.wp-sim li:first-child { border-top: 0; }
.wp-sim-name { color: var(--ink); font-weight: 600; text-decoration-color: var(--line-strong); text-underline-offset: 3px; overflow-wrap: anywhere; }
.wp-sim-name:hover { text-decoration-color: var(--gold); }
.wp-sim-score { margin-left: auto; color: var(--gold-text); font: 600 16px/20px var(--font-sans); }
/* Mobile : zone de frappe de 44 px (`--size-cible`) autour du texte du lien ; la marge négative annule le remplissage pour que la mise en page ne bouge pas. */
@media (max-width: 767px) { .wp-sim-name { padding-block: calc((var(--size-cible) - 1lh) / 2); margin-block: calc((var(--size-cible) - 1lh) / -2); } }
</style>
