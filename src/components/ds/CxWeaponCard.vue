<!-- Carte d'une arme recommandée : score calculé, prérequis, scaling, compétence, effet passif, amélioration, obtention, drapeaux et actions. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { Explanation } from '../../engine/types.ts'
import type { WeaponScore } from '../../engine/score.ts'
import type { Calc } from '../../engine/types.ts'
import type { WeaponEntry } from '../../data/types/weapon.ts'
import { STATUS_KEYS } from '../../data/keys.ts'
import { formatInt } from '../../ui/format.ts'
import { WEAPON_CLASS_ICONS } from '../../ui/labels.ts'
import type { ReliabilityKey } from '../../ui/labels.ts'
import { NO_SKILL_TYPE, skillTypeLabel } from '../../ui/skillTypes.ts'
import CxButton from './CxButton.vue'
import CxDamageChip from './CxDamageChip.vue'
import CxFlag from './CxFlag.vue'
import CxIcon from './CxIcon.vue'
import CxReliabilityBadge from './CxReliabilityBadge.vue'
import CxRequirementChips from './CxRequirementChips.vue'
import CxScalingChips from './CxScalingChips.vue'
import CxSourceBadge from './CxSourceBadge.vue'
import CxValue from './CxValue.vue'

/**
 * Carte d'une arme recommandée, conçue pour une colonne de 190 à 260 px (README du design system, composant WeaponCard ; widget A).
 * Ordre fixe des lignes : nom et score ; classe, poids, source ; prérequis comparés ; scaling ; compétence ; effet passif ; amélioration avec son badge ;
 * « où l'obtenir » ; drapeaux (Remembrance, achat, butin aléatoire, quête) ; actions.
 * Le composant n'a ni store ni calcul : l'entrée d'arme et son score (`Calc<WeaponScore>`, méthode « Score de recommandation d'une arme » de `calculs.md`)
 * viennent de l'appelant, et chaque action est un événement. Le score est une valeur calculée : `gold-text`, badge Calculé, « Pourquoi ? » à côté.
 * `top` pose `glow-gold` : une seule carte par widget (la recommandation n°1).
 * Un `null` n'est jamais un 0 : arme « Non classé » (score `null`), type d'amélioration absent, obtention absente s'affichent « Non documenté ».
 */
const props = withDefaults(
  defineProps<{
    /** Entrée d'arme de `data/` (nom, classe, poids, scaling, compétence, amélioration, acquisition, drapeaux). */
    weapon: WeaponEntry
    /** Score calculé par le moteur ; sa valeur est `null` pour une arme non évaluée. */
    score: Calc<WeaponScore>
    /** Recommandation n°1 du widget : `glow-gold`. */
    top?: boolean
    /** Arme épinglée à Ma liste : le bouton d'épingle est enfoncé. */
    pinned?: boolean
    /** Adresse de la fiche (le nom devient un lien) ; sans elle, le nom est un bouton qui émet `open`. */
    href?: string
    /** Faux quand aucun profil n'est configuré : les puces de prérequis restent neutres. */
    profileConfigured?: boolean
    /** Arme obtenue par échange de Remembrance, y compris par la table de configuration ; sans valeur, l'indicateur de `acquisition_flags` décide. */
    remembrance?: boolean
    /** Le panneau « Pourquoi ? » de cette carte est ouvert (`aria-expanded` du bouton). */
    whyOpen?: boolean
  }>(),
  { top: false, pinned: false, href: undefined, profileConfigured: true, remembrance: undefined, whyOpen: false },
)

const emit = defineEmits<{
  /** Épingler ou retirer l'arme de Ma liste. */
  pin: []
  /** Ajouter l'arme à la comparaison. */
  compare: []
  /** Ouvrir la fiche de l'arme (nom ou bouton « Voir la fiche »). */
  open: []
  /** Voir les armes proches. */
  alternatives: []
  /** Demander le détail du score : explication à afficher dans le panneau « Pourquoi ? ». */
  why: [explanation: Explanation]
}>()

