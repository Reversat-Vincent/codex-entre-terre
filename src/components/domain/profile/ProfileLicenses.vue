<!-- Section « Licences et sources » : code, données, polices, liens vers Fextralife et mention d'outil de fan non officiel. -->
<script setup lang="ts">
import ProfileSection from './ProfileSection.vue'

/**
 * Licences et sources (cahier des charges § 9, README du dépôt, section Licences). Texte fixe : aucune donnée n'est lue ici.
 * Les liens s'ouvrent dans un nouvel onglet (`rel="noopener noreferrer"`) et l'annoncent aux lecteurs d'écran ; aucune requête n'est faite vers ces sites.
 */
interface SourceLink {
  href: string
  label: string
}

const WIKI: SourceLink = { href: 'https://eldenring.wiki.gg', label: 'eldenring.wiki.gg' }
const CC_BY_SA: SourceLink = { href: 'https://creativecommons.org/licenses/by-sa/4.0/', label: 'CC BY-SA 4.0' }
const OFL: SourceLink = { href: 'https://openfontlicense.org/open-font-license-official-text/', label: 'SIL Open Font License 1.1' }
const FEXTRALIFE: SourceLink = { href: 'https://eldenring.wiki.fextralife.com', label: 'Fextralife' }
</script>

<template>
  <ProfileSection title="Licences et sources">
    <ul class="v-profile-licenses">
      <li>
        <b>Code de l’application.</b>
        Aucune licence : le code reste soumis au droit d’auteur, tous droits réservés. Vous pouvez le consulter, pas le réutiliser sans autorisation.
      </li>
      <li>
        <b>Données du jeu.</b>
        Elles viennent d’Eldenpedia (<a
          :href="WIKI.href"
          target="_blank"
          rel="noopener noreferrer"
        >{{ WIKI.label }}<span class="cx-sr"> (s’ouvre dans un nouvel onglet)</span></a>) et restent sous licence
        <a
          :href="CC_BY_SA.href"
          target="_blank"
          rel="noopener noreferrer"
        >{{ CC_BY_SA.label }}<span class="cx-sr"> (s’ouvre dans un nouvel onglet)</span></a>.
        Toute rediffusion crédite les contributeurs d’eldenring.wiki.gg et conserve la même licence. Les noms et descriptions s’affichent en anglais, tels qu’extraits.
      </li>
      <li>
        <b>Polices.</b>
        Cormorant Garamond et Source Sans 3 sont diffusées sous
        <a
          :href="OFL.href"
          target="_blank"
          rel="noopener noreferrer"
        >{{ OFL.label }}<span class="cx-sr"> (s’ouvre dans un nouvel onglet)</span></a>
        et servies par ce site, sans service tiers.
      </li>
      <li>
        <b>Fextralife.</b>
        Cité en liens seulement (fiches, carte interactive, guides), qui s’ouvrent dans un nouvel onglet :
        <a
          :href="FEXTRALIFE.href"
          target="_blank"
          rel="noopener noreferrer"
        >{{ FEXTRALIFE.label }}<span class="cx-sr"> (s’ouvre dans un nouvel onglet)</span></a>.
        Aucun contenu de ce site n’est copié ni chargé par l’application.
      </li>
      <li>
        <b>Outil de fan non officiel.</b>
        <i>Elden Ring</i> est une marque de FromSoftware et de Bandai Namco ; ce projet n’est affilié à aucune de ces sociétés et n’est pas approuvé par elles.
      </li>
    </ul>
  </ProfileSection>
</template>

<style>
.v-profile-licenses { display: grid; gap: var(--space-3); margin: 0; padding: 0; list-style: none; color: var(--ink-2); font-size: 14px; line-height: 21px; max-width: 80ch; }
.v-profile-licenses b { color: var(--ink); font-weight: 600; }
.v-profile-licenses a { color: var(--gold-text); text-decoration: underline; text-underline-offset: 2px; }
</style>
