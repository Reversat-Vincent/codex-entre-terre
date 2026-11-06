<!-- Carte d'une entité en mode grille : nom, badge de source, repères, lignes de la carte et actions (épingler, comparer, voir la fiche). -->
<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogKey, CatalogRow } from '../../../catalog/registry.ts'
import { WEAPON_CLASS_ICONS } from '../../../ui/labels.ts'
import type { SourceName } from '../../../ui/labels.ts'
import CxButton from '../../ds/CxButton.vue'
import CxIcon from '../../ds/CxIcon.vue'
import CxSourceBadge from '../../ds/CxSourceBadge.vue'
import CxValue from '../../ds/CxValue.vue'
import CatalogCell from './CatalogCell.vue'
import { CATALOG_INFO, columnsOf, rowRoute, weaponClass } from './catalogModel.ts'

/**
 * Carte légère d'une entité (design `Catalogue.dc.html`, classes `cx-wcard`). Les lignes viennent des colonnes qui portent `card` (armes : attaque, scaling,
 * prérequis, compétence, passif, amélioration, obtention) ; les autres catalogues montrent leurs premières valeurs simples. Aucun état ici :
 * épingler et comparer sont des événements traités par la grille.
 */
const props = defineProps<{
  catalog: CatalogKey
  row: CatalogRow
  /** L'entité est dans Ma liste. */
  pinned: boolean
  /** L'entité est dans le comparateur. */
  compared: boolean
}>()

const emit = defineEmits<{
  /** Épingler ou retirer l'entité de Ma liste. */
  pin: []
  /** Ajouter l'entité au comparateur, ou l'en retirer. */
  compare: []
}>()

const isWeapon = computed(() => CATALOG_INFO[props.catalog].family === 'weapons')
const columns = computed(() => columnsOf(props.catalog))
const weight = computed(() => columns.value.find((c) => c.id === 'weight'))
const cardColumns = computed(() => columns.value.filter((c) => c.card))
/** Les colonnes sans icône sont des champs de puces ; celles avec icône sont des lignes de texte. */
const fields = computed(() => cardColumns.value.filter((c) => c.card?.icon === undefined))
const lines = computed(() => cardColumns.value.filter((c) => c.card?.icon !== undefined))
/** Repères des catalogues sans carte d'arme : les premières valeurs simples, avec leur libellé. */
const facts = computed(() => (isWeapon.value ? [] : columns.value.filter((c) => c.id !== 'name' && c.value && !c.cell).slice(0, 4)))
const classIcon = computed(() => (isWeapon.value ? WEAPON_CLASS_ICONS[weaponClass(props.row)] : undefined))
const name = computed(() => props.row.derived.displayName)
</script>

<template>
  <article class="cx-wcard cat-card">
    <div class="cx-wcard-head">
      <div>
        <RouterLink
          class="cx-wcard-name"
          :to="rowRoute(catalog, row)"
        >
          {{ name }}
        </RouterLink>
      </div>
      <CxSourceBadge :source="row.source as SourceName" />
    </div>

    <div
      v-if="isWeapon"
      class="cx-wcard-sub"
    >
      <CxIcon
        v-if="classIcon"
        :name="classIcon"
        size="sm"
      />
      <span>{{ weaponClass(row) }}</span>
      <span v-if="weight">
        <CxIcon
          name="weight"
          size="xs"
        />
        <CatalogCell
          :catalog="catalog"
          :column="weight"
          :row="row"
          layout="card"
        />
      </span>
    </div>
    <dl
      v-else-if="facts.length > 0"
      class="cat-facts"
    >
      <div
        v-for="fact in facts"
        :key="fact.id"
      >
        <dt class="cx-muted">
          {{ fact.menuLabel ?? fact.label }}
        </dt>
        <dd>
          <CxValue
            :value="fact.value ? (fact.value(row) ?? null) : null"
            :format="fact.format"
            :digits="fact.digits"
            :why="false"
          />
        </dd>
      </div>
    </dl>

    <div
      v-for="field in fields"
      :key="field.id"
      class="cx-wcard-field"
    >
      <CatalogCell
        :catalog="catalog"
        :column="field"
        :row="row"
        layout="card"
      />
    </div>
    <div
      v-for="line in lines"
      :key="line.id"
      class="cx-wcard-line"
    >
      <CxIcon
        :name="line.card?.icon ?? 'info'"
        size="sm"
      />
      <CatalogCell
        :catalog="catalog"
        :column="line"
        :row="row"
        layout="card"
      />
    </div>

    <div class="cx-wcard-acts">
      <CxButton
        variant="ghost"
        size="sm"
        icon-only
        icon="pin"
        :label="pinned ? `Retirer ${name} de Ma liste` : `Épingler ${name} dans Ma liste`"
        :pressed="pinned"
        @click="emit('pin')"
      />
      <CxButton
        variant="ghost"
        size="sm"
        icon-only
        icon="compare"
        :label="compared ? `Retirer ${name} du comparateur` : `Ajouter ${name} au comparateur`"
        :pressed="compared"
        @click="emit('compare')"
      />
      <RouterLink
        class="cx-btn cx-btn-ghost cx-btn-sm cat-card-open"
        :to="rowRoute(catalog, row)"
      >
        Voir la fiche
      </RouterLink>
    </div>
  </article>
</template>

<style>
/* Styles de la carte (`bundle.css`, `.cx-wcard*`) : `CxWeaponCard` les porte aussi, mais ils ne sont chargés qu'avec lui, et la grille d'un catalogue peut s'afficher sans. */
.cx-wcard { position: relative; display: flex; flex-direction: column; gap: 10px; min-width: 0; padding: var(--space-3); border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface-raised); }
.cx-wcard-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: var(--space-2); }
.cx-wcard-name, .cx a.cx-wcard-name { color: var(--ink); font: 700 18px/22px var(--font-display); text-decoration: none; overflow-wrap: anywhere; }
.cx a.cx-wcard-name:hover { color: var(--gold-text); text-decoration: underline; text-decoration-thickness: 1px; }
.cx-wcard-sub { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 3px; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.cx-wcard-field { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.cx-wcard-line { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 6px; color: var(--ink-2); font-size: 12px; line-height: 16px; }
.cx-wcard-line > .cx-i { margin-top: 1px; color: var(--ink-3); }
.cx-wcard-line > .cx-i + span { flex: 1 1 140px; min-width: 0; }
.cx-wcard-acts { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; margin-top: auto; padding-top: var(--space-2); border-top: 1px solid var(--line); }
.cat-card .cx-wcard-sub > span { display: inline-flex; align-items: center; gap: 4px; }
.cat-card-open { margin-left: auto; }
.cat-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-1) var(--space-3); margin: 0; font-size: 12px; line-height: 16px; }
.cat-facts dt { font-weight: 600; }
.cat-facts dd { margin: 0; color: var(--ink); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.cat-card .cat-two { font-size: inherit; }
/* Mobile : zone de frappe de 44 px (`--size-cible`) autour du texte du lien ; la marge négative annule le remplissage pour que la mise en page ne bouge pas. */
@media (max-width: 767px) { .cx a.cx-wcard-name {  display: inline-block; min-width: var(--size-cible); padding-block: calc((var(--size-cible) - 1lh) / 2); margin-block: calc((var(--size-cible) - 1lh) / -2); } }
</style>
