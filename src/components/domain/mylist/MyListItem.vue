<!-- Ligne de « Ma liste » : case « Récupéré », nom en lien vers la fiche avec badge de source, genre, où l'obtenir, étape, score d'une arme, déplacement et retrait. -->
<script setup lang="ts">
import { computed } from 'vue'
import { entityRoute } from '../../../router/entityRoute.ts'
import type { SourceName } from '../../../ui/labels.ts'
import CxButton from '../../ds/CxButton.vue'
import CxCheckbox from '../../ds/CxCheckbox.vue'
import CxIcon from '../../ds/CxIcon.vue'
import CxSkeleton from '../../ds/CxSkeleton.vue'
import CxSourceBadge from '../../ds/CxSourceBadge.vue'
import CxValue from '../../ds/CxValue.vue'
import { KIND_ICONS, KIND_SINGULARS, detailOf } from './myListModel.ts'
import type { MyListRow } from './useMyList.ts'

/**
 * Un élément épinglé. Le composant n'a pas d'état : il affiche la ligne et émet les actions (`toggle`, `move`, `remove`) ; la vue les applique au store `pins`.
 * - Récupéré : case à cocher native, plus un badge « Récupéré » avec une icône : l'état ne repose jamais sur la couleur seule.
 * - Référence absente des données (cas d'un import) : « Élément introuvable » et un bouton de retrait ; la référence est affichée telle quelle.
 * - Où l'obtenir : méthode, lieu et région tels que dans les données ; un genre qui ne documente rien affiche « Non documenté », jamais un blanc.
 * - Étape et score d'une arme : fournis par le store d'analyse (`stageOf`, `scoreOf`), y compris pour une arme hors du style de jeu des critères,
 *   dont le score est alors donné pour information.
 */
const props = defineProps<{
  row: MyListRow
  /** Vrai si l'élément est le premier des éléments visibles (« Monter » inactif). */
  first: boolean
  /** Vrai si l'élément est le dernier des éléments visibles (« Descendre » inactif). */
  last: boolean
}>()

const emit = defineEmits<{
  /** Coche ou décoche « Récupéré ». */
  toggle: []
  /** Déplace l'élément d'un cran parmi les éléments visibles. */
  move: [direction: -1 | 1]
  /** Retire l'élément de la liste (la notification propose « Annuler »). */
  remove: []
}>()

const done = computed(() => props.row.pin.done)
const name = computed(() => props.row.entry?.derived.displayName ?? props.row.pin.ref)
const missing = computed(() => props.row.state === 'missing')
const detail = computed(() => (props.row.entry === null ? null : detailOf(props.row.entry)))
const to = computed(() => (props.row.state === 'ready' ? entityRoute(props.row.pin.ref) : null))
const kindLabel = computed(() => (props.row.kind === null ? null : KIND_SINGULARS[props.row.kind]))
const kindIcon = computed(() => (props.row.kind === null ? 'help' : KIND_ICONS[props.row.kind]))
</script>

