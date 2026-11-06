<!-- Encart « Pour votre profil » : score de l'arme sur 100, ses quatre composantes sur 25 et le panneau « Pourquoi ? » (données utilisées, limites). -->
<script setup lang="ts">
import { computed } from 'vue'
import type { WeaponScore } from '../../../engine/score.ts'
import type { Calc } from '../../../engine/types.ts'
import { limitText } from '../../../ui/explainText.ts'
import { formatInt } from '../../../ui/format.ts'
import CxNote from '../../ds/CxNote.vue'
import CxReliabilityBadge from '../../ds/CxReliabilityBadge.vue'
import CxSkeleton from '../../ds/CxSkeleton.vue'
import CxValue from '../../ds/CxValue.vue'
import CxWhyPanel from '../../ds/CxWhyPanel.vue'
import WeaponSection from './WeaponSection.vue'

/**
 * Score de recommandation de l'arme pour les critères courants (calculs.md, « Score de recommandation d'une arme (0–100) ») : quatre composantes de 0 à 25.
 * Le score vient du moteur par le store d'analyse (`scoreOf`, même hors du style ou masquée : la raison est une limite, dite dans une note) ;
 * le composant n'additionne ni n'arrondit rien. Une composante `null` s'affiche « Non documenté », jamais 0.
 * « Pourquoi ? » rend l'`Explanation` du moteur (composantes, données utilisées, limites) ; sa grille à trois colonnes passe à une colonne dans cet encart étroit.
 */
const props = defineProps<{
  /** Score du moteur ; `null` tant que l'arme n'est pas dans un fichier chargé. */
  score: Calc<WeaponScore> | null
  /** État du chargement des fichiers dont le score dépend (origines, boss, tables). */
  status: 'loading' | 'ready' | 'error'
  /** Description du profil (« Dex / Saignement, Samurai, niveau 42, étape Milieu »). */
  profile: string
}>()

/** Codes des limites qui disent pourquoi l'arme n'est pas dans les recommandations (style ou exclusion), lus dans l'explication du score. */
const VISIBILITY_LIMITS: ReadonlySet<string> = new Set([
  'weapon-outside-style',
  'weapon-hidden-content-sote',
  'weapon-hidden-content-tp',
  'weapon-hidden-remembrance',
  'weapon-hidden-random-drop',
  'weapon-hidden-quest',
  'weapon-hidden-estimate',
])
const visibilityNotes = computed(() =>
  (props.score?.explanation.limits ?? []).filter((l) => VISIBILITY_LIMITS.has(l.code)).map((l) => limitText(l.code, l.params)),
)

const parts = computed(() => {
  const s = props.score?.value
  if (!s) return []
  return [
    { id: 'fit', label: 'Adéquation au build', value: s.fit },
    { id: 'power', label: 'Puissance', value: s.power },
    { id: 'access', label: 'Accessibilité', value: s.access },
    { id: 'upgrade', label: "Coût d'amélioration", value: s.upgrade },
  ]
})
</script>

<template>
  <WeaponSection
    title="Pour votre profil"
    :subtitle="profile"
  >
    <div
      v-if="status === 'loading'"
      aria-busy="true"
    >
      <CxSkeleton
        width="40%"
        :height="40"
      />
      <span
        class="cx-sr"
        role="status"
      >Chargement du score</span>
    </div>
    <CxNote
      v-else-if="status === 'error'"
      tone="warn"
      title="Score indisponible."
    >
      Un fichier de données nécessaire au score n'a pas pu être lu.
    </CxNote>
    <CxNote
      v-else-if="score === null"
      tone="partial"
      title="Score non calculé."
    >
      Les données de cette arme ne sont pas chargées : aucun score n'est disponible.
    </CxNote>
    <template v-else>
      <CxNote
        v-for="(text, i) in visibilityNotes"
        :key="i"
        tone="partial"
        title="Hors des recommandations."
      >
        {{ text }}
      </CxNote>
      <div class="wp-scoreline">
        <CxValue
          v-if="score.value?.total === null || score.value === null"
          :value="null"
        />
        <span
          v-else
          class="wp-big cx-num"
        >{{ formatInt(score.value.total) }}</span>
        <span
          v-if="score.value?.total != null"
          class="cx-muted"
        >sur 100</span>
        <CxReliabilityBadge kind="calculated" />
        <CxReliabilityBadge
          v-if="score.estimate"
          kind="estimate"
          :confidence="score.estimate.confidence"
        />
      </div>
      <p
        v-if="score.value?.total === null"
        class="wp-sub"
      >
        Arme « Non classé » : aucune étape ne se déduit de ses régions d'obtention, donc ni score ni rang.
      </p>

      <div class="wp-breakdown">
        <div
          v-for="p in parts"
          :key="p.id"
          class="wp-bd"
        >
          <span>{{ p.label }}</span>
          <CxValue
            v-if="p.value === null"
            :value="null"
          />
          <b
            v-else
            class="cx-num"
          >{{ formatInt(p.value) }} / 25</b>
          <span
            class="wp-bar"
            aria-hidden="true"
          ><span :style="{ width: `${((p.value ?? 0) / 25) * 100}%` }" /></span>
        </div>
      </div>

      <CxWhyPanel
        class="wp-why"
        :explanation="score.explanation"
        :estimate="score.estimate?.confidence ?? null"
        subject="ce score"
      />
    </template>
  </WeaponSection>
</template>

<style scoped>
.wp-scoreline { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 10px; }
.wp-scoreline > .cx-rel { align-self: center; }
.wp-big { color: var(--gold-text); font: 600 40px/44px var(--font-sans); }
.wp-sub { color: var(--ink-3); font-size: 12px; line-height: 16px; }
.wp-breakdown { display: grid; gap: 8px; }
.wp-bd { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px var(--space-2); align-items: center; color: var(--ink-2); font-size: 12px; line-height: 16px; }
.wp-bd b { color: var(--ink); font-weight: 600; }
.wp-bar { grid-column: 1 / -1; height: 6px; overflow: hidden; border-radius: 3px; background: var(--surface-sunken); }
.wp-bar > span { display: block; height: 100%; border-radius: 3px; background: var(--gold); }
.wp-why :deep(.cx-why) { grid-template-columns: minmax(0, 1fr); }
</style>
