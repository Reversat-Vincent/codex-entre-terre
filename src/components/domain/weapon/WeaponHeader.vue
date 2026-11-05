<!-- En-tête de la fiche d'arme : nom, badge de source, classe, poids, types d'attaque, et actions (Épingler, Comparer, Voir sur le wiki, Voir sur Fextralife). -->
<script setup lang="ts">
import { computed } from 'vue'
import { fextralifeSearchUrl, wikiUrlOf } from '../../../data/externalLinks.ts'
import type { WeaponEntry } from '../../../data/types/weapon.ts'
import { formatWeight } from '../../../ui/format.ts'
import { WEAPON_CLASS_ICONS } from '../../../ui/labels.ts'
import type { DamageLabelKey, SourceName } from '../../../ui/labels.ts'
import CxButton from '../../ds/CxButton.vue'
import CxDamageChip from '../../ds/CxDamageChip.vue'
import CxEntityName from '../../ds/CxEntityName.vue'
import CxIcon from '../../ds/CxIcon.vue'
import CxValue from '../../ds/CxValue.vue'
import CxWikiLink from '../../ds/CxWikiLink.vue'

/**
 * Tête de fiche : `CxEntityName` en `titre-xl` avec le badge de source, puis classe (icône de classe), poids et types d'attaque, et les actions.
 * Le composant n'a ni store ni accès au stockage : l'état « épinglé » et « dans le comparateur » et les deux actions viennent de la vue.
 * « Voir sur Fextralife » est un simple lien de recherche (aucune requête de l'application, architecture § 10.4).
 */
const props = defineProps<{
  weapon: WeaponEntry
  /** Arme dans Ma liste. */
  pinned: boolean
  /** Arme dans le comparateur. */
  compared: boolean
}>()

const emit = defineEmits<{
  /** Bascule l'épinglage dans Ma liste. */
  pin: []
  /** Bascule la présence dans le comparateur. */
  compare: []
}>()

/** Type d'attaque du wiki vers la clé de type de dégâts ; « None » n'a pas de puce. */
const ATTACK_TYPES: Readonly<Record<string, DamageLabelKey>> = { Slash: 'slash', Pierce: 'pierce', Strike: 'strike', Standard: 'standard' }

const attackTypes = computed(() => props.weapon.attack_type.flatMap((t) => (t in ATTACK_TYPES ? [ATTACK_TYPES[t] as DamageLabelKey] : [])))
const classIcon = computed(() => WEAPON_CLASS_ICONS[props.weapon.category])
const wikiUrl = computed(() => wikiUrlOf(props.weapon))
</script>

<template>
  <header class="wp-head">
    <CxEntityName
      :name="weapon.name"
      :source="weapon.source as SourceName"
      size="xl"
      as="h1"
    >
      <template #meta>
        <span class="wp-meta">
          <CxIcon
            v-if="classIcon"
            :name="classIcon"
            size="sm"
          />{{ weapon.category }}
        </span>
        <span class="wp-meta">
          <CxIcon
            name="weight"
            size="sm"
          />Poids <b class="cx-num">{{ formatWeight(weapon.weight) }}</b>
        </span>
        <span class="wp-meta">
          Types d'attaque
          <template v-if="attackTypes.length > 0">
            <CxDamageChip
              v-for="t in attackTypes"
              :key="t"
              :damage="t"
            />
          </template>
          <CxValue
            v-else
            :value="null"
          />
        </span>
      </template>
    </CxEntityName>
    <div class="wp-actions">
      <CxButton
        icon="pin"
        :pressed="pinned"
        @click="emit('pin')"
      >
        {{ pinned ? 'Dans Ma liste' : 'Épingler dans Ma liste' }}
      </CxButton>
      <CxButton
        icon="compare"
        :pressed="compared"
        @click="emit('compare')"
      >
        {{ compared ? 'Dans le comparateur' : 'Comparer' }}
      </CxButton>
      <CxWikiLink :href="wikiUrl" />
      <CxButton
        variant="ghost"
        icon="ext"
        :href="fextralifeSearchUrl(weapon.name)"
        external
      >
        Voir sur Fextralife<span class="cx-sr"> (s'ouvre dans un nouvel onglet)</span>
      </CxButton>
    </div>
  </header>
</template>

<style scoped>
.wp-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-4); padding-bottom: var(--space-4); border-bottom: 1px solid var(--line); }
.wp-meta { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 13px; }
.wp-meta b { color: var(--ink); font-weight: 600; }
.wp-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
@media (max-width: 767px) {
  .wp-head :deep(.titre-xl) { font-size: 32px; line-height: 36px; }
}
</style>
