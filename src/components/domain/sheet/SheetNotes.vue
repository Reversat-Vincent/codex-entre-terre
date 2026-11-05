<!-- Sections « Notes » et « Historique des patchs » communes : textes du wiki rendus par interpolation, avec liens vers les fiches. -->
<script setup lang="ts">
import type { EntityKind, EntityRef } from '../../../data/datasets.ts'
import type { PatchNote } from '../../../data/types/common.ts'
import CxValue from '../../ds/CxValue.vue'
import WikiInline from '../WikiInline.vue'
import WikiText from '../WikiText.vue'
import SheetSection from './SheetSection.vue'

/**
 * Notes de la page du wiki (puces, `→` pour les niveaux imbriqués) et historique des patchs (version, note officielle, explication de la communauté).
 * Textes en anglais, tels que dans `data/` ; aucune interprétation. Sans note ou sans patch, la section dit « Non documenté » plutôt que de disparaître.
 * Un patch dont la forme n'est pas celle du schéma (clé de texte au lieu de `version`, cas d'une cendre d'esprit) est lu avec ses champs à plat.
 */
defineProps<{
  notes: readonly string[] | undefined
  /** `patch_notes` de l'entrée ; les valeurs inattendues sont affichées sans la version. */
  patches: readonly (PatchNote | Readonly<Record<string, string>>)[] | undefined
  /** Référence de l'entité décrite : jamais liée à elle-même. */
  entityRef: EntityRef
  /** Genres préférés pour relier les noms cités. */
  linkKinds?: readonly EntityKind[]
}>()

/**
 * Lit un patch quelle que soit sa forme.
 * @param p Patch tel que dans data/.
 * @returns La version, la note officielle et l'explication de la communauté, `null` si absentes.
 */
function readPatch(p: PatchNote | Readonly<Record<string, string>>): { version: string | null; official: string | null; community: string | null } {
  const rec = p as Readonly<Record<string, string | undefined>>
  return { version: rec.version ?? null, official: rec.official_notes ?? null, community: rec.community_notes ?? null }
}
</script>

<template>
  <div class="sh-two">
    <SheetSection title="Notes">
      <WikiText
        v-if="notes && notes.length > 0"
        :lines="notes"
        mode="list"
        :preferred-kinds="linkKinds"
        :skip-ref="entityRef"
      />
      <p
        v-else
        class="sh-empty"
      >
        <CxValue :value="null" /> Le wiki ne donne pas de note pour cet élément.
      </p>
    </SheetSection>

    <SheetSection title="Historique des patchs">
      <dl
        v-if="patches && patches.length > 0"
        class="sh-patch"
      >
        <template
          v-for="(p, i) in patches"
          :key="i"
        >
          <dt>
            <CxValue :value="readPatch(p).version" />
          </dt>
          <dd>
            <span v-if="readPatch(p).official">{{ readPatch(p).official }}</span>
            <span
              v-if="readPatch(p).community"
              class="sh-community"
            >
              <span class="cx-label">Explication de la communauté</span>
              <WikiInline
                :text="readPatch(p).community ?? ''"
                :skip-ref="entityRef"
              />
            </span>
          </dd>
        </template>
      </dl>
      <p
        v-else
        class="sh-empty"
      >
        <CxValue :value="null" /> Le wiki ne liste aucun patch pour cet élément.
      </p>
    </SheetSection>
  </div>
</template>

<style scoped>
.sh-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: var(--space-4); align-items: start; }
.sh-empty { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; color: var(--ink-2); font-size: 13px; }
.sh-patch { display: grid; grid-template-columns: minmax(0, 120px) minmax(0, 1fr); gap: var(--space-2) var(--space-3); color: var(--ink-2); font-size: 13px; line-height: 19px; }
.sh-patch dt { color: var(--gold-text); font-weight: 600; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.sh-patch dd { display: grid; gap: 4px; min-width: 0; overflow-wrap: anywhere; }
.sh-community { display: grid; gap: 2px; color: var(--ink-3); }
@media (max-width: 767px) {
  .sh-patch { grid-template-columns: minmax(0, 1fr); }
}
</style>
