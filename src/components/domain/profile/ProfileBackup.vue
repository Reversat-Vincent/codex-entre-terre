<!-- Section « Sauvegarde » : export de l'état dans un fichier JSON, import avec résumé et confirmation, annulation de l'import. -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Refusal } from '../../../persistence/document.ts'
import type { ImportPreview } from '../../../persistence/importer.ts'
import { useAppStore } from '../../../stores/app.ts'
import { useCriteriaStore } from '../../../stores/criteria.ts'
import { usePinsStore } from '../../../stores/pins.ts'
import { useProfilesStore } from '../../../stores/profiles.ts'
import { useSearchStore } from '../../../stores/search.ts'
import { useToastsStore } from '../../../stores/toasts.ts'
import CxButton from '../../ds/CxButton.vue'
import CxDialog from '../../ds/CxDialog.vue'
import CxNote from '../../ds/CxNote.vue'
import { compareRows, formatDateTime, shownIssues } from './profileModel.ts'
import ProfileSection from './ProfileSection.vue'

/**
 * Sauvegarde et restauration (cahier des charges § 5, architecture § 7).
 * - Export : le store `app` fournit le nom et le contenu du fichier ; le composant ne fait que le télécharger (`Blob`).
 * - Import : le fichier est lu et validé en entier par le store sans rien écrire ; un refus s'affiche tel quel (message du validateur et premiers écarts)
 *   et rien n'est modifié. Un fichier valide ouvre une confirmation qui compare l'état actuel et l'état importé ; seule la confirmation remplace tout.
 * - « Annuler l'import » reste sur la page tant que le store garde l'instantané (jusqu'à la fin de la session, même après un rechargement).
 * Le contenu du fichier n'est affiché que par interpolation (jamais `v-html`).
 */
const app = useAppStore()
const profiles = useProfilesStore()
const pins = usePinsStore()
const criteria = useCriteriaStore()
const search = useSearchStore()
const toasts = useToastsStore()

const fileInput = ref<HTMLInputElement | null>(null)
const preview = ref<ImportPreview | null>(null)
const confirmOpen = ref(false)
const refusal = ref<Refusal | null>(null)
/** Vrai après un import réussi, jusqu'à son annulation ou la fin de la session. */
const imported = ref(false)
const busy = ref(false)

const readonly = computed(() => app.storage === 'readonly-newer')
/** Les messages du validateur disent parfois déjà que rien n'a été modifié : on ne le répète pas. */
const untouchedNote = computed(() => (refusal.value && !refusal.value.message.includes('rien n’a été modifié') ? ' Rien n’a été modifié.' : ''))
const issues = computed(() => shownIssues(refusal.value?.issues ?? []))
const rows = computed(() =>
  preview.value
    ? compareRows(
        {
          profiles: profiles.items.length,
          pins: pins.items.length,
          defeatedBosses: criteria.criteria.progress.defeated.length,
          recentSearches: search.recent.length,
        },
        preview.value.summary,
      )
    : [],
)

// Fermer la fenêtre (Annuler, Échap, voile) abandonne l'aperçu : rien n'a été écrit.
watch(confirmOpen, (open) => {
  if (!open) preview.value = null
})

/** Télécharge le fichier d'export par un `Blob` ; le nom vient du store. */
function exportState(): void {
  try {
    const { fileName, content } = app.exportFile()
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.append(link)
    link.click()
    link.remove()
    // Libération différée : certains navigateurs lisent l'adresse après le retour de `click()`.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toasts.push({ message: `Sauvegarde exportée : ${fileName}`, kind: 'success', icon: 'check' })
  } catch {
    toasts.push({ message: 'L’export a échoué : la sauvegarde n’a pas pu être créée.', kind: 'error', icon: 'alert' })
  }
}

function chooseFile(): void {
  fileInput.value?.click()
}

/** Lit et valide le fichier choisi ; ouvre la confirmation s'il est valide, affiche le refus sinon. */
async function onFileChosen(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Vidé pour que le même fichier puisse être choisi de nouveau après un refus ou une annulation.
  input.value = ''
  if (!file) return
  refusal.value = null
  busy.value = true
  try {
    const result = await app.previewImport(file)
    if (result.ok) {
      preview.value = result.value
      confirmOpen.value = true
    } else {
      refusal.value = result.error
    }
  } finally {
    busy.value = false
  }
}

/** Remplace tout l'état par celui du fichier ; un refus du store (lecture seule) est affiché sans rien modifier. */
function confirmImport(): void {
  if (!preview.value) return
  const result = app.confirmImport(preview.value)
  confirmOpen.value = false
  if (result.ok) {
    refusal.value = null
    imported.value = true
  } else {
    refusal.value = result.error
  }
}

function undoImport(): void {
  if (app.undoImport()) imported.value = false
}
</script>

