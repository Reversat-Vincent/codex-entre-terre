<!-- Détail d'une origine du widget B : attributs face à la cible, statistiques dérivées, équipement de départ, premières armes, priorités de montée de niveau. -->
<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import CxEntityName from '../../components/ds/CxEntityName.vue'
import CxFlag from '../../components/ds/CxFlag.vue'
import CxNote from '../../components/ds/CxNote.vue'
import CxReliabilityBadge from '../../components/ds/CxReliabilityBadge.vue'
import CxValue from '../../components/ds/CxValue.vue'
import CxWhyPanel from '../../components/ds/CxWhyPanel.vue'
import type { DerivedStats } from '../../engine/derivedStats.ts'
import type { ScoredWeapon } from '../../engine/score.ts'
import type { Attributes, Calc } from '../../engine/types.ts'
import { entityRoute } from '../../router/entityRoute.ts'
import { formatInt } from '../../ui/format.ts'
import { ATTRIBUTE_LABELS } from '../../ui/labels.ts'
import OriginAttributeBars from './OriginAttributeBars.vue'
import type { EquipmentGroup, OriginRow } from './useOriginWidget.ts'

/**
 * Détail de l'origine choisie dans le classement (brief § 5.2 B, note `spec-main`). Rien n'est calculé ici : le rang, le niveau final et les
 * points gaspillés viennent de `rankOrigins`, les statistiques dérivées de `derivedStats`, les premières armes de l'étape Début du widget A.
 * Les statistiques de PV, FP, endurance et charge sont « Calculé » avec leur « Pourquoi ? » ; l'équilibre est une donnée du wiki (infobox de l'origine).
 * Les priorités de montée de niveau n'ont pas encore de calcul dans le moteur : la section l'annonce au lieu d'afficher une valeur inventée.
 */
const props = defineProps<{
  /** Origine détaillée, avec son rang. */
  row: OriginRow
  /** Nombre d'origines classées. */
  count: number
  /** Attributs de départ de l'origine. */
  start: Attributes
  /** Attributs du build cible. */
  target: Attributes
  /** Libellé du build cible (« Dextérité / Arcane »), `null` si l'archétype est inconnu. */
  targetLabel: string | null
  /** Statistiques dérivées de l'origine ; `null` tant que les tables ne sont pas lues. */
  derived: Calc<DerivedStats> | null
  /** Équipement de départ. */
  equipment: readonly EquipmentGroup[]
  /** Armes de l'étape Début du widget A. */
  earlyWeapons: readonly ScoredWeapon[]
  /** Les fichiers d'armes sont lus. */
  weaponsLoaded: boolean
  /** Niveau du joueur, `null` s'il n'est pas calculable. */
  playerLevel: number | null
}>()

/** Score total d'une arme, `null` pour une arme « Non classé ». */
function totalOf(w: ScoredWeapon): number | null {
  return w.score.value?.total ?? null
}

const route = computed(() => entityRoute(props.row.ref))
const wastedText = computed(() => {
  const parts = Object.entries(props.row.rank.wastedBy).map(([k, n]) => `${ATTRIBUTE_LABELS[k as keyof typeof ATTRIBUTE_LABELS].abbr} ${n}`)
  return parts.length === 0 ? 'aucun point gaspillé' : `${props.row.rank.wastedPoints} point${props.row.rank.wastedPoints > 1 ? 's' : ''} gaspillé${props.row.rank.wastedPoints > 1 ? 's' : ''} (${parts.join(', ')})`
})
const stats = computed(() => [
  { key: 'hp', label: 'PV', value: props.derived?.value?.hp ?? null, format: 'int' as const },
  { key: 'fp', label: 'FP', value: props.derived?.value?.fp ?? null, format: 'int' as const },
  { key: 'stamina', label: 'Endurance', value: props.derived?.value?.stamina ?? null, format: 'int' as const },
  { key: 'equipLoad', label: 'Charge', value: props.derived?.value?.equipLoad ?? null, format: 'decimal' as const },
])
</script>

