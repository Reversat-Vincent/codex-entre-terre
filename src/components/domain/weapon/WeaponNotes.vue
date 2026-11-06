<!-- Sections « Notes » et « Historique des patchs » d'une arme : textes du wiki, rendus par interpolation avec liens vers les fiches. -->
<script setup lang="ts">
import type { WeaponEntry } from '../../../data/types/weapon.ts'
import CxValue from '../../ds/CxValue.vue'
import WikiInline from '../WikiInline.vue'
import WikiText from '../WikiText.vue'
import WeaponSection from './WeaponSection.vue'

/**
 * Notes de la page du wiki (puces, `→` pour les niveaux imbriqués) et historique des patchs (version, note officielle, explication de la communauté).
 * Textes en anglais, tels que dans `data/` ; aucune interprétation. Sans note ou sans patch, la section dit « Non documenté » plutôt que de disparaître.
 */
defineProps<{
  weapon: WeaponEntry
}>()
</script>

<template>
  <div class="wp-two">
    <WeaponSection title="Notes">
      <WikiText
        v-if="weapon.notes.length > 0"
        :lines="weapon.notes"
        mode="list"
        :preferred-kinds="['weapon', 'ash', 'boss']"
        :skip-ref="`weapon:${weapon.id}`"
      />
      <p
        v-else
        class="wp-empty"
      >
        <CxValue :value="null" /> Le wiki ne donne pas de note pour cette arme.
      </p>
    </WeaponSection>

    <WeaponSection title="Historique des patchs">
      <dl
        v-if="weapon.patch_notes && weapon.patch_notes.length > 0"
        class="wp-patch"
      >
        <template
          v-for="(p, i) in weapon.patch_notes"
          :key="i"
        >
          <dt>{{ p.version }}</dt>
          <dd>
            <span v-if="p.official_notes">{{ p.official_notes }}</span>
            <span
              v-if="p.community_notes"
              class="wp-community"
            >
              <span class="cx-label">Explication de la communauté</span>
              <WikiInline
                :text="p.community_notes"
                :skip-ref="`weapon:${weapon.id}`"
              />
            </span>
          </dd>
        </template>
      </dl>
      <p
        v-else
        class="wp-empty"
      >
        <CxValue :value="null" /> Le wiki ne liste aucun patch pour cette arme.
      </p>
    </WeaponSection>
  </div>
</template>

<style scoped>
.wp-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: var(--space-4); align-items: start; }
.wp-empty { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; color: var(--ink-2); font-size: 13px; }
.wp-patch { display: grid; grid-template-columns: minmax(0, 120px) minmax(0, 1fr); gap: var(--space-2) var(--space-3); color: var(--ink-2); font-size: 13px; line-height: 19px; }
.wp-patch dt { color: var(--gold-text); font-weight: 600; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.wp-patch dd { display: grid; gap: 4px; min-width: 0; overflow-wrap: anywhere; }
.wp-community { display: grid; gap: 2px; color: var(--ink-3); }
@media (max-width: 767px) {
  .wp-patch { grid-template-columns: minmax(0, 1fr); }
}
</style>
