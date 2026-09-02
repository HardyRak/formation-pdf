import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionStore } from '@/features/auth/session.store';
import { styles } from './RequireManager.styles';

/** Garde : route réservée aux comptes authentifiés MANAGER. */
export function RequireManager({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const bootstrapping = useSessionStore((s) => s.bootstrapping);
  const user = useSessionStore((s) => s.user);

  if (bootstrapping) {
    return <div style={styles.fullscreen}>Chargement…</div>;
  }
  if (status !== 'authenticated' || user?.role !== 'MANAGER') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