<template>
  <div class="cx-od">
    <div class="cx-od-head">
      <CxEntityName
        :name="row.origin.name"
        :source="row.origin.source"
        as="h3"
      >
        <template #name>
          <RouterLink
            :to="route"
            class="cx-od-link"
          >
            {{ row.origin.name }}
          </RouterLink>
        </template>
      </CxEntityName>
      <span class="cx-muted">Niveau de départ {{ formatInt(row.origin.level) }}, rang {{ row.rank.rank }} sur {{ count }}</span>
    </div>

    <CxNote
      tone="calc"
      class="cx-od-explain"
    >
      Niveau pour la cible {{ formatInt(row.rank.finalLevel) }}, {{ wastedText }}.
      Adéquation précoce {{ formatInt(row.rank.earlyFit) }}.
    </CxNote>

    <section class="cx-od-sec">
      <h4 class="cx-label">
        Attributs de départ et build cible
      </h4>
      <OriginAttributeBars
        :start="start"
        :target="target"
        :wasted-by="row.rank.wastedBy"
      />
      <div class="cx-legend">
        <span><span
          class="cx-legend-key"
          style="background: var(--ink-3)"
        />Départ</span>
        <span><span
          class="cx-legend-key"
          style="width: 3px; height: 12px; vertical-align: -2px; background: var(--gold)"
        />Cible{{ targetLabel ? ` ${targetLabel}` : '' }}</span>
        <span><span class="cx-swatch cx-od-waste-sw" /> Points gaspillés</span>
      </div>
    </section>

    <section class="cx-od-sec">
      <h4 class="cx-label">
        Statistiques dérivées au départ
        <CxReliabilityBadge kind="calculated" />
      </h4>
      <div class="cx-od-stats">
        <div
          v-for="s in stats"
          :key="s.key"
          class="cx-od-stat"
        >
          <span>{{ s.label }}</span>
          <b><CxValue
            :value="s.value"
            :format="s.format"
            :digits="1"
          /></b>
        </div>
        <div class="cx-od-stat">
          <span>Équilibre</span>
          <b><CxValue
            :value="row.origin.base_stats.poise"
            format="decimal"
          /></b>
        </div>
      </div>
      <CxWhyPanel
        v-if="derived"
        :explanation="derived.explanation"
        :subject="`les statistiques de ${row.origin.name}`"
      />
    </section>

    <div class="cx-od-cols">
      <section class="cx-od-sec">
        <h4 class="cx-label">
          Équipement de départ
        </h4>
        <p
          v-if="equipment.length === 0"
          class="cx-muted"
        >
          Aucun équipement de départ n'est listé.
        </p>
        <ul
          v-else
          class="cx-od-list"
        >
          <template
            v-for="group in equipment"
            :key="group.key"
          >
            <li
              v-for="item in group.items"
              :key="`${group.key}-${item.name}`"
            >
              <span class="cx-od-kind">{{ group.label }}</span>
              <span>{{ item.name }}</span>
              <CxFlag
                v-if="item.recommended"
                icon="check"
                label="Recommandée"
                title="Arme recommandée par le widget A"
              />
            </li>
          </template>
        </ul>
      </section>

      <section class="cx-od-sec">
        <h4 class="cx-label">
          Premières armes recommandées
        </h4>
        <p
          v-if="!weaponsLoaded"
          class="cx-muted"
        >
          Les armes sont en cours de chargement.
        </p>
        <p
          v-else-if="earlyWeapons.length === 0"
          class="cx-muted"
        >
          Aucune arme ne correspond à vos critères à l'étape Début.
        </p>
        <ul
          v-else
          class="cx-od-list"
        >
          <li
            v-for="w in earlyWeapons"
            :key="w.candidate.ref"
          >
            <RouterLink :to="entityRoute(w.candidate.ref)">
              {{ w.candidate.weapon.name }}
            </RouterLink>
            <span class="cx-muted">{{ w.candidate.weapon.category }}</span>
            <span class="cx-od-score">
              <CxValue
                :value="totalOf(w)"
                :estimate="w.score.estimate?.confidence ?? null"
              />
              <span
                v-if="totalOf(w) !== null"
                class="cx-sr"
              > sur 100</span>
            </span>
          </li>
        </ul>
        <span class="cx-od-hint">Étape Début du widget A.</span>
      </section>
    </div>

    <section class="cx-od-sec">
      <h4 class="cx-label">
        {{ playerLevel === null ? 'Priorités de montée de niveau' : `Priorités de montée de niveau, depuis votre niveau ${formatInt(playerLevel)}` }}
      </h4>
      <p class="cx-muted cx-od-hint">
        Cette section n'est pas encore disponible : le calcul des priorités de montée de niveau n'est pas encore écrit dans le moteur.
      </p>
    </section>
  </div>
</template>

<style>
.cx-od { display: grid; gap: var(--space-4); min-width: 0; }
.cx-od-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: var(--space-1) var(--space-3); }
.cx-od-link { color: inherit; text-decoration: none; }
.cx-od-link:hover { color: var(--gold-text); text-decoration: underline; }
.cx-od-sec { display: grid; gap: var(--space-2); min-width: 0; align-content: start; }
.cx-od-sec h4 { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.cx-od-waste-sw { background: repeating-linear-gradient(135deg, var(--warn) 0 2px, transparent 2px 5px); }
.cx-od-stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--space-2); }
.cx-od-stat { display: grid; gap: 2px; padding: var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-s); background: var(--surface-raised); }
.cx-od-stat span { color: var(--ink-3); font-size: 11px; line-height: 14px; }
.cx-od-stat b { color: var(--ink); font: 600 17px/20px var(--font-sans); font-variant-numeric: tabular-nums; }
.cx-od-cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
.cx-od-list { display: grid; gap: 6px; }
.cx-od-list li { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 13px; line-height: 18px; overflow-wrap: anywhere; }
.cx-od-kind { min-width: 52px; color: var(--ink-3); font-size: 11px; line-height: 14px; }
.cx-od-score { margin-left: auto; color: var(--gold-text); font: 600 14px/18px var(--font-sans); font-variant-numeric: tabular-nums; }
.cx-od-hint { color: var(--ink-3); font-size: 11px; line-height: 15px; }
@media (max-width: 767px) { .cx-od-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); } .cx-od-cols { grid-template-columns: minmax(0, 1fr); } }
</style>