<template>
  <ProfileSection
    title="Sauvegarde"
    description="Exportez votre état dans un fichier pour le conserver ou le déplacer vers un autre appareil, puis importez-le à l’endroit voulu."
  >
    <div class="v-profile-backup">
      <div class="v-profile-backup-block">
        <h3 class="titre-s">
          Exporter
        </h3>
        <p class="cx-ink2">
          Un fichier JSON contient vos profils, Ma liste, vos boss vaincus, la disposition du tableau de bord, vos préférences et vos recherches récentes.
        </p>
        <div>
          <CxButton
            variant="primary"
            icon="save"
            @click="exportState"
          >
            Exporter ma sauvegarde
          </CxButton>
        </div>
      </div>

      <div class="v-profile-backup-block">
        <h3 class="titre-s">
          Importer
        </h3>
        <p class="cx-ink2">
          L’import remplace tout votre état actuel après confirmation. Le fichier est vérifié en entier avant : s’il est invalide, trop gros (plus de 1&nbsp;Mo) ou d’une version inconnue, il est refusé et rien n’est modifié.
        </p>
        <div class="v-profile-backup-actions">
          <CxButton
            icon="plus"
            :disabled="readonly || busy"
            @click="chooseFile"
          >
            Choisir un fichier…
          </CxButton>
          <CxButton
            v-if="app.canUndoImport"
            icon="refresh"
            @click="undoImport"
          >
            Annuler l’import
          </CxButton>
        </div>
        <input
          ref="fileInput"
          class="v-profile-file"
          type="file"
          accept=".json,application/json"
          tabindex="-1"
          aria-label="Fichier de sauvegarde à importer"
          @change="onFileChosen"
        >
        <p
          v-if="readonly"
          class="cx-muted v-profile-small"
        >
          L’import est désactivé : vos données enregistrées viennent d’une version plus récente de l’application.
        </p>
      </div>
    </div>

    <CxNote
      v-if="refusal"
      tone="warn"
      title="Import refusé."
      role="alert"
    >
      {{ refusal.message }}{{ untouchedNote }}
      <template v-if="issues.shown.length > 0">
        <ul class="v-profile-issues">
          <li
            v-for="issue in issues.shown"
            :key="issue.path + issue.message"
          >
            <code>{{ issue.path }}</code> : {{ issue.message }}
          </li>
        </ul>
        <span v-if="issues.more > 0">… et {{ issues.more }} autre{{ issues.more > 1 ? 's' : '' }} écart{{ issues.more > 1 ? 's' : '' }}.</span>
      </template>
    </CxNote>

    <CxNote
      v-else-if="imported && app.canUndoImport"
      tone="info"
      icon="check-c"
      title="Sauvegarde importée."
      role="status"
    >
      Votre état précédent est remplacé. « Annuler l’import » le restaure, jusqu’à la fin de cette session.
    </CxNote>

    <CxDialog
      v-model="confirmOpen"
      title="Remplacer votre état par cette sauvegarde ?"
      :close-on-backdrop="false"
    >
      <div
        v-if="preview"
        class="v-profile-confirm"
      >
        <CxNote
          tone="warn"
          title="Remplacement complet."
        >
          Vos profils, Ma liste, boss vaincus, disposition, préférences et recherches récentes actuels sont remplacés par ceux du fichier. Vous pourrez annuler jusqu’à la fin de la session.
        </CxNote>

        <dl class="v-profile-facts">
          <div>
            <dt>Exportée le</dt>
            <dd>{{ formatDateTime(preview.summary.exportedAt) ?? 'Non documenté' }}</dd>
          </div>
          <div>
            <dt>Version de l’application</dt>
            <dd>{{ preview.summary.appVersion ?? 'Non documenté' }}</dd>
          </div>
          <div>
            <dt>Version du schéma</dt>
            <dd>
              {{ preview.summary.schemaVersion }}
              <template v-if="preview.summary.migratedFrom !== null">
                (convertie depuis la version {{ preview.summary.migratedFrom }})
              </template>
            </dd>
          </div>
        </dl>

        <table class="v-profile-compare">
          <caption class="cx-sr">
            Contenu actuel et contenu après l’import
          </caption>
          <thead>
            <tr>
              <th scope="col">
                Élément
              </th>
              <th scope="col">
                Actuellement
              </th>
              <th scope="col">
                Après l’import
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.label"
            >
              <th scope="row">
                {{ row.label }}
              </th>
              <td>{{ row.current }}</td>
              <td>{{ row.imported }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <CxButton @click="confirmOpen = false">
          Annuler
        </CxButton>
        <CxButton
          variant="primary"
          icon="refresh"
          @click="confirmImport"
        >
          Remplacer mes données
        </CxButton>
      </template>
    </CxDialog>
  </ProfileSection>
</template>

<style>
.v-profile-backup { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-5); }
.v-profile-backup-block { display: grid; align-content: start; gap: var(--space-2); min-width: 0; }
.v-profile-backup-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
/* Le champ natif reste dans le DOM (nécessaire à l'ouverture du sélecteur) mais n'est pas affiché : le bouton « Choisir un fichier… » le déclenche. */
.v-profile-file { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.v-profile-small { font-size: 12px; line-height: 17px; }
.v-profile-issues { display: grid; gap: var(--space-1); margin: var(--space-2) 0; padding-left: var(--space-4); list-style: disc; overflow-wrap: anywhere; }
.v-profile-issues code { font-family: var(--font-sans); font-size: 12px; font-weight: 600; color: var(--ink); }
.v-profile-confirm { display: grid; gap: var(--space-4); }
.v-profile-facts { display: grid; gap: var(--space-1); margin: 0; }
.v-profile-facts > div { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.v-profile-facts dt { min-width: 180px; color: var(--ink-3); }
.v-profile-facts dd { margin: 0; color: var(--ink); font-variant-numeric: tabular-nums; }
.v-profile-compare { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.v-profile-compare th, .v-profile-compare td { padding: var(--space-1) var(--space-2); border-bottom: 1px solid var(--line); text-align: right; }
.v-profile-compare th[scope="col"]:first-child, .v-profile-compare th[scope="row"] { text-align: left; font-weight: 400; color: var(--ink-2); }
.v-profile-compare thead th { color: var(--ink-3); font: 600 12px/16px var(--font-sans); }
.v-profile-compare td:last-child { color: var(--gold-text); font-weight: 600; }
@media (max-width: 1279px) { .v-profile-backup { grid-template-columns: minmax(0, 1fr); } }
</style>
