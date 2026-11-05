<!-- Contenu de la fiche d'une arme chargée : en-tête, alertes, sections de données et encarts d'analyse pour le profil. -->
<script setup lang="ts">
import { computed } from 'vue'
import { DATASETS } from '../../../data/datasets.ts'
import { wikiUrlOf } from '../../../data/externalLinks.ts'
import type { OriginEntry } from '../../../data/types/origins.ts'
import type { WeaponEntry } from '../../../data/types/weapon.ts'
import type { WeaponFileKey } from '../../../engine/types.ts'
import { useAnalysisStore } from '../../../stores/analysis.ts'
import { useCompareStore } from '../../../stores/compare.ts'
import { useCriteriaStore } from '../../../stores/criteria.ts'
import { useDataStore } from '../../../stores/data.ts'
import { usePinsStore } from '../../../stores/pins.ts'
import { useToastsStore } from '../../../stores/toasts.ts'
import { STAGE_LABELS } from '../../../ui/labels.ts'
import { STYLE_LABELS } from '../../criteria/criteriaModel.ts'
import CxIcon from '../../ds/CxIcon.vue'
import WeaponAcquisition from './WeaponAcquisition.vue'
import WeaponAlerts from './WeaponAlerts.vue'
import WeaponAttackTable from './WeaponAttackTable.vue'
import WeaponHeader from './WeaponHeader.vue'
import WeaponNotes from './WeaponNotes.vue'
import WeaponQuality from './WeaponQuality.vue'
import WeaponScaling from './WeaponScaling.vue'
import WeaponScorePanel from './WeaponScorePanel.vue'
import WeaponSimilar from './WeaponSimilar.vue'
import type { SimilarWeapon } from './WeaponSimilar.vue'
import WeaponSkill from './WeaponSkill.vue'
import WeaponUpgrade from './WeaponUpgrade.vue'
import WeaponUpgradeChart from './WeaponUpgradeChart.vue'
import { bySimilarOrder, qualityRows, weaponAlerts } from './weaponModel.ts'
import type { QualityRow } from './weaponModel.ts'
import { useWeaponSheet } from './useWeaponSheet.ts'

/**
 * Fiche d'une arme (`/armes/:id`, design FicheArme, note `spec-weapon`).
 * Colonne principale : attaque et garde, scaling et prérequis, compétence, amélioration avec son graphique, obtention, notes et patchs ;
 * colonne latérale : score pour le profil avec « Pourquoi ? », qualité des données, armes voisines de la même classe.
 * Les valeurs calculées viennent du moteur (`useWeaponSheet`, store d'analyse) ; ce composant range les résultats et gère l'épinglage et le comparateur.
 * Un composant par arme affichée : la vue lui donne `:key` = id pour que le niveau, l'affinité et le maniement repartent de zéro d'une fiche à l'autre.
 */
const props = defineProps<{
  weapon: WeaponEntry
  /** Fichier de données de l'arme. */
  file: WeaponFileKey
}>()

const data = useDataStore()
const analysis = useAnalysisStore()
const criteria = useCriteriaStore()
const pins = usePinsStore()
const compare = useCompareStore()
const toasts = useToastsStore()

const sheet = useWeaponSheet(props.weapon, props.file)

const family = computed(() => DATASETS[props.file])
const familyQuery = computed(() => ({ [family.value.routes.query?.name ?? 'famille']: family.value.routes.query?.value ?? 'melee' }))
const wikiUrl = computed(() => wikiUrlOf(props.weapon))
const alerts = computed(() => weaponAlerts(props.weapon, sheet.tables.value))
const retrieved = computed(() => data.dataset(props.file)?.meta.retrieved ?? null)

// Score : les fichiers dont il dépend sont demandés par la vue ; tant qu'ils manquent, l'encart reste en chargement.
const scoreStatus = computed(() => data.statusOf(['origins', 'bosses', 'tables']))
const score = computed(() => (scoreStatus.value === 'ready' ? sheet.score.value : null))

/** Description du profil actif pour les sous-titres. */
const profile = computed(() => {
  const name = sheet.profileName.value
  const origin = analysis.effectiveOrigin === null ? null : (data.entity(analysis.effectiveOrigin) as OriginEntry | null)
  const level = analysis.level.value
  const stage = analysis.stage.value
  const parts = [
    ...(origin ? [origin.name] : []),
    ...(level === null ? [] : [`niveau ${level}`]),
    ...(stage === null ? [] : [`étape ${STAGE_LABELS[stage]}`]),
  ]
  return `${name === null ? 'Critères en cours' : `« ${name} »`}${parts.length > 0 ? `, ${parts.join(', ')}` : ''}`
})
const profileLabel = computed(() => (sheet.profileName.value === null ? 'des critères en cours' : `« ${sheet.profileName.value} »`))

