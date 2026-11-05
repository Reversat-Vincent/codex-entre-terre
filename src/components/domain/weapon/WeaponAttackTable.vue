<!-- Section « Attaque et garde » : valeurs du wiki à +0 et, à côté, colonne Calculé (niveau choisi, profil actif, une ou deux mains), absorption en garde. -->
<script setup lang="ts">
import { computed } from 'vue'
import { DAMAGE_KEYS } from '../../../data/keys.ts'
import type { DamageKey } from '../../../data/keys.ts'
import type { WeaponEntry } from '../../../data/types/weapon.ts'
import type { AttackPowerResult, AttackTypeBreakdown } from '../../../engine/attackPower.ts'
import type { TwoHandMode } from '../../../engine/requirements.ts'
import type { Hands } from '../../../engine/types.ts'
import { limitText } from '../../../ui/explainText.ts'
import { DAMAGE_ICONS, DAMAGE_LABELS } from '../../../ui/labels.ts'
import CxIcon from '../../ds/CxIcon.vue'
import CxNote from '../../ds/CxNote.vue'
import CxReliabilityBadge from '../../ds/CxReliabilityBadge.vue'
import CxSelect from '../../ds/CxSelect.vue'
import CxValue from '../../ds/CxValue.vue'
import CxWhyPanel from '../../ds/CxWhyPanel.vue'
import WeaponSection from './WeaponSection.vue'

/**
 * « Attaque et garde » (design FicheArme, note `spec-weapon`) : la colonne « Attaque +0 » est la valeur de base du wiki ; la colonne « À +N avec votre profil »
 * est la valeur calculée par le moteur (`attackPower`, calculs.md « Puissance d'attaque calculée (Estimation) »), à côté de la base, jamais à sa place.
 * Le composant ne calcule rien : il range le résultat du moteur par type de dégâts, traduit ses limites (`limitText`) et affiche « Non documenté »
 * quand le moteur répond « non calculable » (aucune valeur n'est inventée).
 * Un prérequis non atteint est dit en toutes lettres : valeur réduite de 40 %, sans bonus de scaling (calculs.md, point 5).
 */
const props = defineProps<{
  weapon: WeaponEntry
  /** Résultat du moteur pour le niveau, l'affinité, les attributs du profil et le maniement courants. */
  attack: AttackPowerResult
  /** Niveau du calcul. */
  level: number
  /** Maniement transmis au moteur. */
  hands: Hands
  /** Maniement à deux mains de l'arme (message « se manie toujours à deux mains »). */
  twoHandMode: TwoHandMode
  /** Affinités documentées : un choix est proposé quand il y en a plusieurs. */
  affinities: readonly string[]
  /** Faux sans tableau d'amélioration : le calcul est limité à +0. */
  hasTable: boolean
}>()

/** Affinité du calcul. */
const affinity = defineModel<string>('affinity', { required: true })

/** Raison de l'absence de valeur calculée, par code du moteur (`AttackUnavailableCode`). */
const UNAVAILABLE_TEXTS: Readonly<Record<string, string>> = {
  'level-out-of-range': "Ce niveau est hors des bornes de l'arme : rien n'est calculé.",
  'affinity-undocumented': "Le wiki ne donne pas de tableau d'amélioration pour cette affinité : seule la base à +0 en Standard est calculable.",
  'level-undocumented': "Le tableau du wiki n'encadre pas ce niveau par deux niveaux documentés : la base n'est pas interpolée.",
  'published-value-missing': 'Le wiki ne publie pas la valeur à ce niveau.',
}

/** Limites du moteur qui méritent d'être lues sans ouvrir « Pourquoi ? » (les autres, génériques, y restent). */
const VISIBLE_LIMITS: ReadonlySet<string> = new Set([
  'scaling-coef-missing',
  'elemental-scaling-undocumented',
  'requirement-effect-undocumented',
  'penalty-exception',
  'attack-type-missing',
  'attack-value-unparsed',
  'base-interpolated',
  'table-inconsistent',
  'infobox-base',
  'two-hand-no-stance',
  'two-hand-always',
  'scaling-missing-at-level',
])

