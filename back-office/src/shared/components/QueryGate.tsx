import type { ReactNode } from 'react';
import { Loading } from './Loading';
import { Alert } from './Alert';

/**
 * États asynchrones standard d'une requête : chargement / erreur / contenu.
 *
 * `children` peut être une fonction de rendu : elle n'est appelée QUE lorsque
 * la requête est prête, ce qui permet d'y lire `query.data` sans risque
 * (un children JSX, lui, serait évalué avant le garde).
 */
export function QueryGate({
  isLoading,
  isError,
  errorMessage,
  onRetry,
  loadingLabel,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  loadingLabel?: string;
  children: ReactNode | (() => ReactNode);
}) {
  if (isLoading) return <Loading label={loadingLabel} />;
  if (isError) return <Alert message={errorMessage} onRetry={onRetry} />;
  return <>{typeof children === 'function' ? children() : children}</>;
}