const quality = computed((): QualityRow[] => {
  const rows = qualityRows(props.weapon, sheet.tables.value)
  if (scoreStatus.value === 'ready' && sheet.score.value !== null) {
    const s = sheet.score.value
    rows.push({
      id: 'score',
      label: 'Score pour votre profil',
      kind: 'calculated',
      tip: "Calculé par l'application",
      ...(s.estimate ? { confidence: s.estimate.confidence } : {}),
    })
  }
  return rows
})

/** Armes de la même classe : les mieux notées pour le profil d'abord, au plus six. */
const similar = computed((): SimilarWeapon[] => {
  const entries = data.dataset(props.file)?.entries ?? []
  const scores = scoreStatus.value === 'ready' ? new Map(analysis.scored.map((s) => [s.candidate.ref, s.score.value?.total ?? null])) : null
  return entries
    .filter((e) => e.category === props.weapon.category && e.id !== props.weapon.id)
    .map((e): SimilarWeapon => ({
      ref: `weapon:${e.id}`,
      name: e.derived.displayName,
      source: e.source,
      score: scores === null ? undefined : scores.get(`weapon:${e.id}`),
    }))
    .sort(bySimilarOrder)
    .slice(0, 6)
})

/** Bascule le comparateur ; un refus (liste pleine, genre différent) est dit dans une notification. */
function toggleCompare(): void {
  const result = compare.toggle(sheet.ref)
  if (!result.ok) toasts.push({ message: result.message, kind: 'warning' })
}
</script>

<template>
  <article class="wp-page">
    <nav
      class="wp-crumb"
      aria-label="Fil d'Ariane"
    >
      <RouterLink :to="{ name: 'explore' }">
        Explorer
      </RouterLink>
      <CxIcon
        name="chev-r"
        size="xs"
      />
      <RouterLink :to="{ name: 'weapons', query: familyQuery }">
        {{ family.label }}
      </RouterLink>
      <CxIcon
        name="chev-r"
        size="xs"
      />
      <span>{{ weapon.category }}</span>
      <CxIcon
        name="chev-r"
        size="xs"
      />
      <span aria-current="page">{{ weapon.name }}</span>
    </nav>

    <WeaponHeader
      :weapon="weapon"
      :pinned="pins.isPinned(sheet.ref)"
      :compared="compare.has(sheet.ref)"
      @pin="pins.toggle(sheet.ref)"
      @compare="toggleCompare"
    />

    <WeaponAlerts :alerts="alerts" />

    <div class="wp-cols">
      <div class="wp-main">
        <WeaponAttackTable
          v-model:affinity="sheet.affinity.value"
          :weapon="weapon"
          :attack="sheet.attack.value"
          :level="sheet.level.value"
          :hands="sheet.engineHands.value"
          :two-hand-mode="sheet.twoHandMode"
          :affinities="sheet.tables.value.affinities"
          :has-table="sheet.tables.value.mode !== 'none'"
        />
        <WeaponScaling
          v-model:hands="sheet.hands.value"
          :weapon="weapon"
          :requirements="sheet.requirements.value"
          :attrs="sheet.attrs.value"
          :effective-strength="sheet.effectiveStrength.value"
          :two-hand-mode="sheet.twoHandMode"
          :profile-label="profileLabel"
        />
        <WeaponSkill :weapon="weapon" />
        <WeaponUpgrade
          :weapon="weapon"
          :plan="sheet.plan.value"
        >
          <WeaponUpgradeChart
            v-model:level="sheet.level.value"
            v-model:slots="sheet.slots.value"
            :weapon="weapon"
            :tables="sheet.tables.value"
            :level-max="sheet.levelMax.value"
            :wiki-url="wikiUrl"
            @toggle="sheet.toggleAffinity"
          />
        </WeaponUpgrade>
        <WeaponAcquisition :weapon="weapon" />
        <WeaponNotes :weapon="weapon" />
      </div>

      <aside
        class="wp-side"
        aria-label="Analyse pour votre profil"
      >
        <WeaponScorePanel
          :score="score"
          :status="scoreStatus"
          :profile="profile"
          :style-label="STYLE_LABELS[criteria.criteria.style.mode]"
        />
        <WeaponQuality
          :rows="quality"
          :page-name="weapon.wiki_page"
          :retrieved="retrieved"
        />
        <WeaponSimilar
          :category="weapon.category"
          :weapons="similar"
        />
      </aside>
    </div>
  </article>
</template>

<style scoped>
.wp-page { display: grid; gap: var(--space-4); align-content: start; min-width: 0; max-width: 1440px; padding: var(--space-5) var(--space-6) var(--space-6); }
.wp-crumb { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.wp-cols { display: grid; gap: var(--space-5); align-items: start; min-width: 0; }
.wp-main, .wp-side { display: grid; gap: var(--space-4); min-width: 0; }
@media (min-width: 1100px) {
  .wp-cols { grid-template-columns: minmax(0, 1fr) 340px; }
  .wp-side { position: sticky; top: calc(var(--size-topbar) + var(--space-4)); }
}
@media (max-width: 767px) {
  .wp-page { padding: var(--space-4); }
}
</style>
