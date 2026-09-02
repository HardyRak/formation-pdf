import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Brand, Button, Card, Field, TextField } from '@/shared/components';
import { useSessionStore } from '@/features/auth/session.store';
import { styles } from './LoginPage.styles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useSessionStore((s) => s.login);
  const error = useSessionStore((s) => s.error);
  const isLoading = useSessionStore((s) => s.status === 'loading');
  const notice = useSessionStore((s) => s.notice);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setClientError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setClientError('Adresse email invalide.');
      return;
    }
    if (!password) {
      setClientError('Le mot de passe est obligatoire.');
      return;
    }
    const isAuthenticated = await login(email, password);
    if (isAuthenticated) navigate('/');
  };

  return (
    <div style={styles.wrapper}>
      <form onSubmit={handleSubmit}>
        <Card style={styles.card}>
          <div style={styles.brand}>
            <Brand size="lg" />
          </div>

          <h1 style={styles.heading}>Espace d'administration</h1>
          <p style={styles.intro}>
            Identifiez-vous avec un compte <strong>responsable de formation</strong>.
          </p>

          {notice ? (
            <div style={styles.notice}>
              <Alert tone="warning">{notice}</Alert>
            </div>
          ) : null}

          <div style={styles.fields}>
            <Field label="Email">
              <TextField
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@entreprise.fr"
                autoComplete="email"
                autoFocus
              />
            </Field>
            <Field label="Mot de passe">
              <TextField
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>
          </div>

          {clientError || error ? (
            <div style={styles.alertWrap}>
              <Alert message={clientError ?? error?.message} />
            </div>
          ) : null}

          <Button type="submit" loading={isLoading} style={styles.submit}>
            Se connecter
          </Button>

          <p style={styles.footer}>Connexion sécurisée • jeton JWT</p>
        </Card>
      </form>
    </div>
  );
}
