<!-- Valeurs clés d'une fiche : liste « libellé, valeur » où chaque valeur passe par CxValue (null → « Non documenté »), avec liens croisés pour les noms cités. -->
<script setup lang="ts">
import CxValue from '../../ds/CxValue.vue'
import WikiInline from '../WikiInline.vue'
import SheetSection from './SheetSection.vue'
import { splitNames } from './sheetModel.ts'
import type { SheetFact } from './sheetModel.ts'

/**
 * Liste de valeurs clés (colonne latérale d'une fiche). Les valeurs sont celles du wiki, sans conversion ni calcul : le formatage des nombres est celui de
 * `CxValue`. Un nom cité (matériau, vendeur) devient un lien vers sa fiche quand c'est exactement le nom d'une entité (`resolveName`).
 */
defineProps<{
  title: string
  subtitle?: string
  facts: readonly SheetFact[]
}>()
</script>

<template>
  <SheetSection
    :title="title"
    :subtitle="subtitle"
  >
    <dl class="sh-facts">
      <div
        v-for="f in facts"
        :key="f.id"
        class="sh-fact"
      >
        <dt>{{ f.label }}</dt>
        <dd>
          <template v-if="typeof f.value === 'string' && f.linkKinds">
            <template v-if="f.nameList">
              <template
                v-for="(n, i) in splitNames(f.value)"
                :key="i"
              >
                <span v-if="i > 0"> / </span><WikiInline
                  :text="n"
                  :preferred-kinds="f.linkKinds"
                />
              </template>
            </template>
            <WikiInline
              v-else
              :text="f.value"
              :preferred-kinds="f.linkKinds"
            />
          </template>
          <template v-else>
            <CxValue
              :value="f.value"
              :format="f.format"
              :digits="f.digits"
            />
            <span
              v-if="f.unit && typeof f.value === 'number'"
              class="sh-unit"
            > {{ f.unit }}</span>
          </template>
          <span
            v-if="f.hint"
            class="sh-hint"
          >{{ f.hint }}</span>
        </dd>
      </div>
    </dl>
  </SheetSection>
</template>

<style scoped>
.sh-facts { display: grid; gap: var(--space-3); }
.sh-fact { display: grid; grid-template-columns: minmax(0, 120px) minmax(0, 1fr); gap: var(--space-3); align-items: baseline; font-size: 14px; line-height: 20px; }
.sh-fact dt { color: var(--ink-3); font-size: 12px; line-height: 17px; }
.sh-fact dd { min-width: 0; color: var(--ink); font-weight: 600; overflow-wrap: anywhere; }
.sh-unit { margin-left: 4px; color: var(--ink-3); font-weight: 400; }
.sh-hint { display: block; margin-top: 2px; color: var(--ink-3); font-size: 12px; font-weight: 400; line-height: 17px; }
</style>