const calc = computed(() => ('unavailable' in props.attack ? null : props.attack))
const breakdown = computed(() => calc.value?.value ?? null)
const unavailableText = computed(() =>
  'unavailable' in props.attack ? (UNAVAILABLE_TEXTS[props.attack.unavailable] ?? 'Non calculable.') : null,
)
const penaltyNotes = computed(() => (calc.value?.explanation.limits ?? []).filter((l) => l.code === 'requirement-not-met').map((l) => limitText(l.code, l.params)))
const otherNotes = computed(() => (calc.value?.explanation.limits ?? []).filter((l) => VISIBLE_LIMITS.has(l.code)).map((l) => limitText(l.code, l.params)))
const affinityOptions = computed(() => props.affinities.map((a) => ({ value: a, label: a })))

/** Ligne du tableau : valeur du wiki, détail calculé, absorption en garde. */
interface Row {
  type: DamageKey
  label: string
  icon: string
  base: number
  calc: AttackTypeBreakdown | null
  guard: number | null
}

const rows = computed((): Row[] =>
  DAMAGE_KEYS.map((type) => ({
    type,
    label: DAMAGE_LABELS[type],
    // Le total physique n'a pas d'icône propre dans le sprite : celle du type standard (design FicheArme).
    icon: DAMAGE_ICONS[type] ?? 'd-standard',
    base: props.weapon.attack_power[type],
    calc: breakdown.value?.types.find((t) => t.type === type) ?? null,
    guard: props.weapon.guarded_damage_negation[type],
  })),
)

/** Mention courte sous une valeur calculée dont le bonus ou la base est limité. */
function tag(c: AttackTypeBreakdown | null): { text: string; warn: boolean } | null {
  if (c === null) return null
  switch (c.status) {
    case 'penalty':
      return { text: 'Prérequis non atteint : −40 %, sans bonus', warn: true }
    case 'no-coef':
      return { text: 'Base seule : bonus non calculable', warn: false }
    case 'undocumented':
      return { text: 'Base seule : scaling non documenté', warn: false }
    case 'exception':
      return { text: 'Base seule : exception du wiki', warn: false }
    default:
      return null
  }
}

const handsText = computed(() => {
  if (props.twoHandMode === 'always') return 'toujours à deux mains'
  return props.hands === 'two' ? 'deux mains' : 'une main'
})
</script>

