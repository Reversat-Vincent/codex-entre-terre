<!-- Ligne de la page Recherche : icône, nom surligné, badge de source, ligne de contexte ; lien vers la fiche, vers une adresse externe, ou bouton (action, requête). -->
<script setup lang="ts">
import { computed } from 'vue'
import type { PaletteRow } from '../../ds/commandPaletteModel.ts'
import CxIcon from '../../ds/CxIcon.vue'
import CxSourceBadge from '../../ds/CxSourceBadge.vue'

/**
 * Ligne de résultat construite par `commandPaletteModel.ts` (mêmes données que la palette). La cible décide de l'élément :
 * `RouterLink` pour une fiche ou un écran, `a` externe (nouvel onglet) pour le wiki, `button` pour une action ou une requête à relancer.
 * La partie trouvée est dans un `mark` (texte seulement, jamais de HTML injecté). Cible ≥ 44 px sous 768 px.
 */
const props = defineProps<{
  /** Ligne à afficher. */
  row: PaletteRow
}>()

const emit = defineEmits<{
  /** La ligne est choisie (clic ou Entrée) : la vue mémorise la recherche si `row.remember` et exécute l'action ou la requête. */
  pick: [row: PaletteRow]
}>()

const target = computed(() => props.row.target)
const href = computed(() => (target.value.type === 'external' ? target.value.href : null))
const to = computed(() => (target.value.type === 'route' ? target.value.to : null))
const trailing = computed(() => (target.value.type === 'external' ? 'ext' : target.value.type === 'route' ? 'chev-r' : null))

/** Pour une fiche, `RouterLink` navigue seul ; la vue est seulement prévenue pour mémoriser la recherche. */
function onLink(): void {
  emit('pick', props.row)
}

</script>

<template>
  <RouterLink
    v-if="to"
    class="s-row"
    :to="to"
    @click="onLink"
  >
    <span class="s-row-ic"><CxIcon :name="row.icon" /></span>
    <span class="s-row-text">
      <span class="s-row-t"><template
        v-for="(part, i) in row.parts"
        :key="i"
      ><mark v-if="part.match">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span>
      <CxSourceBadge
        v-if="row.source"
        :source="row.source"
      />
      <span
        v-if="row.sub"
        class="s-row-s"
      >{{ row.sub }}</span>
    </span>
    <CxIcon
      v-if="trailing"
      class="s-row-go"
      :name="trailing"
    />
  </RouterLink>
  <a
    v-else-if="href"
    class="s-row"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
  >
    <span class="s-row-ic"><CxIcon :name="row.icon" /></span>
    <span class="s-row-text">
      <span class="s-row-t">{{ row.parts.map((p) => p.text).join('') }}</span>
      <span
        v-if="row.sub"
        class="s-row-s"
      >{{ row.sub }}</span>
    </span>
    <CxIcon
      class="s-row-go"
      name="ext"
    />
  </a>
  <button
    v-else
    type="button"
    class="s-row"
    @click="emit('pick', row)"
  >
    <span class="s-row-ic"><CxIcon :name="row.icon" /></span>
    <span class="s-row-text">
      <span class="s-row-t"><template
        v-for="(part, i) in row.parts"
        :key="i"
      ><mark v-if="part.match">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span>
      <span
        v-if="row.sub"
        class="s-row-s"
      >{{ row.sub }}</span>
    </span>
  </button>
</template>

<style scoped>
.s-row { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; align-items: center; gap: var(--space-3); width: 100%; min-height: 44px; padding: 7px var(--space-3); border: 1px solid transparent; border-radius: var(--radius-m); background: transparent; color: var(--ink); font: inherit; text-align: left; text-decoration: none; cursor: pointer; }
.s-row:hover { background: var(--gold-wash); border-color: var(--gold-line); }
.s-row-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: var(--radius-s); background: var(--surface); color: var(--ink-2); }
.s-row-text { min-width: 0; }
.s-row-text .cx-badge { margin-left: 6px; }
.s-row-t { font-weight: 600; overflow-wrap: anywhere; }
/* Le surlignage n'est pas la couleur seule : la partie trouvée est aussi en gras. */
.s-row-t mark { background: transparent; color: var(--gold-text); font-weight: 700; }
.s-row-s { display: block; color: var(--ink-3); font-size: 12px; line-height: 16px; overflow-wrap: anywhere; }
.s-row-go { color: var(--ink-3); }
</style>
