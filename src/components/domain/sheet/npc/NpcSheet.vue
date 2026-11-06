<!-- Contenu de la fiche d'un PNJ chargé : valeurs clés, présentation, boutique, équipement, quête à cocher, objets de quête, lieux et notes. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { NpcEntry } from '../../../../data/types/npcs.ts'
import CxValue from '../../../ds/CxValue.vue'
import WikiInline from '../../WikiInline.vue'
import WikiTable from '../../WikiTable.vue'
import WikiText from '../../WikiText.vue'
import SheetAlerts from '../SheetAlerts.vue'
import SheetFacts from '../SheetFacts.vue'
import SheetHeader from '../SheetHeader.vue'
import SheetLayout from '../SheetLayout.vue'
import SheetLicence from '../SheetLicence.vue'
import SheetSection from '../SheetSection.vue'
import ShopTable from '../shop/ShopTable.vue'
import NpcQuest from './NpcQuest.vue'
import { meaningfulLines, npcAlerts, npcFacts, npcTables, questItemRows, translateHeaders } from './npcModel.ts'

/**
 * Fiche d'un PNJ (`/pnj/:id`, brief § 6) : inventaire de boutique en tableau (objet, prix, stock, condition), étapes de quête à cocher, objets de quête,
 * équipement et rencontres. Les tableaux du wiki n'ont pas tous le même rangement : ils sont classés par leurs en-têtes (`npcTables`). Aucun calcul :
 * valeurs du wiki, `null` → « Non documenté ».
 */
const props = defineProps<{
  npc: NpcEntry
  /** Date d'extraction du fichier. */
  retrieved: string | null
}>()

const ref = computed(() => `npc:${props.npc.id}` as const)
const alerts = computed(() => npcAlerts(props.npc))
const facts = computed(() => npcFacts(props.npc))
const tables = computed(() => npcTables(props.npc))
const shops = computed(() => tables.value.filter((t) => t.role === 'shop'))
const questItems = computed(() => tables.value.filter((t) => t.role === 'quest-items').flatMap((t) => questItemRows(t.rows)))
const equipment = computed(() => tables.value.filter((t) => t.role === 'equipment'))
const encounters = computed(() => tables.value.filter((t) => t.role === 'encounters'))
const others = computed(() => tables.value.filter((t) => t.role === 'other'))

const overview = computed(() => props.npc.overview?.text ?? [])
const overviewTables = computed(() => props.npc.overview?.tables ?? [])
const infoLines = computed(() => meaningfulLines(props.npc.character_information))
const shopLines = computed(() => meaningfulLines(props.npc.shop_inventory))
const questLines = computed(() => props.npc.questline?.text ?? [])
const questTables = computed(() => props.npc.questline?.tables ?? [])
const locationLines = computed(() => props.npc.location_details ?? [])
const notes = computed(() => props.npc.notes ?? [])
const hasOverview = computed(() => overview.value.length > 0 || overviewTables.value.length > 0)
const KINDS = ['location', 'boss', 'npc', 'item'] as const
</script>

