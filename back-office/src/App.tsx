import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSessionStore } from './auth/session.store';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FormationsPage } from './pages/FormationsPage';
import { LevelsPage } from './pages/LevelsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { AccessPage } from './pages/AccessPage';
import './theme.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

/** Garde : route réservée aux comptes authentifiés MANAGER. */
function RequireManager({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const bootstrapping = useSessionStore((s) => s.bootstrapping);
  const user = useSessionStore((s) => s.user);

  if (bootstrapping) {
    return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>Chargement…</div>;
  }
  if (status !== 'authenticated' || user?.role !== 'MANAGER') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

/** Au démarrage, restaure la session si elle existe. */
function Bootstrap() {
  const bootstrap = useSessionStore((s) => s.bootstrap);
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Bootstrap />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireManager>
                <Layout />
              </RequireManager>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/formations" element={<FormationsPage />} />
            <Route path="/formations/:formationId/levels" element={<LevelsPage />} />
            <Route path="/levels/:levelId/documents" element={<DocumentsPage />} />
            <Route path="/access" element={<AccessPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
