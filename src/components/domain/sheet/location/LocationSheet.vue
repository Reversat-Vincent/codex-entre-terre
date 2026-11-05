<!-- Contenu de la fiche d'un lieu chargé : en-tête, valeurs clés, présentation, sites de grâce, boss, PNJ, butin, matériaux, ennemis, sous-lieux, cartes et notes. -->
<script setup lang="ts">
import { computed } from 'vue'
import { INTERACTIVE_MAPS } from '../../../../data/externalLinks.ts'
import type { LocationEntry } from '../../../../data/types/locations.ts'
import { labelText } from '../../../../ui/explainText.ts'
import CxButton from '../../../ds/CxButton.vue'
import WikiText from '../../WikiText.vue'
import SheetAlerts from '../SheetAlerts.vue'
import SheetFacts from '../SheetFacts.vue'
import SheetHeader from '../SheetHeader.vue'
import SheetLayout from '../SheetLayout.vue'
import SheetLicence from '../SheetLicence.vue'
import SheetNameList from '../SheetNameList.vue'
import SheetSection from '../SheetSection.vue'
import { toNameEntries } from '../sheetModel.ts'
import LocationLinks from './LocationLinks.vue'
import {
  buildLocationIndex,
  locationAlerts,
  locationChildren,
  locationFacts,
  locationKindLabel,
  locationLinks,
} from './locationModel.ts'

/**
 * Fiche d'un lieu (`/lieux/:id`, brief § 6) : sites de grâce, boss de donjon et de terrain, PNJ, butin notable, matériaux d'artisanat, ennemis, sous-lieux
 * et cartes interactives. Les boss, PNJ, objets et lieux cités sont des liens vers leurs fiches quand le nom est exactement celui d'une entité ; sites de grâce
 * et ennemis restent du texte (ce ne sont pas des entités du jeu de données). Aucun calcul : listes du wiki, absence → section omise.
 */
const props = defineProps<{
  entry: LocationEntry
  /** Tous les lieux du fichier, pour les sous-lieux et la région parente. */
  all: readonly LocationEntry[]
  /** Date d'extraction du fichier. */
  retrieved: string | null
}>()

const ref = computed(() => `location:${props.entry.id}` as const)
const index = computed(() => buildLocationIndex(props.all))
const alerts = computed(() => locationAlerts(props.entry))
const facts = computed(() => locationFacts(props.entry, index.value))
const kindLabel = computed(() => locationKindLabel(props.entry.kind))
const children = computed(() => locationChildren(props.entry, props.all, index.value))

const graces = computed(() => toNameEntries(props.entry.sites_of_grace ?? []))
const bosses = computed(() => toNameEntries(props.entry.bosses ?? []))
const fieldBosses = computed(() => toNameEntries(props.entry.field_bosses ?? []))
const npcs = computed(() => toNameEntries(props.entry.npcs ?? []))
const loot = computed(() => toNameEntries(props.entry.notable_loot ?? []))
const materials = computed(() => toNameEntries(props.entry.crafting_materials ?? []))
const enemies = computed(() => toNameEntries(props.entry.enemies ?? []))
const subRegions = computed(() => locationLinks(props.entry.sub_regions ?? [], index.value))
const dungeons = computed(() => locationLinks(props.entry.dungeons ?? [], index.value))
const landmarks = computed(() => locationLinks(props.entry.landmarks ?? [], index.value))
const hasSubLocations = computed(
  () => subRegions.value.length + dungeons.value.length + landmarks.value.length + children.value.length > 0,
)
const overview = computed(() => props.entry.overview ?? [])
const notes = computed(() => props.entry.notes ?? [])
const mapLinks = INTERACTIVE_MAPS.map((l) => ({ id: l.id, href: l.url, label: labelText(l.labelCode) }))
</script>

