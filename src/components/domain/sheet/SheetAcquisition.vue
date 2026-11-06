<!-- Section « Obtention » commune : méthode, lieu, région et détails de chaque acquisition, avec liens vers les fiches quand un nom se résout. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { EntityRef } from '../../../data/datasets.ts'
import CxIcon from '../../ds/CxIcon.vue'
import CxValue from '../../ds/CxValue.vue'
import WikiInline from '../WikiInline.vue'
import WikiText from '../WikiText.vue'
import SheetInvaderDrop from './SheetInvaderDrop.vue'
import SheetSection from './SheetSection.vue'
import { acquisitionViews } from './sheetModel.ts'
import type { AcquisitionSource } from './sheetModel.ts'

/**
 * Obtention d'une entrée. La méthode, le lieu et les détails sont des données du wiki (anglais, tels quels) ; un lieu, un PNJ ou un objet cité devient un
 * lien vers sa fiche seulement si c'est exactement le nom d'une entité (`WikiInline`, `WikiText`). La région du wiki est affichée telle quelle ; à défaut,
 * la région déduite par la préparation des données est signalée comme telle. Une valeur absente s'affiche « Non documenté ».
 * Si un PNJ envahisseur lâche cet élément (`derived.invaderDrop`), le bloc « Butin d'un PNJ envahisseur » renvoie à la fiche du boss.
 */
const props = defineProps<{
  entry: AcquisitionSource
  /** Référence de l'entité décrite : jamais liée à elle-même. */
  entityRef: EntityRef
}>()

const items = computed(() => acquisitionViews(props.entry))

/**
 * Acquisition dont seuls les détails portent l'information (ni méthode ni lieu, ex. Golden Seed) : les lignes « Méthode » et « Lieu » vides sont
 * omises, sinon « Non documenté » s'afficherait en tête, au-dessus de détails pourtant documentés.
 * @param a Acquisition affichée.
 * @returns Vrai si la méthode et le lieu manquent alors que des détails existent.
 */
function detailsOnly(a: { method: string | null; location: string | null; details: readonly string[] }): boolean {
  return !a.method && !a.location && a.details.length > 0
}
</script>

<template>
  <SheetSection title="Obtention">
    <p
      v-if="items.length === 0"
      class="sh-none"
    >
      <CxValue :value="null" /> Le wiki ne donne aucune acquisition pour cet élément.
    </p>
    <ul
      v-else
      class="sh-acq"
    >
      <li
        v-for="a in items"
        :key="a.index"
      >
        <span
          class="sh-acq-ic"
          aria-hidden="true"
        ><CxIcon :name="a.icon" /></span>
        <div class="sh-acq-main">
          <span
            v-if="!detailsOnly(a)"
            class="sh-acq-title"
          >
            <template v-if="a.method">{{ a.method }}</template>
            <template v-else>
              <span class="sh-acq-nolabel">Méthode :</span> <CxValue :value="null" />
            </template>
          </span>
          <dl class="sh-acq-k">
            <template v-if="!detailsOnly(a)">
              <dt>{{ a.starting ? 'Origine' : 'Lieu' }}</dt>
              <dd>
                <WikiInline
                  v-if="a.location"
                  :text="a.location"
                  :preferred-kinds="a.starting ? ['origin'] : ['location', 'boss', 'npc']"
                  :skip-ref="entityRef"
                />
                <CxValue
                  v-else
                  :value="null"
                />
              </dd>
            </template>
            <template v-if="a.region">
              <dt>Région</dt>
              <dd>
                {{ a.region }}<span
                  v-if="a.regionDeduced"
                  class="cx-muted"
                > (déduite par le Codex)</span>
              </dd>
            </template>
            <dt>Détails</dt>
            <dd>
              <WikiText
                v-if="a.details.length > 0"
                :lines="a.details"
                mode="list"
                :preferred-kinds="['location', 'boss', 'npc', 'item']"
                :skip-ref="entityRef"
              />
              <CxValue
                v-else
                :value="null"
              />
            </dd>
          </dl>
        </div>
      </li>
    </ul>
    <SheetInvaderDrop
      v-if="entry.derived.invaderDrop.length > 0"
      :drops="entry.derived.invaderDrop"
    />
  </SheetSection>
</template>

<style scoped>
.sh-none { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; color: var(--ink-2); font-size: 13px; }
.sh-acq { display: grid; gap: var(--space-4); }
.sh-acq li { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: var(--space-3); align-items: start; }
.sh-acq-ic { display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid var(--line-strong); border-radius: var(--radius-m); color: var(--ink-2); }
.sh-acq-main { min-width: 0; }
.sh-acq-title { color: var(--ink); font-weight: 600; }
.sh-acq-nolabel { color: var(--ink-3); font-weight: 400; }
.sh-acq-k { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 2px 10px; margin-top: 4px; color: var(--ink-2); font-size: 12px; line-height: 17px; }
.sh-acq-k dt { color: var(--ink-3); }
.sh-acq-k dd { min-width: 0; overflow-wrap: anywhere; }
.sh-acq-k :deep(.wiki-text) { font-size: 12px; line-height: 17px; color: var(--ink-2); }
</style>
