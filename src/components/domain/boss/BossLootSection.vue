<!-- Butin d'une rencontre : objets du wiki, en liens vers leur fiche quand le nom correspond exactement à une entité. -->
<script setup lang="ts">
import { computed } from 'vue'
import { useNameIndex } from '../../../composables/useNameIndex.ts'
import { entityRoute } from '../../../router/entityRoute.ts'
import CxValue from '../../ds/CxValue.vue'
import BossSection from './BossSection.vue'
import { KIND_LABELS, lootGroups, resolveLootItem } from './bossSheetModel.ts'

/**
 * Section « Butin » (écran Fiche boss). Les noms viennent de `encounters[].drops`, en anglais ; un nom devient un lien seulement s'il se résout
 * en une entité (`resolveName`, index du fichier `search-index`), sinon il reste du texte. Une liste vide s'affiche « Non documenté ».
 */
const props = defineProps<{
  /** Butin de la rencontre (`drops`), ou `undefined` pour une page sans rencontre. */
  drops: readonly string[] | undefined
  /** Vrai si la rencontre donne des runes : mention « Plus les runes indiquées ci-dessus ». */
  hasRunes: boolean
}>()

const names = useNameIndex()
const groups = computed(() =>
  lootGroups(props.drops ?? []).map((g) => ({ title: g.title, items: g.items.map((item) => resolveLootItem(item, names.value)) })),
)
</script>

<template>
  <BossSection title="Butin">
    <template v-if="groups.length > 0">
      <div
        v-for="(group, i) in groups"
        :key="i"
        class="loot-group"
      >
        <h3
          v-if="group.title"
          class="loot-title"
        >
          {{ group.title }}
        </h3>
        <ul class="loot">
          <li
            v-for="item in group.items"
            :key="item.name"
          >
            <RouterLink
              v-if="item.ref"
              :to="entityRoute(item.ref)"
            >
              {{ item.name }}
            </RouterLink>
            <span
              v-else
              class="loot-name"
            >{{ item.name }}</span>
            <span
              v-if="item.kind"
              class="cx-muted loot-kind"
            >{{ KIND_LABELS[item.kind] }}</span>
          </li>
        </ul>
      </div>
      <p
        v-if="hasRunes"
        class="loot-note"
      >
        Plus les runes indiquées ci-dessus.
      </p>
    </template>
    <CxValue
      v-else
      :value="null"
    />
  </BossSection>
</template>

<style scoped>
.loot-group + .loot-group { margin-top: var(--space-3); }
.loot-title { margin-bottom: 6px; color: var(--ink-2); font: 600 12px/16px var(--font-sans); }
.loot { display: grid; gap: 8px; font-size: 13px; }
.loot li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; }
.loot a, .loot-name { color: var(--ink); font-weight: 600; overflow-wrap: anywhere; }
.loot a { color: var(--gold-text); }
.loot-kind { font-size: 12px; }
.loot-note { margin-top: 10px; color: var(--ink-3); font-size: 12px; line-height: 16px; }
</style>
