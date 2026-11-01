<!-- Lien « Voir sur le wiki » : ouvre la page source de l'entrée dans un nouvel onglet. -->
<script setup lang="ts">
import { computed } from 'vue'
import CxButton from './CxButton.vue'

/**
 * Lien discret vers la page du wiki d'où vient l'entrée (champ `url` des données).
 * N'affiche rien quand l'adresse est absente ou n'est pas une adresse http(s) : une donnée ne produit jamais un autre schéma.
 */
const props = withDefaults(
  defineProps<{
    /** Adresse de la page du wiki (champ `url`). */
    href: string | null | undefined
    /** Taille du bouton : `md` (défaut) ou `sm` dans les cartes. */
    size?: 'md' | 'sm'
  }>(),
  { size: 'md' },
)

const safeHref = computed(() => (props.href && /^https?:\/\//i.test(props.href) ? props.href : null))
</script>

<template>
  <CxButton
    v-if="safeHref"
    variant="ghost"
    :size="size"
    icon="ext"
    :href="safeHref"
    external
  >
    Voir sur le wiki<span class="cx-sr"> (s'ouvre dans un nouvel onglet)</span>
  </CxButton>
</template>
