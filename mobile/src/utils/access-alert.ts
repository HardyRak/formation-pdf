/**
 * Alerte « accès restreint » partagée par les écrans Formations et Levels.
 * Centralise les libellés et le parcours « Voir profil » pour éviter la
 * duplication entre écrans.
 */
import { Alert } from 'react-native';
import { getAccessDeniedMessage } from '../core/security/access';

export type LockedAccessScope = 'formation' | 'level';

interface PromptOptions {
  scope: LockedAccessScope;
  /** Titre alternatif (ex. « Formation verrouillée 🔒 »). */
  title?: string;
  /** Action « Voir profil » (navigation vers l'onglet Profil). */
  onSeeProfile: () => void;
}

const DEFAULT_TITLES: Record<LockedAccessScope, string> = {
  formation: 'Accès restreint 🔒',
  level: 'Niveau verrouillé 🔒',
};

/** Affiche l'alerte d'accès refusé avec l'action « Voir profil ». */
export function promptLockedAccess({ scope, title, onSeeProfile }: PromptOptions): void {
  Alert.alert(title ?? DEFAULT_TITLES[scope], getAccessDeniedMessage(scope), [
    { text: 'Compris', style: 'default' },
    { text: 'Voir profil', onPress: onSeeProfile },
  ]);
}
