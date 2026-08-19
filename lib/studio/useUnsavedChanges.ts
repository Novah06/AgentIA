'use client';

import { useEffect } from 'react';

/**
 * Avertit avant de quitter la page quand des modifications ne sont pas
 * enregistrées. Couvre la fermeture d'onglet, le rechargement et le retour
 * arrière du navigateur — les navigations internes, elles, sont couvertes par
 * la barre d'enregistrement rendue visible en permanence.
 */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;

    function handler(event: BeforeUnloadEvent) {
      // Les navigateurs imposent leur propre message ; seul le fait
      // d'annuler l'événement compte.
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}