<template>
  <li
    class="ml-item"
    :class="{ 'is-done': done, 'is-missing': missing }"
  >
    <div class="ml-check">
      <CxCheckbox
        :model-value="done"
        :disabled="missing"
        @update:model-value="emit('toggle')"
      >
        Récupéré<span class="cx-sr"> : {{ name }}</span>
      </CxCheckbox>
    </div>

    <div class="ml-main">
      <!-- Chargement du fichier du genre : l'emplacement garde sa hauteur. -->
      <template v-if="row.state === 'loading'">
        <CxSkeleton
          width="45%"
          :height="18"
        />
        <CxSkeleton
          width="70%"
          :height="14"
        />
        <span
          class="cx-sr"
          role="status"
        >Chargement de {{ row.pin.ref }}</span>
      </template>

      <template v-else-if="row.state === 'missing'">
        <p class="ml-line">
          <b class="ml-name">Élément introuvable</b>
        </p>
        <p class="cx-muted ml-sub">
          <CxIcon
            name="alert"
            size="sm"
          />Cette référence n’existe pas dans les données : <code class="ml-ref">{{ row.pin.ref }}</code>. Elle vient peut-être d’un fichier importé.
        </p>
      </template>

      <template v-else-if="row.state === 'error'">
        <p class="ml-line">
          <b class="ml-name">{{ name }}</b>
        </p>
        <p class="cx-muted ml-sub">
          <CxIcon
            name="alert"
            size="sm"
          />Les données de cet élément n’ont pas pu être lues.
        </p>
      </template>

      <template v-else-if="row.entry">
        <p class="ml-line">
          <RouterLink
            v-if="to"
            class="ml-name"
            :to="to"
          >
            {{ name }}
          </RouterLink>
          <CxSourceBadge :source="row.entry.source as SourceName" />
          <span
            v-if="done"
            class="ml-done"
          ><CxIcon
            name="check"
            size="sm"
          />Récupéré</span>
        </p>
        <p class="ml-sub cx-muted">
          <CxIcon
            :name="kindIcon"
            size="sm"
          />{{ kindLabel }}{{ detail ? ` · ${detail}` : '' }}
        </p>

        <div class="ml-where">
          <span class="ml-where-title"><CxIcon
            name="map"
            size="sm"
          />Où l’obtenir</span>
          <ul
            v-if="row.where.rows.length > 0"
            class="ml-where-list"
          >
            <li
              v-for="(w, i) in row.where.rows"
              :key="i"
            >
              <b v-if="w.method !== null">{{ w.method }}</b>
              <span v-if="w.location !== null">{{ w.method !== null ? ' · ' : '' }}{{ w.location }}</span>
              <span
                v-if="w.region !== null"
                class="cx-muted"
              >{{ w.method !== null || w.location !== null ? ' · ' : '' }}{{ w.region }}</span>
            </li>
            <li
              v-if="row.where.more > 0"
              class="cx-muted"
            >
              et {{ row.where.more }} {{ row.where.more > 1 ? 'autres' : 'autre' }} sur la fiche
            </li>
          </ul>
          <CxValue
            v-else
            :value="null"
          />
        </div>

        <p
          v-if="row.stage"
          class="ml-stage"
        >
          <span class="ml-where-title"><CxIcon
            name="layers"
            size="sm"
          />Étape</span>
          <span v-if="row.stage.kind === 'stage'">{{ row.stage.text }}</span>
          <span v-else-if="row.stage.kind === 'unclassified'">Non classée</span>
          <span
            v-else
            class="cx-muted"
          >Calcul en cours…</span>
        </p>
        <p
          v-if="row.score"
          class="ml-stage"
        >
          <span class="ml-where-title"><CxIcon
            name="calc"
            size="sm"
          />Score</span>
          <span v-if="row.score.total === null">Non classé : ni score ni rang</span>
          <span v-else>
            <CxValue
              :value="row.score.total"
              calculated
              :why="false"
              :estimate="row.score.estimate"
              method="Score de recommandation de l'arme pour vos critères, sur 100."
            /><span class="cx-muted"> / 100</span>
          </span>
          <span
            v-if="row.score.outsideStyle"
            class="cx-muted"
          >Hors du style de jeu de vos critères : donné pour information</span>
        </p>
      </template>
    </div>

    <div class="ml-actions">
      <CxButton
        v-if="!missing"
        variant="ghost"
        size="sm"
        icon-only
        class="ml-up"
        icon="chev-u"
        :label="`Monter ${name}`"
        :disabled="first"
        @click="emit('move', -1)"
      />
      <CxButton
        v-if="!missing"
        variant="ghost"
        size="sm"
        icon-only
        class="ml-down"
        icon="chev-d"
        :label="`Descendre ${name}`"
        :disabled="last"
        @click="emit('move', 1)"
      />
      <CxButton
        variant="ghost"
        size="sm"
        :icon-only="!missing"
        icon="x"
        :label="missing ? undefined : `Retirer ${name} de Ma liste`"
        @click="emit('remove')"
      >
        <template v-if="missing">
          Retirer de Ma liste
        </template>
      </CxButton>
    </div>
  </li>
</template>

<style scoped>
.ml-item { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: var(--space-3); padding: var(--space-3) var(--space-4); border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface); }
.ml-item.is-done { background: var(--surface-sunken); }
.ml-item.is-missing { border-style: dashed; }
.ml-check { padding-top: 1px; }
.ml-main { display: grid; gap: var(--space-1); min-width: 0; }
.ml-line { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); margin: 0; }
.ml-name { color: var(--ink); font: 600 17px/22px var(--font-display); }
a.ml-name { text-decoration: none; }
a.ml-name:hover { color: var(--gold-text); text-decoration: underline; }
.is-done .ml-name { text-decoration: line-through; color: var(--ink-2); }
.ml-done { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 6px; border: 1px solid var(--line-strong); border-radius: var(--radius-xs); color: var(--ink-2); font: 600 11px/14px var(--font-sans); }
.ml-sub { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 12px; line-height: 16px; }
.ml-ref { font-size: 12px; overflow-wrap: anywhere; }
.ml-where { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-1) var(--space-3); margin-top: var(--space-1); font-size: 13px; line-height: 18px; color: var(--ink-2); }
.ml-where-title { display: inline-flex; align-items: center; gap: 6px; color: var(--ink-3); font-size: 12px; font-weight: 600; }
.ml-where-list { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; min-width: 0; }
.ml-stage { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-1) var(--space-3); margin: 0; font-size: 13px; line-height: 18px; color: var(--ink-2); }
.ml-actions { display: flex; align-items: center; gap: var(--space-1); }
@media (max-width: 767px) {
  .ml-item { grid-template-columns: auto minmax(0, 1fr); padding: var(--space-3); }
  .ml-actions { grid-column: 1 / -1; justify-content: flex-end; border-top: 1px solid var(--line); padding-top: var(--space-2); }
}
/* Mobile : zone de frappe de 44 px (`--size-cible`) autour du texte du lien ; la marge négative annule le remplissage pour que la mise en page ne bouge pas. */
@media (max-width: 767px) { a.ml-name {  display: inline-block; min-width: var(--size-cible); padding-block: calc((var(--size-cible) - 1lh) / 2); margin-block: calc((var(--size-cible) - 1lh) / -2); } }
</style>
