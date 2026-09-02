import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSessionStore } from './auth/session.store';
import { Layout, RequireManager } from './components';
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

export default function App() {
  const bootstrap = useSessionStore((s) => s.bootstrap);

  // Au démarrage, restaure la session si elle existe.
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
