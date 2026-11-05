<!-- Contenu d'une case de catalogue (tableau ou carte) : nom en lien avec badge de source, attaque, scaling, prérequis comparés au profil, amélioration, obtention. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogKey, CatalogRow, ProfileContext } from '../../../catalog/registry.ts'
import { STATUS_BY_DATA_KEY, STATUS_SHORT_LABELS, DAMAGE_SHORT_LABELS, WEAPON_CLASS_ICONS } from '../../../ui/labels.ts'
import type { SourceName } from '../../../ui/labels.ts'
import CxDamageChip from '../../ds/CxDamageChip.vue'
import CxIcon from '../../ds/CxIcon.vue'
import CxReliabilityBadge from '../../ds/CxReliabilityBadge.vue'
import CxRequirementChips from '../../ds/CxRequirementChips.vue'
import CxScalingChips from '../../ds/CxScalingChips.vue'
import CxSourceBadge from '../../ds/CxSourceBadge.vue'
import CxValue from '../../ds/CxValue.vue'
import {
  CATALOG_INFO,
  attackParts,
  attackTitle,
  obtentionParts,
  passiveParts,
  rowRoute,
  skillParts,
  spellRequirements,
  upgradeParts,
  weaponClass,
  weaponRequirements,
  weaponScaling,
} from './catalogModel.ts'
import type { CatalogColumn } from './catalogModel.ts'

/**
 * Case d'un catalogue (design `Catalogue.dc.html`, notes `spec-catalog`). Un seul composant pour tous les catalogues : la colonne dit ce qu'il faut afficher.
 * Le composant ne calcule rien : les prérequis viennent de `weaponRequirements` (moteur, calculs.md « Prérequis comparés au profil »), le reste est lu dans la ligne.
 * Conventions de données : `null` → « Non documenté » (case hachurée en tableau), estimation → badge Estimation avec sa confiance, badge de source juste après le nom.
 * En mode `card`, le texte peut passer à la ligne ; en mode `table`, la case tient sur la hauteur fixe de la ligne (virtualisation).
 */
const props = withDefaults(
  defineProps<{
    catalog: CatalogKey
    column: CatalogColumn
    row: CatalogRow
    /** Attributs et posture du profil actif, pour comparer les prérequis. */
    profile: ProfileContext
    layout?: 'table' | 'card'
  }>(),
  { layout: 'table' },
)

const inTable = computed(() => props.layout === 'table')
const isWeapon = computed(() => CATALOG_INFO[props.catalog].family === 'weapons')
const classIcon = computed(() => (isWeapon.value ? WEAPON_CLASS_ICONS[weaponClass(props.row)] : undefined))
const attack = computed(() => (props.column.cell === 'attack' ? attackParts(props.row) : []))
const scaling = computed(() => (props.column.cell === 'scaling' ? weaponScaling(props.row) : {}))
const hasScaling = computed(() => Object.values(scaling.value).some((g) => g !== null))
const checks = computed(() => {
  if (props.column.cell === 'requirements') return weaponRequirements(props.row, props.profile)
  if (props.column.cell === 'spell-requirements') return spellRequirements(props.row, props.profile)
  return []
})
const skill = computed(() => (props.column.cell === 'skill' ? skillParts(props.row) : null))
const passive = computed(() => (props.column.cell === 'passive' ? passiveParts(props.row) : { statuses: [], texts: [] }))
const upgrade = computed(() => (props.column.cell === 'upgrade' ? upgradeParts(props.row) : null))
const obtention = computed(() => (props.column.cell === 'obtention' ? obtentionParts(props.row) : null))
const text = computed(() => (props.column.cell === 'text' ? (props.column.value?.(props.row) ?? null) : null))
</script>