<template>
  <SheetHeader
    kind="location"
    :entity-ref="ref"
    :name="entry.name"
    :source="entry.source"
    :url="entry.url"
    :category="kindLabel"
  />

  <SheetAlerts :alerts="alerts" />

  <SheetLayout>
    <template #aside>
      <SheetFacts
        title="Situation"
        :facts="facts"
      />
      <SheetSection
        title="Cartes interactives"
        subtitle="Sites externes, ouverts dans un nouvel onglet."
      >
        <ul class="sh-maps">
          <li
            v-for="m in mapLinks"
            :key="m.id"
          >
            <CxButton
              variant="ghost"
              icon="map"
              :href="m.href"
              external
            >
              {{ m.label }}<span class="cx-sr"> (s'ouvre dans un nouvel onglet)</span>
            </CxButton>
          </li>
        </ul>
      </SheetSection>
    </template>
    <template #main>
      <SheetSection title="Présentation">
        <WikiText
          v-if="overview.length > 0"
          :lines="overview"
          :preferred-kinds="['location', 'boss', 'npc']"
          :skip-ref="ref"
        />
        <WikiText
          v-else-if="entry.summary"
          :lines="[entry.summary]"
          :preferred-kinds="['location', 'boss', 'npc']"
          :skip-ref="ref"
        />
        <p
          v-else
          class="sh-none"
        >
          Le wiki ne donne pas de présentation pour ce lieu.
        </p>
      </SheetSection>

      <SheetSection
        v-if="graces.length > 0"
        title="Sites de grâce"
        :subtitle="`${graces.length} dans ce lieu`"
      >
        <SheetNameList
          label="Sites de grâce"
          :entries="graces"
          plain
        />
      </SheetSection>

      <SheetSection
        v-if="bosses.length + fieldBosses.length > 0"
        title="Boss"
      >
        <div
          v-if="bosses.length > 0"
          class="sh-group"
        >
          <h3 class="cx-label">
            Boss de donjon
          </h3>
          <SheetNameList
            label="Boss de donjon"
            :entries="bosses"
            :link-kinds="['boss']"
            :skip-ref="ref"
          />
        </div>
        <div
          v-if="fieldBosses.length > 0"
          class="sh-group"
        >
          <h3 class="cx-label">
            Boss de terrain
          </h3>
          <SheetNameList
            label="Boss de terrain"
            :entries="fieldBosses"
            :link-kinds="['boss']"
            :skip-ref="ref"
          />
        </div>
      </SheetSection>

      <SheetSection
        v-if="npcs.length > 0"
        title="PNJ"
      >
        <SheetNameList
          label="PNJ"
          :entries="npcs"
          :link-kinds="['npc']"
          :skip-ref="ref"
        />
      </SheetSection>

      <SheetSection
        v-if="loot.length > 0"
        title="Butin notable"
      >
        <SheetNameList
          label="Butin notable"
          :entries="loot"
          :link-kinds="['item', 'weapon', 'armor', 'talisman', 'spell', 'ash', 'spirit']"
          :skip-ref="ref"
        />
      </SheetSection>

      <SheetSection
        v-if="materials.length > 0"
        title="Matériaux d’artisanat"
      >
        <SheetNameList
          label="Matériaux d’artisanat"
          :entries="materials"
          :link-kinds="['item']"
          :skip-ref="ref"
        />
      </SheetSection>

      <SheetSection
        v-if="hasSubLocations"
        title="Sous-lieux"
        subtitle="Régions, donjons et lieux rattachés à celui-ci."
      >
        <div
          v-if="subRegions.length > 0"
          class="sh-group"
        >
          <h3 class="cx-label">
            Sous-régions
          </h3>
          <LocationLinks
            label="Sous-régions"
            :links="subRegions"
          />
        </div>
        <div
          v-if="dungeons.length > 0"
          class="sh-group"
        >
          <h3 class="cx-label">
            Donjons
          </h3>
          <LocationLinks
            label="Donjons"
            :links="dungeons"
          />
        </div>
        <div
          v-if="landmarks.length > 0"
          class="sh-group"
        >
          <h3 class="cx-label">
            Points de repère
          </h3>
          <LocationLinks
            label="Points de repère"
            :links="landmarks"
          />
        </div>
        <div
          v-for="g in children"
          :key="g.id"
          class="sh-group"
        >
          <h3 class="cx-label">
            {{ g.label }} ({{ g.links.length }})
          </h3>
          <LocationLinks
            :label="g.label"
            :links="g.links"
          />
        </div>
      </SheetSection>

      <SheetSection
        v-if="enemies.length > 0"
        title="Ennemis"
      >
        <SheetNameList
          label="Ennemis"
          :entries="enemies"
          plain
        />
      </SheetSection>

      <SheetSection
        v-if="notes.length > 0"
        title="Notes"
      >
        <WikiText
          :lines="notes"
          mode="list"
          :preferred-kinds="['location', 'boss', 'npc']"
          :skip-ref="ref"
        />
      </SheetSection>
    </template>
  </SheetLayout>

  <SheetLicence
    :page-name="entry.wiki_page"
    :url="entry.url"
    :retrieved="retrieved"
  />
</template>

<style scoped>
.sh-maps { display: grid; gap: var(--space-1); justify-items: start; }
.sh-group { display: grid; gap: var(--space-2); }
.sh-none { color: var(--ink-2); font-size: 13px; }
</style>
