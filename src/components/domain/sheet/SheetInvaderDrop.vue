<!-- Butin d'un PNJ envahisseur : liens vers la fiche (et la rencontre) du boss qui lâche l'objet, d'après `derived.invaderDrop`. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useDatasets } from '../../../composables/useDatasets.ts'
import type { InvaderDrop } from '../../../data/types/common.ts'
import type { BossEntry } from '../../../data/types/bosses.ts'
import { useDataStore } from '../../../stores/data.ts'
import CxIcon from '../../ds/CxIcon.vue'
import CxSkeleton from '../../ds/CxSkeleton.vue'

/**
 * Rencontres d'envahisseurs dont le butin cite exactement cet objet (`derived.invaderDrop`, calculé par la préparation des données).
 * Chaque rencontre est un lien vers la fiche du boss, sur l'onglet de la rencontre (`?rencontre=`). Le fichier des boss n'est demandé que si l'objet
 * en a besoin (ce composant n'est monté que s'il y a un butin d'envahisseur) ; en attendant le nom, un squelette occupe la place, et si la lecture échoue
 * le lien garde l'identifiant du boss comme texte.
 */
const props = defineProps<{
  /** `derived.invaderDrop` de l'entrée. */
  drops: readonly InvaderDrop[]
}>()

const data = useDataStore()
const state = useDatasets(['bosses'])

/** Une rencontre d'envahisseur prête à afficher. */
interface DropRow {
  readonly key: string
  readonly boss: string
  /** Fiche du boss, sur l'onglet de la rencontre. */
  readonly to: RouteLocationRaw
  /** Nom du boss ; `null` tant que le fichier n'est pas lu. */
  readonly name: string | null
  /** Lieu de la rencontre, tel que dans les données de combat ; `null` : non précisé. */
  readonly place: string | null
}

const rows = computed((): DropRow[] =>
  props.drops.map((d): DropRow => {
    const boss = data.entity(`boss:${d.boss}`) as BossEntry | null
    // `bossId/encounterId` ; une page sans rencontre n'a que `bossId`.
    const encounterId = d.encounter.includes('/') ? d.encounter.slice(d.encounter.indexOf('/') + 1) : null
    const index = boss?.derived.encounters.findIndex((e) => e.key === d.encounter) ?? -1
    const encounter = index >= 0 ? boss?.encounters[index] : undefined
    return {
      key: d.encounter,
      boss: d.boss,
      to: { name: 'boss', params: { id: d.boss }, query: encounterId === null ? {} : { rencontre: encounterId } },
      name: boss?.derived.displayName ?? (state.status.value === 'error' ? d.boss : null),
      place: encounter?.location ?? null,
    }
  }),
)
</script>

<template>
  <div class="sh-inv">
    <h3 class="cx-label">
      Butin d’un PNJ envahisseur
    </h3>
    <ul>
      <li
        v-for="r in rows"
        :key="r.key"
      >
        <CxIcon
          name="boss"
          size="sm"
        />
        <RouterLink
          v-if="r.name"
          class="wiki-ref"
          :to="r.to"
        >
          {{ r.name }}
        </RouterLink>
        <template v-else>
          <CxSkeleton
            width="140px"
            :height="14"
          />
          <span
            class="cx-sr"
            role="status"
          >Chargement du nom du boss</span>
        </template>
        <span
          v-if="r.name && r.place"
          class="cx-muted"
        >{{ r.place }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.sh-inv { display: grid; gap: var(--space-2); padding-top: var(--space-3); border-top: 1px solid var(--line); }
.sh-inv ul { display: grid; gap: var(--space-1); }
.sh-inv li { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); font-size: 13px; line-height: 19px; color: var(--ink-2); }
/* Mobile : chaque ligne fait 44 px au moins (`--size-cible`), sans espace entre deux zones de frappe. */
@media (max-width: 767px) {
  .sh-inv ul { gap: 0; }
  .sh-inv li { min-height: var(--size-cible); }
}
</style>
