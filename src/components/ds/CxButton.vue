<!-- Bouton du design system : secondaire, principal (or), discret, icône seule, bascule ; devient un lien `a` quand `href` est fourni. -->
<script setup lang="ts">
import { computed } from 'vue'
import CxIcon from './CxIcon.vue'

/**
 * Bouton ou lien d'action (README du design system, composant Button).
 * Un seul bouton `primary` par zone. Le libellé est un verbe qui dit ce qui arrive.
 * Les attributs et écouteurs non déclarés (`aria-expanded`, `onClick`, `id`…) passent à l'élément racine.
 */
const props = withDefaults(
  defineProps<{
    /** `secondary` (défaut), `primary` (or plein) ou `ghost` (discret, barres d'actions). */
    variant?: 'secondary' | 'primary' | 'ghost'
    /** `md` (32 px) ou `sm` (26 px) ; 44 px sur mobile dans les deux cas. */
    size?: 'md' | 'sm'
    /** Nom d'une icône du sprite, placée avant le libellé. */
    icon?: string
    /** Bouton carré sans texte : `label` devient obligatoire (nom accessible). */
    iconOnly?: boolean
    /** Nom accessible (`aria-label`) ; indispensable pour un bouton-icône. */
    label?: string
    /** État de bascule (« Épinglé », filtre actif) : pose `aria-pressed`. Absent : le bouton n'est pas une bascule. */
    pressed?: boolean
    /** Fournit une adresse : l'élément devient un lien `a`. */
    href?: string
    /** Lien externe : s'ouvre dans un nouvel onglet avec `rel="noopener noreferrer"`. */
    external?: boolean
    /** Désactive l'action ; la raison se dit dans le libellé ou une info-bulle. */
    disabled?: boolean
    /** Type du `button` (`button` par défaut pour ne jamais soumettre un formulaire par mégarde). */
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    icon: undefined,
    iconOnly: false,
    label: undefined,
    pressed: undefined,
    href: undefined,
    external: false,
    disabled: false,
    type: 'button',
  },
)

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const isLink = computed(() => Boolean(props.href))
const classes = computed(() => [
  'cx-btn',
  props.variant === 'primary' ? 'cx-btn-primary' : props.variant === 'ghost' ? 'cx-btn-ghost' : '',
  props.size === 'sm' ? 'cx-btn-sm' : '',
  props.iconOnly ? 'cx-btn-icon' : '',
])
const iconSize = computed(() => (props.size === 'sm' && !props.iconOnly ? 'sm' : 'md'))

/** Un lien désactivé n'a pas de `disabled` natif : on neutralise le clic et on le retire de l'ordre de tabulation. */
function onClick(event: MouseEvent): void {
  if (props.disabled) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>

<template>
  <component
    :is="isLink ? 'a' : 'button'"
    :class="classes"
    :type="isLink ? undefined : type"
    :href="isLink && !disabled ? href : undefined"
    :target="isLink && external ? '_blank' : undefined"
    :rel="isLink && external ? 'noopener noreferrer' : undefined"
    :disabled="!isLink && disabled ? true : undefined"
    :aria-disabled="isLink && disabled ? 'true' : undefined"
    :tabindex="isLink && disabled ? -1 : undefined"
    :aria-pressed="pressed === undefined ? undefined : String(pressed)"
    :aria-label="label"
    @click="onClick"
  >
    <CxIcon
      v-if="icon"
      :name="icon"
      :size="iconSize"
    />
    <slot />
  </component>
</template>

<style>
.cx-btn, .cx a.cx-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: var(--size-controle); padding: 0 var(--space-3); border: 1px solid var(--control-border); border-radius: var(--radius-s); background: var(--surface-raised); color: var(--ink); font-size: 13px; font-weight: 600; line-height: 16px; white-space: nowrap; text-decoration: none; cursor: pointer; }
.cx-btn:hover { background: var(--surface-hover); border-color: var(--ink-3); }
.cx-btn:disabled, .cx-btn[aria-disabled="true"], .cx a.cx-btn[aria-disabled="true"] { background: transparent; border-color: var(--line-strong); color: var(--ink-disabled); cursor: not-allowed; }
.cx-btn-primary, .cx a.cx-btn-primary { background: var(--gold); border-color: var(--gold); color: var(--on-gold); }
.cx-btn-primary:hover { background: var(--gold-hover); border-color: var(--gold-hover); }
.cx-btn-ghost, .cx a.cx-btn-ghost { background: transparent; border-color: transparent; color: var(--ink-2); }
.cx-btn-ghost:hover, .cx a.cx-btn-ghost:hover { background: var(--surface-hover); border-color: transparent; color: var(--ink); }
.cx-btn-icon { width: var(--size-controle); padding: 0; }
.cx-btn-sm { height: 26px; padding: 0 var(--space-2); font-size: 12px; }
.cx-btn-icon.cx-btn-sm { width: 26px; padding: 0; }
.cx-btn[aria-pressed="true"] { background: var(--gold-wash); border-color: var(--gold-line); color: var(--gold-text); }
.cx-btn-ghost[aria-pressed="true"] { border-color: transparent; }
/* Cible tactile : 44 px minimum sous 768 px (seuil en dur, voir src/ui/breakpoints.ts).
   Les sélecteurs `.cx a.cx-btn` (spécificité des liens-boutons) sont repris ici, sinon la hauteur de 32 px des liens l'emporterait. */
@media (max-width: 767px) {
  .cx-btn, .cx a.cx-btn, .cx-btn.cx-btn-sm, .cx a.cx-btn.cx-btn-sm { height: var(--size-cible); }
  .cx-btn-icon, .cx-btn-icon.cx-btn-sm { width: var(--size-cible); }
}
</style>
