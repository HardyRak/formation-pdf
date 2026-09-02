import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSessionStore } from '@/features/auth/session.store';
import { RequireManager } from '@/features/auth/components/RequireManager';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { FormationsPage } from '@/features/formations/pages/FormationsPage';
import { LevelsPage } from '@/features/formations/pages/LevelsPage';
import { DocumentsPage } from '@/features/formations/pages/DocumentsPage';
import { AccessPage } from '@/features/access/pages/AccessPage';
import { Layout } from '@/shared/components';
import '../theme.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export function App() {
  const bootstrap = useSessionStore((s) => s.bootstrap);

  // Au démarrage, restaure la session si elle existe : sans cet appel,
  // RequireManager reste bloqué sur « Chargement… » (régression ec30199).
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireManager>
                <Layout />
              </RequireManager>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="formations" element={<FormationsPage />} />
            <Route path="formations/:formationId/levels" element={<LevelsPage />} />
            <Route path="levels/:levelId/documents" element={<DocumentsPage />} />
            <Route path="access" element={<AccessPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
