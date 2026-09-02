import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../auth/session.store';
import { Alert, Brand, Button, Card, Field, TextField } from '../components';
import { styles } from './LoginPage.styles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useSessionStore((s) => s.login);
  const error = useSessionStore((s) => s.error);
  const loading = useSessionStore((s) => s.status === 'loading');
  const notice = useSessionStore((s) => s.notice);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setClientError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setClientError("Adresse email invalide.");
      return;
    }
    if (!password) {
      setClientError("Le mot de passe est obligatoire.");
      return;
    }
    const ok = await login(email, password);
    if (ok) navigate('/');
  };

  return (
    <div style={styles.wrapper}>
      <form onSubmit={submit}>
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

          <Button type="submit" loading={loading} style={styles.submit}>
            Se connecter
          </Button>

          <p style={styles.footer}>Connexion sécurisée • jeton JWT</p>
        </Card>
      </form>
    </div>
  );
}