<template>
  <WeaponSection
    title="Attaque et garde"
    subtitle="Valeurs de base à +0 du wiki ; la colonne Calculé suit le niveau choisi sous le graphique et le maniement"
  >
    <template #aside>
      <CxReliabilityBadge kind="wiki" />
    </template>

    <div
      v-if="affinities.length > 1"
      class="wp-calc-ctl"
    >
      <label
        class="cx-label"
        for="wp-calc-affinity"
      >Affinité du calcul</label>
      <CxSelect
        id="wp-calc-affinity"
        v-model="affinity"
        :options="affinityOptions"
      />
    </div>

    <div
      class="wp-table-wrap"
      role="region"
      aria-label="Attaque et absorption en garde"
      tabindex="0"
    >
      <table class="wp-table">
        <thead>
          <tr>
            <th scope="col">
              Type de dégâts
            </th>
            <th
              scope="col"
              class="num"
            >
              Attaque +0
            </th>
            <th
              scope="col"
              class="num"
            >
              <span class="wp-th-calc">À +{{ level }} avec votre profil
                <CxReliabilityBadge kind="calculated" />
              </span>
            </th>
            <th
              scope="col"
              class="num"
            >
              Absorption en garde
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in rows"
            :key="r.type"
          >
            <th scope="row">
              <span class="wp-type">
                <span
                  class="wp-type-ic"
                  :style="{ color: `var(--dmg-${r.type === 'physical' ? 'standard' : r.type})` }"
                ><CxIcon
                  :name="r.icon"
                  size="sm"
                /></span>{{ r.label }}
              </span>
            </th>
            <td
              class="num"
              :class="{ 'wp-zero': r.base === 0 }"
            >
              <CxValue :value="r.base" />
            </td>
            <td class="num">
              <template v-if="calc === null">
                <CxValue
                  :value="null"
                  cell
                />
              </template>
              <template v-else-if="r.base === 0">
                <span class="wp-zero cx-num">0</span>
              </template>
              <template v-else>
                <CxValue
                  v-if="r.calc?.value === null || r.calc === null"
                  :value="null"
                  cell
                />
                <span
                  v-else
                  class="cx-num wp-calc"
                >{{ r.calc.value }}</span>
                <span
                  v-if="tag(r.calc)"
                  class="wp-tag"
                  :class="{ 'is-warn': tag(r.calc)?.warn }"
                >
                  <CxIcon
                    :name="tag(r.calc)?.warn ? 'alert' : 'info'"
                    size="xs"
                  />{{ tag(r.calc)?.text }}
                </span>
              </template>
            </td>
            <td class="num">
              <CxValue
                :value="r.guard"
                format="percent"
                cell
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p
      v-if="calc !== null && breakdown !== null"
      class="wp-total"
    >
      <CxIcon
        name="calc"
        size="sm"
      />
      Affinité {{ breakdown.affinity }}, niveau +{{ breakdown.level }}, {{ handsText }}.
      <template v-if="breakdown.total !== null">
        Total calculé : <b class="cx-num wp-calc">{{ breakdown.total }}</b>{{ breakdown.partial ? ' (base seule pour certains types)' : '' }}.
      </template>
      <CxReliabilityBadge
        v-if="calc.estimate"
        kind="estimate"
        :confidence="calc.estimate.confidence"
      />
    </p>

    <CxNote
      v-if="unavailableText"
      tone="partial"
      title="Non calculable."
    >
      {{ unavailableText }}
    </CxNote>
    <CxNote
      v-if="!hasTable"
      tone="partial"
      title="Calcul limité à +0."
    >
      Pas de tableau d'amélioration sur le wiki : seule la base à +0 est calculée.
    </CxNote>
    <CxNote
      v-for="(text, i) in penaltyNotes"
      :key="`p${i}`"
      tone="warn"
      title="Prérequis non atteint."
    >
      {{ text }}
    </CxNote>
    <ul
      v-if="otherNotes.length > 0"
      class="wp-limits"
    >
      <li
        v-for="(text, i) in otherNotes"
        :key="i"
      >
        <CxIcon
          name="info"
          size="sm"
        />{{ text }}
      </li>
    </ul>

    <CxWhyPanel
      v-if="calc"
      :explanation="calc.explanation"
      :estimate="calc.estimate?.confidence ?? null"
      subject="cette attaque calculée"
    />

    <p class="wp-foot">
      <span>Critique <b class="cx-num"><CxValue :value="weapon.attack_power.critical" /></b></span>
      <span>Stabilité de garde <b class="cx-num"><CxValue :value="weapon.guarded_damage_negation.guard_boost" /></b></span>
      <span class="cx-muted">Un 0 signifie « aucun dégât de ce type » sur le wiki ; une valeur absente s'affiche « Non documenté ».</span>
    </p>
  </WeaponSection>
</template>

<style scoped>
.wp-calc-ctl { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
.wp-table-wrap { overflow-x: auto; border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface); }
.wp-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; line-height: 18px; }
.wp-table th, .wp-table td { padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: middle; text-align: left; }
.wp-table thead th { background: var(--surface-raised); border-bottom-color: var(--line-strong); color: var(--ink-2); font: 600 12px/16px var(--font-sans); }
.wp-table tbody th { color: var(--ink); font-weight: 400; }
.wp-table tbody tr:last-child th, .wp-table tbody tr:last-child td { border-bottom: 0; }
.wp-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.wp-th-calc { display: inline-flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 4px 6px; }
@media (max-width: 767px) {
  .wp-table th, .wp-table td { padding: 8px 6px; }
  .wp-type { gap: 6px; }
}
.wp-type { display: inline-flex; align-items: center; gap: 8px; }
.wp-type-ic { display: inline-grid; }
.wp-zero { color: var(--ink-3); }
.wp-calc { color: var(--gold-text); font-weight: 600; }
.wp-tag { display: block; margin-top: 2px; color: var(--ink-3); font-size: 11px; line-height: 14px; }
.wp-tag.is-warn { color: var(--warn); }
.wp-total { color: var(--ink-2); font-size: 12px; line-height: 17px; }
.wp-total .cx-i { margin-right: 4px; color: var(--gold-text); vertical-align: -2px; }
.wp-limits { display: grid; gap: 4px; color: var(--ink-3); font-size: 12px; line-height: 17px; }
.wp-limits li { display: flex; gap: 6px; align-items: flex-start; }
.wp-limits .cx-i { margin-top: 1px; flex: none; }
.wp-foot { display: flex; flex-wrap: wrap; gap: 6px 20px; color: var(--ink-2); font-size: 13px; }
.wp-foot b { color: var(--ink); font-weight: 600; }
</style>
