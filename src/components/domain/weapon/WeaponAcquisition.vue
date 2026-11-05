<!-- Section « Obtention » : méthode, lieu, région et détails de chaque acquisition, avec liens vers les fiches quand un nom se résout. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { WeaponEntry } from '../../../data/types/weapon.ts'
import CxIcon from '../../ds/CxIcon.vue'
import CxValue from '../../ds/CxValue.vue'
import SheetInvaderDrop from '../sheet/SheetInvaderDrop.vue'
import WikiInline from '../WikiInline.vue'
import WikiText from '../WikiText.vue'
import WeaponSection from './WeaponSection.vue'
import { acquisitionViews } from './weaponModel.ts'

/**
 * Obtention de l'arme. La méthode, le lieu et les détails sont des données du wiki (anglais, tels quels) ; un lieu ou un nom cité devient un lien vers sa
 * fiche seulement si c'est exactement le nom d'une entité (`WikiInline`, `WikiText`). La région du wiki est affichée telle quelle ; à défaut, la région déduite
 * par la préparation des données est signalée comme telle. Une valeur absente s'affiche « Non documenté ».
 * Si un PNJ envahisseur lâche l'arme (`derived.invaderDrop`), un bloc renvoie à la fiche du boss.
 */
const props = defineProps<{
  weapon: WeaponEntry
}>()

const items = computed(() => acquisitionViews(props.weapon))
const skip = computed(() => `weapon:${props.weapon.id}` as const)
</script>

<template>
  <WeaponSection title="Obtention">
    <p
      v-if="items.length === 0"
      class="wp-none"
    >
      <CxValue :value="null" /> Le wiki ne donne aucune acquisition pour cette arme.
    </p>
    <ul
      v-else
      class="wp-acq"
    >
      <li
        v-for="a in items"
        :key="a.index"
      >
        <span class="wp-acq-ic"><CxIcon :name="a.icon" /></span>
        <div class="wp-acq-main">
          <span class="wp-acq-title">
            <template v-if="a.method">{{ a.method }}</template>
            <CxValue
              v-else
              :value="null"
            />
          </span>
          <dl class="wp-acq-k">
            <dt>{{ a.starting ? 'Origine' : 'Lieu' }}</dt>
            <dd>
              <WikiInline
                v-if="a.location"
                :text="a.location"
                :preferred-kinds="a.starting ? ['origin'] : ['location', 'boss', 'npc']"
                :skip-ref="skip"
              />
              <CxValue
                v-else
                :value="null"
              />
            </dd>
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
                :skip-ref="skip"
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
      v-if="weapon.derived.invaderDrop.length > 0"
      :drops="weapon.derived.invaderDrop"
    />
  </WeaponSection>
</template>

<style scoped>
.wp-none { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; color: var(--ink-2); font-size: 13px; }
.wp-acq { display: grid; gap: var(--space-4); }
.wp-acq li { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: var(--space-3); align-items: start; }
.wp-acq-ic { display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid var(--line-strong); border-radius: var(--radius-m); color: var(--ink-2); }
.wp-acq-main { min-width: 0; }
.wp-acq-title { color: var(--ink); font-weight: 600; }
.wp-acq-k { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 2px 10px; margin-top: 4px; color: var(--ink-2); font-size: 12px; line-height: 17px; }
.wp-acq-k dt { color: var(--ink-3); }
.wp-acq-k dd { min-width: 0; overflow-wrap: anywhere; }
.wp-acq-k :deep(.wiki-text) { font-size: 12px; line-height: 17px; color: var(--ink-2); }
</style>