/** Libellé des matériaux d'amélioration (valeurs de `upgrade.material`). */
const MATERIALS: Readonly<Record<string, string>> = {
  'Smithing Stones': 'Pierres normales',
  'Somber Smithing Stones': 'Pierres sombres',
}

const total = computed(() => props.score.value?.total ?? null)
const classIcon = computed(() => WEAPON_CLASS_ICONS[props.weapon.category])
const checks = computed(() => props.score.value?.requirements ?? [])
const hasScaling = computed(() => Object.values(props.weapon.scaling).some((g) => g !== null))

const skillName = computed(() => props.weapon.skill.name)
const skillType = computed(() => props.weapon.skill.type)

/** Accumulations de statut non nulles, dans l'ordre des données : puces chiffrées de l'effet passif. */
const statuses = computed(() =>
  STATUS_KEYS.flatMap((key) => {
    const v = props.weapon.status_buildup?.[key]
    return v === undefined || v === 0 ? [] : [{ key, value: v }]
  }),
)
/** Effets passifs en texte, seulement quand aucun statut chiffré ne les dit déjà. */
const passiveTexts = computed(() => (statuses.value.length > 0 ? [] : props.weapon.passive_effects))

/** Ligne et badge du type d'amélioration (README : Wiki, Wiki (déduit), Estimation, Non documenté, Incohérence avec sa raison). */
const upgrade = computed(() => {
  const w = props.weapon
  const u = w.derived.upgrade
  if (u.reliability === 'not-upgradeable') return { text: 'Non améliorable', kind: null, confidence: null, tip: undefined }
  const material = u.material === null ? null : (MATERIALS[u.material] ?? u.material)
  const text = material === null ? "Type d'amélioration" : u.maxLevel === null ? material : `${material}, +${u.maxLevel}`
  const incoherent = w.derived.inconsistent.find((i) => i.field === 'upgrade.material')
  if (incoherent) {
    const tip = `Incohérence du wiki sur le matériau : ${incoherent.reason ?? 'pages en désaccord'}. La valeur de la liste « Armaments by Bolstering Material » est retenue.`
    return { text, kind: 'inconsistent' as ReliabilityKey, confidence: null, tip }
  }
  const kind: ReliabilityKey = u.reliability === 'estimate' ? 'estimate' : u.reliability === 'deduced' ? 'deduced' : u.reliability === 'null' ? 'null' : 'wiki'
  const tip = kind === 'estimate' ? (u.basis ?? undefined) : undefined
  return { text, kind, confidence: kind === 'estimate' ? (u.confidence ?? 'medium') : null, tip }
})

/** Première façon d'obtenir l'arme (méthode, lieu, région), telle que dans les données, et le nombre d'autres façons. */
const acquisition = computed(() => {
  const list = props.weapon.acquisition
  const first = list[0]
  if (first === undefined) return null
  const place = [first.location, first.region].filter((x): x is string => x !== null && x !== '')
  return { method: first.method, place: place.join(', '), others: list.length - 1 }
})

const flags = computed(() => {
  const f = props.weapon.acquisition_flags
  return {
    remembrance: props.remembrance ?? f.includes('remembrance_weapon'),
    purchase: f.includes('purchasable'),
    randomDrop: f.includes('random_enemy_drop'),
    quest: f.includes('npc_or_quest_related'),
  }
})
const hasFlags = computed(() => Object.values(flags.value).some(Boolean))
</script>

