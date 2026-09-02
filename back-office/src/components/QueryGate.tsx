import type { ReactNode } from 'react';
import { Loading } from './Loading';
import { Alert } from './Alert';

/** États asynchrones standard d'une requête : chargement / erreur / contenu. */
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
  children: ReactNode;
}) {
  if (isLoading) return <Loading label={loadingLabel} />;
  if (isError) return <Alert message={errorMessage} onRetry={onRetry} />;
  return <>{children}</>;
}
