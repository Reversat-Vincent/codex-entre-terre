<!-- Contenu de la fiche d'une origine chargée : niveau, attributs, statistiques de départ, défense, équipement en liens, conseils d'optimisation et lien vers le widget B. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { OriginEntry } from '../../../../data/types/origins.ts'
import WikiText from '../../WikiText.vue'
import SheetAlerts from '../SheetAlerts.vue'
import SheetFacts from '../SheetFacts.vue'
import SheetHeader from '../SheetHeader.vue'
import SheetLayout from '../SheetLayout.vue'
import SheetLicence from '../SheetLicence.vue'
import SheetNameList from '../SheetNameList.vue'
import SheetSection from '../SheetSection.vue'
import { descriptionParagraphs } from '../sheetModel.ts'
import OriginDefense from './OriginDefense.vue'
import { originAlerts, originAttributes, originEquipment, originFacts } from './originModel.ts'

/**
 * Fiche d'une origine (`/origines/:id`, brief § 6) : niveau, huit attributs, statistiques de départ du wiki, défense et résistances, équipement de départ en liens
 * vers les fiches, conseils d'optimisation du wiki et lien vers le widget « Configuration de départ optimale » du tableau de bord pour la comparer à un build cible.
 * Aucun calcul : valeurs du wiki, `null` → « Non documenté ».
 */
const props = defineProps<{
  origin: OriginEntry
  /** Date d'extraction du fichier. */
  retrieved: string | null
}>()

const ref = computed(() => `origin:${props.origin.id}` as const)
const alerts = computed(() => originAlerts(props.origin))
const facts = computed(() => originFacts(props.origin))
const attributes = computed(() => originAttributes(props.origin))
const equipment = computed(() => originEquipment(props.origin))
const summary = computed(() => descriptionParagraphs(props.origin.summary))
const tips = computed(() => props.origin.build_optimization ?? [])
const description = computed(() => descriptionParagraphs(props.origin.in_game_description))
const EQUIPMENT_KINDS = ['weapon', 'armor', 'spell', 'talisman', 'item', 'ash'] as const
</script>

<template>
  <SheetHeader
    kind="origin"
    :entity-ref="ref"
    :name="origin.derived.displayName"
    :source="origin.source"
    :url="origin.url"
  >
    <template #meta>
      <span class="sh-meta">Niveau <b class="cx-num">{{ origin.level }}</b></span>
    </template>
  </SheetHeader>

  <SheetAlerts :alerts="alerts" />

  <SheetLayout>
    <template #aside>
      <SheetFacts
        title="Statistiques de départ"
        subtitle="Valeurs de la page du wiki."
        :facts="facts"
      />
      <SheetSection
        title="Comparer à un build cible"
        subtitle="Quelle origine convient le mieux à votre build ?"
      >
        <p class="so-compare">
          Le tableau de bord classe les 12 origines pour votre build cible et explique la recommandation.
        </p>
        <RouterLink
          class="cx-btn"
          :to="{ name: 'dashboard', hash: '#widget-optimal-origin' }"
        >
          Ouvrir le widget « Configuration de départ optimale »
        </RouterLink>
      </SheetSection>
    </template>
    <template #main>
      <SheetSection title="Présentation">
        <div
          v-if="description.length > 0"
          class="so-desc"
        >
          <h3 class="cx-label">
            Description du jeu
          </h3>
          <p
            v-for="(p, i) in description"
            :key="i"
          >
            {{ p }}
          </p>
        </div>
        <div
          v-if="summary.length > 0"
          class="so-desc"
        >
          <h3 class="cx-label">
            Résumé du wiki
          </h3>
          <WikiText
            :lines="summary"
            :preferred-kinds="['weapon', 'origin', 'item']"
            :skip-ref="ref"
          />
        </div>
      </SheetSection>

      <SheetSection
        title="Attributs de départ"
        subtitle="Les huit attributs au niveau de départ."
      >
        <dl class="so-attrs">
          <div
            v-for="a in attributes"
            :key="a.key"
            class="so-attr"
          >
            <dt>
              <abbr :title="a.name">{{ a.abbr }}</abbr>
              <span class="so-attr-name">{{ a.name }}</span>
            </dt>
            <dd class="cx-num">
              {{ a.value }}
            </dd>
          </div>
        </dl>
      </SheetSection>

      <SheetSection
        v-if="equipment.length > 0"
        title="Équipement de départ"
      >
        <div
          v-for="g in equipment"
          :key="g.key"
          class="so-group"
        >
          <h3 class="cx-label">
            {{ g.label }}
          </h3>
          <SheetNameList
            :label="g.label"
            :entries="g.entries"
            :link-kinds="EQUIPMENT_KINDS"
          />
        </div>
      </SheetSection>

      <OriginDefense :origin="origin" />

      <SheetSection
        v-if="tips.length > 0"
        title="Conseils d’optimisation"
        subtitle="Quand cette origine est la plus économe en points, selon le wiki."
      >
        <WikiText
          :lines="tips"
          :preferred-kinds="['origin', 'weapon']"
          :skip-ref="ref"
        />
      </SheetSection>
    </template>
  </SheetLayout>

  <SheetLicence
    :page-name="origin.wiki_page"
    :url="origin.url"
    :retrieved="retrieved"
  />
</template>

<style scoped>
.so-compare { color: var(--ink-2); font-size: 13px; line-height: 19px; }
.so-desc { display: grid; gap: var(--space-2); max-width: 72ch; color: var(--ink-2); font-size: 14px; line-height: 22px; }
.so-group { display: grid; gap: var(--space-2); }
.so-attrs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-3); }
.so-attr { display: grid; gap: 2px; padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-m); background: var(--surface-raised); }
.so-attr dt { display: grid; gap: 2px; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.so-attr dt abbr { color: var(--ink-2); font-weight: 600; letter-spacing: .04em; text-decoration: none; }
.so-attr-name { overflow-wrap: anywhere; }
.so-attr dd { color: var(--ink); font: 600 24px/28px var(--font-display); }
@media (max-width: 767px) {
  .so-attrs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