<template>
  <article
    class="cx-wcard"
    :class="{ 'is-top': top, 'is-pinned': pinned }"
  >
    <div class="cx-wcard-head">
      <div>
        <component
          :is="href ? 'a' : 'button'"
          class="cx-wcard-name"
          :href="href"
          :type="href ? undefined : 'button'"
          @click.prevent="emit('open')"
        >
          {{ weapon.name }}
        </component>
        <div class="cx-wcard-sub">
          <CxIcon
            v-if="classIcon"
            :name="classIcon"
            size="sm"
          />
          <span>{{ weapon.category }}</span>
          <span>
            <CxIcon
              name="weight"
              size="xs"
              label="Poids"
            />
            <CxValue
              :value="weapon.weight"
              format="weight"
            />
          </span>
          <CxSourceBadge :source="weapon.source" />
        </div>
      </div>
      <div
        class="cx-score"
        title="Score de recommandation (Calculé)"
      >
        <template v-if="total !== null">
          <span class="cx-score-num">{{ formatInt(total) }}<span class="cx-sr"> sur 100</span></span>
          <span
            class="cx-score-bar"
            aria-hidden="true"
          ><span :style="{ width: `${total}%` }" /></span>
          <CxReliabilityBadge kind="calculated" />
          <CxReliabilityBadge
            v-if="score.estimate"
            kind="estimate"
            :confidence="score.estimate.confidence"
          />
        </template>
        <template v-else>
          <span class="cx-null">Non classé</span>
          <CxReliabilityBadge kind="null" />
        </template>
      </div>
    </div>

    <div
      v-if="checks.length > 0 || !profileConfigured"
      class="cx-wcard-field"
    >
      <CxRequirementChips
        :checks="checks"
        :profile-configured="profileConfigured"
      />
    </div>
    <div
      v-if="hasScaling"
      class="cx-wcard-field"
    >
      <CxScalingChips :scaling="weapon.scaling" />
    </div>

    <div class="cx-wcard-line">
      <CxIcon
        name="skill"
        size="sm"
      />
      <span>
        <b v-if="skillName !== null">{{ skillName }}</b>
        <CxValue
          v-else-if="skillType !== NO_SKILL_TYPE"
          :value="null"
        />
        {{ ' ' }}<span class="cx-muted">{{ skillTypeLabel(skillType) }}</span>
      </span>
    </div>

    <div
      v-if="statuses.length > 0"
      class="cx-wcard-line"
    >
      <CxDamageChip
        v-for="s in statuses"
        :key="s.key"
        :status="s.key"
        :value="s.value"
        format="int"
      />
    </div>
    <div
      v-for="(text, i) in passiveTexts"
      :key="i"
      class="cx-wcard-line"
    >
      <span class="cx-muted">{{ text }}</span>
    </div>

    <div class="cx-wcard-line">
      <CxIcon
        name="stone"
        size="sm"
      />
      <span>{{ upgrade.text }}</span>
      <CxReliabilityBadge
        v-if="upgrade.kind"
        :kind="upgrade.kind"
        :confidence="upgrade.confidence"
        :tip="upgrade.tip"
      />
    </div>

    <div class="cx-wcard-line">
      <CxIcon
        name="map"
        size="sm"
        label="Où l'obtenir"
      />
      <span v-if="acquisition">
        <b v-if="acquisition.method">{{ acquisition.method }}</b>
        <CxValue
          v-else
          :value="null"
        />
        <template v-if="acquisition.place"> — {{ acquisition.place }}</template>
        <span
          v-if="acquisition.others > 0"
          class="cx-muted"
        > (+{{ acquisition.others }} autre{{ acquisition.others > 1 ? 's' : '' }})</span>
      </span>
      <CxValue
        v-else
        :value="null"
      />
    </div>

    <div
      v-if="hasFlags"
      class="cx-row tight"
    >
      <CxFlag
        v-if="flags.remembrance"
        icon="trade"
        label="Remembrance"
        alert
        title="Vous renoncez aux autres objets de cet échange"
      />
      <CxFlag
        v-if="flags.purchase"
        icon="buy"
        label="Achat"
        title="Vendue par un marchand"
      />
      <CxFlag
        v-if="flags.randomDrop"
        icon="dice"
        label="Butin aléatoire"
        alert
        title="Butin d'ennemi non garanti : peut demander de nombreux essais"
      />
      <CxFlag
        v-if="flags.quest"
        icon="quest"
        label="Quête"
        alert
        title="Liée à un PNJ ou à une quête : peut devenir impossible à obtenir"
      />
    </div>

    <div class="cx-wcard-acts">
      <CxButton
        variant="ghost"
        size="sm"
        icon="pin"
        icon-only
        label="Épingler à Ma liste"
        class="cx-wcard-pin"
        :pressed="pinned"
        @click="emit('pin')"
      />
      <CxButton
        variant="ghost"
        size="sm"
        icon="compare"
        icon-only
        label="Comparer"
        @click="emit('compare')"
      />
      <CxButton
        variant="ghost"
        size="sm"
        icon="book"
        icon-only
        label="Voir la fiche"
        @click="emit('open')"
      />
      <CxButton
        variant="ghost"
        size="sm"
        icon="swap"
        icon-only
        label="Voir les alternatives"
        @click="emit('alternatives')"
      />
      <CxButton
        variant="ghost"
        size="sm"
        icon="help"
        class="cx-btn-why"
        :aria-expanded="whyOpen ? 'true' : 'false'"
        @click="emit('why', score.explanation)"
      >
        Pourquoi ?
      </CxButton>
    </div>
  </article>