<template>
  <!-- Nom : lien vers la fiche, badge de source juste après, classe dessous (armes). -->
  <div
    v-if="column.cell === 'name'"
    class="cat-name"
  >
    <span class="cat-name-line">
      <RouterLink
        class="cx-cell-name"
        :to="rowRoute(catalog, row)"
      >{{ row.derived.displayName }}</RouterLink>
      <CxSourceBadge :source="row.source as SourceName" />
    </span>
    <span
      v-if="isWeapon"
      class="cat-sub"
    >
      <CxIcon
        v-if="classIcon"
        :name="classIcon"
        size="sm"
      />{{ weaponClass(row) }}
    </span>
  </div>

  <!-- Attaque à +0 : valeurs de base du wiki, un type par puce. -->
  <span
    v-else-if="column.cell === 'attack'"
    class="cat-chips"
  >
    <CxDamageChip
      v-for="part in attack"
      :key="part.key"
      :damage="part.key"
      :label="DAMAGE_SHORT_LABELS[part.key]"
      :value="part.value"
      format="int"
      :title="attackTitle(part)"
    />
    <span
      v-if="attack.length === 0"
      class="cx-muted"
    >Aucune</span>
  </span>

  <span
    v-else-if="column.cell === 'scaling'"
    class="cat-chips"
  >
    <CxScalingChips
      v-if="hasScaling"
      :scaling="scaling"
    />
    <span
      v-else
      class="cx-muted"
    >Aucun</span>
  </span>

  <CxRequirementChips
    v-else-if="column.cell === 'requirements' || column.cell === 'spell-requirements'"
    :checks="checks"
  />

  <span
    v-else-if="skill"
    class="cat-two"
  >
    <template v-if="skill.name !== null">
      <b class="cat-clip">{{ skill.name }}</b>
      <span class="cx-muted">{{ skill.type }}</span>
    </template>
    <CxValue
      v-else
      :value="null"
      :cell="inTable"
    />
  </span>

  <span
    v-else-if="column.cell === 'passive'"
    class="cat-chips"
  >
    <CxDamageChip
      v-for="s in passive.statuses"
      :key="s.key"
      :status="s.key"
      :label="STATUS_SHORT_LABELS[STATUS_BY_DATA_KEY[s.key]]"
      :value="s.value"
      format="int"
    />
    <span
      v-for="t in passive.texts"
      :key="t"
      class="cat-clip"
      :title="t"
    >{{ t }}</span>
    <span
      v-if="passive.statuses.length === 0 && passive.texts.length === 0"
      class="cx-muted"
    >Aucun</span>
  </span>

  <!-- Amélioration : pierres et niveau maximal, puis badge Wiki, Wiki (déduit) ou Estimation avec sa confiance. -->
  <span
    v-else-if="upgrade"
    class="cat-two"
  >
    <template v-if="upgrade.text !== null">
      <span
        class="cat-nowrap"
        :title="upgrade.text"
      >{{ inTable ? upgrade.short : upgrade.text }}</span>
      <CxReliabilityBadge
        v-if="upgrade.kind"
        :kind="upgrade.kind"
        :confidence="upgrade.confidence"
        :tip="upgrade.tip"
      />
    </template>
    <CxValue
      v-else
      :value="null"
      :cell="inTable"
    />
  </span>

  <span
    v-else-if="obtention"
    class="cat-two"
  >
    <template v-if="obtention.regions !== null || obtention.how !== null">
      <span
        v-if="obtention.regions !== null"
        class="cat-clip"
        :title="obtention.regions"
      >{{ obtention.regions }}</span>
      <span
        v-if="obtention.how !== null"
        class="cat-clip cx-muted"
        :title="obtention.how"
      >{{ obtention.how }}</span>
    </template>
    <CxValue
      v-else
      :value="null"
      :cell="inTable"
    />
  </span>

  <!-- Texte long du wiki (effet) : une ligne coupée en tableau, complet en carte ; l'info-bulle le donne en entier. -->
  <span
    v-else-if="column.cell === 'text'"
    :class="inTable ? 'cat-clip cat-wide' : undefined"
    :title="text === null ? undefined : String(text)"
  >
    <template v-if="text !== null">{{ text }}</template>
    <CxValue
      v-else
      :value="null"
      :cell="inTable"
    />
  </span>

  <CxValue
    v-else
    :value="column.value ? (column.value(row) ?? null) : null"
    :format="column.format"
    :digits="column.digits"
    :cell="inTable"
    :why="false"
  />
</template>

<style>
.cat-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cat-name-line { display: inline-flex; align-items: center; gap: var(--space-2); }
.cat-sub { display: inline-flex; align-items: center; gap: 6px; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.cat-chips { display: inline-flex; flex-wrap: nowrap; align-items: center; gap: var(--space-1); vertical-align: middle; }
.cat-two { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-width: 0; font-size: 12px; line-height: 16px; }
/* Scaling et prérequis passent sur deux lignes au plus (4 puces au maximum dans les données) : la hauteur de ligne est fixe (virtualisation). Largeurs fixes : sans elles, un tableau plus étroit que son contenu réduit les colonnes à une puce de large. */
.cat-clip { display: block; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cat-wide { max-width: 320px; }
.cat-nowrap { white-space: nowrap; }
.cx-tbl .cx-scl-list { flex-wrap: wrap; width: 108px; }
.cx-tbl .cx-req-list { flex-wrap: wrap; width: 262px; }
.cat-card .cat-chips { flex-wrap: wrap; }
.cat-card .cat-clip, .cat-card .cat-nowrap { max-width: none; overflow: visible; white-space: normal; }
</style>
