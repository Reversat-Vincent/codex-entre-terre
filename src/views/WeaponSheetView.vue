<!-- Écran « Fiche d'arme » (`/armes/:id`) : charge les fichiers d'armes, résout l'arme et affiche sa fiche ; états de chargement, d'erreur et « Élément introuvable ». -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import CxButton from '../components/ds/CxButton.vue'
import CxEmptyState from '../components/ds/CxEmptyState.vue'
import CxNote from '../components/ds/CxNote.vue'
import CxSkeleton from '../components/ds/CxSkeleton.vue'
import WeaponSheet from '../components/domain/weapon/WeaponSheet.vue'
import { WEAPON_FILES, findWeapon } from '../components/domain/weapon/weaponModel.ts'
import { useDatasets } from '../composables/useDatasets.ts'
import { usePageTitle } from '../composables/usePageTitle.ts'
import { useDataStore } from '../stores/data.ts'

/**
 * Fiche d'une arme (architecture § 9). Les trois fichiers d'armes sont demandés (l'identifiant ne dit pas dans lequel se trouve l'arme, et les armes voisines
 * de la même classe en sont tirées) ; les fichiers du score (origines, boss, tables) et l'index de recherche (liens croisés) sont demandés aussi, mais
 * n'empêchent pas d'afficher la fiche : le score et les liens apparaissent quand ils arrivent.
 */
const route = useRoute()
const data = useDataStore()
const { failed, retry } = useDatasets([...WEAPON_FILES, 'origins', 'bosses', 'tables', 'search-index'])

const id = computed(() => String(route.params.id ?? ''))
const found = computed(() => findWeapon((key) => data.dataset(key)?.entries ?? null, id.value))
const weaponsReady = computed(() => data.statusOf(WEAPON_FILES) === 'ready')
const weaponsFailed = computed(() => data.statusOf(WEAPON_FILES) === 'error')

usePageTitle(() => found.value?.weapon.derived.displayName)
</script>

<template>
  <div class="v-weapon">
    <div
      v-if="!found && !weaponsReady && !weaponsFailed"
      class="v-weapon-state cx-loading"
      aria-busy="true"
    >
      <CxSkeleton
        width="35%"
        :height="40"
      />
      <CxSkeleton :height="16" />
      <CxSkeleton :height="220" />
      <span
        class="cx-sr"
        role="status"
      >Chargement de la fiche</span>
    </div>

    <div
      v-else-if="!found && weaponsFailed"
      class="v-weapon-state"
    >
      <CxNote
        tone="warn"
        title="Impossible de lire les armes."
        role="alert"
      >
        <template v-if="failed.length > 0">
          Fichier concerné : {{ failed.map((f) => f.label).join(', ') }}.
        </template>
        <CxButton
          size="sm"
          icon="refresh"
          @click="retry()"
        >
          Réessayer
        </CxButton>
      </CxNote>
    </div>

    <div
      v-else-if="!found"
      class="v-weapon-state"
    >
      <h1 class="titre-l">
        Élément introuvable
      </h1>
      <CxEmptyState
        title="Cette arme n’existe pas dans les données."
        text="Le lien est peut-être ancien. Le catalogue liste toutes les armes disponibles."
      />
      <RouterLink
        class="cx-btn"
        :to="{ name: 'weapons' }"
      >
        Voir toutes les armes
      </RouterLink>
    </div>

    <WeaponSheet
      v-else
      :key="found.weapon.id"
      :weapon="found.weapon"
      :file="found.file"
    />
  </div>
</template>

<style scoped>
.v-weapon { min-width: 0; }
.v-weapon-state { display: grid; gap: var(--space-4); justify-items: start; padding: var(--space-6); max-width: 720px; }
@media (max-width: 767px) {
  .v-weapon-state { padding: var(--space-4); }
}
</style>