<template>
  <SheetHeader
    kind="npc"
    :entity-ref="ref"
    :name="npc.derived.displayName"
    :source="npc.source"
    :url="npc.url"
    :category="typeof npc.infobox.role === 'string' ? npc.infobox.role : null"
  />

  <SheetAlerts :alerts="alerts" />

  <SheetLayout>
    <template #aside>
      <SheetFacts
        title="Identité"
        :facts="facts"
      />
    </template>
    <template #main>
      <SheetSection title="Présentation">
        <template v-if="hasOverview">
          <WikiText
            v-if="overview.length > 0"
            :lines="overview"
            :preferred-kinds="KINDS"
            :skip-ref="ref"
          />
          <WikiTable
            v-for="(t, i) in overviewTables"
            :key="i"
            :rows="t"
            :caption="`Présentation, tableau ${i + 1}`"
            :preferred-kinds="KINDS"
            :skip-ref="ref"
          />
        </template>
        <WikiText
          v-else-if="npc.summary"
          :lines="[npc.summary]"
          :preferred-kinds="KINDS"
          :skip-ref="ref"
        />
        <p
          v-else
          class="sh-none"
        >
          <CxValue :value="null" /> Le wiki ne donne pas de présentation pour ce PNJ.
        </p>
      </SheetSection>

      <SheetSection
        v-if="shops.length > 0"
        title="Boutique"
        subtitle="Inventaire du marchand : objet, prix, stock et condition, selon le wiki."
      >
        <WikiText
          v-if="shopLines.length > 0"
          :lines="shopLines"
          :preferred-kinds="KINDS"
          :skip-ref="ref"
        />
        <ShopTable
          v-for="(t, i) in shops"
          :key="i"
          :rows="t.rows"
          :caption="shops.length > 1 ? `Inventaire, tableau ${i + 1}` : 'Inventaire de la boutique'"
          :skip-ref="ref"
        />
      </SheetSection>

      <NpcQuest
        v-if="questLines.length > 0"
        :lines="questLines"
        :entity-ref="ref"
      />
      <SheetSection
        v-if="questTables.length > 0"
        title="Tableaux de la quête"
      >
        <WikiTable
          v-for="(t, i) in questTables"
          :key="i"
          :rows="t"
          :caption="`Quête, tableau ${i + 1}`"
          :preferred-kinds="KINDS"
          :skip-ref="ref"
        />
      </SheetSection>

      <SheetSection
        v-if="questItems.length > 0"
        title="Objets de quête"
        subtitle="Ce que le PNJ donne, et comment l’obtenir."
      >
        <ul class="sh-qi">
          <li
            v-for="(q, i) in questItems"
            :key="i"
          >
            <span class="sh-qi-name">
              <WikiInline
                :text="q.item.name"
                :preferred-kinds="['item', 'weapon', 'armor', 'talisman', 'spell', 'ash']"
                :skip-ref="ref"
              /><span
                v-if="q.item.count !== null"
                class="sh-qi-count"
              > × {{ q.item.count }}</span>
            </span>
            <span class="sh-qi-req">
              <WikiInline
                v-if="q.requirement"
                :text="q.requirement"
                :preferred-kinds="KINDS"
                :skip-ref="ref"
              />
              <CxValue
                v-else
                :value="null"
              />
            </span>
          </li>
        </ul>
      </SheetSection>

      <SheetSection
        v-if="equipment.length + encounters.length > 0"
        title="Équipement et combat"
        subtitle="Tableaux de la page du wiki."
      >
        <WikiTable
          v-for="(t, i) in encounters"
          :key="`e${i}`"
          :rows="translateHeaders(t.rows)"
          caption="Rencontres"
          :preferred-kinds="KINDS"
          :skip-ref="ref"
        />
        <WikiTable
          v-for="(t, i) in equipment"
          :key="`q${i}`"
          :rows="translateHeaders(t.rows)"
          caption="Équipement"
          :preferred-kinds="['weapon', 'armor', 'spell', 'item', 'talisman']"
          :skip-ref="ref"
        />
      </SheetSection>

      <SheetSection
        v-if="infoLines.length > 0"
        title="Informations du wiki"
      >
        <WikiText
          :lines="infoLines"
          :preferred-kinds="KINDS"
          :skip-ref="ref"
        />
      </SheetSection>

      <SheetSection
        v-if="locationLines.length > 0"
        title="Où le trouver"
      >
        <WikiText
          :lines="locationLines"
          :preferred-kinds="KINDS"
          :skip-ref="ref"
        />
      </SheetSection>

      <SheetSection
        v-if="others.length > 0"
        title="Autres tableaux du wiki"
      >
        <WikiTable
          v-for="(t, i) in others"
          :key="i"
          :rows="t.rows"
          :caption="`Tableau ${i + 1}`"
          :preferred-kinds="KINDS"
          :skip-ref="ref"
        />
      </SheetSection>

      <SheetSection title="Notes">
        <WikiText
          v-if="notes.length > 0"
          :lines="notes"
          mode="list"
          :preferred-kinds="KINDS"
          :skip-ref="ref"
        />
        <p
          v-else
          class="sh-none"
        >
          <CxValue :value="null" /> Le wiki ne donne pas de note pour ce PNJ.
        </p>
      </SheetSection>
    </template>
  </SheetLayout>

  <SheetLicence
    :page-name="npc.wiki_page"
    :url="npc.url"
    :retrieved="retrieved"
  />
</template>

<style scoped>
.sh-none { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; color: var(--ink-2); font-size: 13px; }
.sh-qi { display: grid; gap: var(--space-3); }
.sh-qi li { display: grid; gap: 2px; }
.sh-qi-name { color: var(--ink); font-weight: 600; font-size: 14px; }
.sh-qi-count { color: var(--ink-3); font-weight: 400; font-variant-numeric: tabular-nums; }
.sh-qi-req { color: var(--ink-2); font-size: 13px; line-height: 19px; overflow-wrap: anywhere; }
</style>
