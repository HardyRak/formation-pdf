import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../auth/session.store';
import { Button, TextField, Field, ErrorBox } from '../components/ui';

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
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <form
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
          boxShadow: '0 10px 30px rgba(11,16,48,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            📄
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '18px' }}>PDF Formation</div>
            <div style={{ fontSize: '12px', color: 'var(--text-faint)', fontWeight: '700' }}>Back-office</div>
          </div>
        </div>

        <h1 style={{ fontSize: '20px', margin: '4px 0 4px' }}>Espace d'administration</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 24px' }}>
          Identifiez-vous avec un compte <strong>responsable de formation</strong>.
        </p>

        {notice ? (
          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '12px', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.3)', color: 'var(--warning)' }}>
            {notice}
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
          <div style={{ marginTop: '16px' }}>
            <ErrorBox message={clientError ?? error?.message} />
          </div>
        ) : null}

        <Button type="submit" variant="primary" loading={loading} style={{ width: '100%', marginTop: '20px', justifyContent: 'center' }}>
          Se connecter
        </Button>

        <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-faint)', textAlign: 'center' }}>
          Connexion sécurisée • jeton JWT
        </p>
      </form>
    </div>
  );
}
