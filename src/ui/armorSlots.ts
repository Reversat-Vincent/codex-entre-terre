// Libellés français des emplacements d'armure (Tête, Torse, Bras, Jambes) : une seule table pour le catalogue, la fiche et son fil d'Ariane (D46).
// Les valeurs de `slot` et `category` des données sont en anglais (Head, Chest, Arms, Legs).

/** Libellés des emplacements, par valeur des données. */
const ARMOR_SLOT_LABELS: Readonly<Record<string, string>> = { Head: 'Tête', Chest: 'Torse', Arms: 'Bras', Legs: 'Jambes' }

/**
 * Libellé français d'un emplacement d'armure.
 * @param slot Valeur de `slot` ou de `category` d'une armure.
 * @returns Le libellé ; une valeur inconnue est reprise telle quelle.
 */
export function armorSlotLabel(slot: string): string {
  return Object.hasOwn(ARMOR_SLOT_LABELS, slot) ? (ARMOR_SLOT_LABELS[slot] as string) : slot
}