</template>

<style>
.cx-wcard { position: relative; display: flex; flex-direction: column; gap: 10px; min-width: 0; padding: var(--space-3); border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface-raised); }
.cx-wcard.is-top { border-color: var(--gold-line); box-shadow: var(--glow-gold); }
.cx-wcard.is-pinned .cx-wcard-pin { color: var(--gold-text); }
.cx-wcard-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: var(--space-2); }
.cx-wcard-name, .cx a.cx-wcard-name { padding: 0; border: 0; background: transparent; color: var(--ink); font: 700 18px/22px var(--font-display); text-align: left; text-decoration: none; cursor: pointer; overflow-wrap: anywhere; }
.cx a.cx-wcard-name:hover, .cx button.cx-wcard-name:hover { color: var(--gold-text); text-decoration: underline; text-decoration-thickness: 1px; }
.cx-wcard-sub { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 3px; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.cx-score { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.cx-score-num { color: var(--gold-text); font: 600 22px/24px var(--font-sans); font-variant-numeric: tabular-nums; }
.cx-score-bar { width: 44px; height: 4px; overflow: hidden; border-radius: 2px; background: var(--surface-sunken); }
.cx-score-bar > span { display: block; height: 100%; border-radius: 2px; background: var(--gold); transition: width .15s ease; }
.cx-wcard-field { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.cx-wcard-line { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 6px; color: var(--ink-2); font-size: 12px; line-height: 16px; }
.cx-wcard-line > .cx-i { margin-top: 1px; color: var(--ink-3); }
.cx-wcard-line > .cx-i + span { flex: 1 1 140px; min-width: 0; }
.cx-wcard-line b { color: var(--ink); font-weight: 600; }
.cx-wcard-acts { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; margin-top: auto; padding-top: var(--space-2); border-top: 1px solid var(--line); }
.cx-wcard-acts .cx-btn-why { margin-left: auto; }
@media (prefers-reduced-motion: reduce) { .cx-score-bar > span { transition: none; } }
/* Mobile : zone de frappe de 44 px (`--size-cible`) autour du texte du lien ; la marge négative annule le remplissage pour que la mise en page ne bouge pas. */
@media (max-width: 767px) { .cx-wcard-name, .cx a.cx-wcard-name {  display: inline-block; min-width: var(--size-cible); padding-block: calc((var(--size-cible) - 1lh) / 2); margin-block: calc((var(--size-cible) - 1lh) / -2); } }
</style>
