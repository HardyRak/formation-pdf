import React, { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

/** Bouton principal / secondaire / danger / tantale. */
export function Button({
  variant = 'primary',
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
}) {
  const base: React.CSSProperties = {
    padding: '10px 18px',
    borderRadius: '12px',
    border: 'none',
    fontWeight: '700',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'opacity 0.15s',
    opacity: props.disabled ? 0.5 : 1,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--primary)', color: '#fff' },
    secondary: { background: 'var(--surface-alt)', color: 'var(--text)' },
    danger: { background: 'var(--danger)', color: '#fff' },
    ghost: { background: 'transparent', color: 'var(--primary)' },
  };
  return (
    <button style={{ ...base, ...variants[variant] }} {...props}>
      {loading ? 'Chargement…' : children}
    </button>
  );
}

/** Carte blanche. */
export function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-md)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Badge coloré. */
export function Badge({
  children,
  color = 'var(--primary)',
  bg,
}: {
  children: ReactNode;
  color?: string;
  bg?: string;
}) {
  return (
    <span
      style={{
        background: bg ?? color + '1f',
        color,
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: '700',
      }}
    >
      {children}
    </span>
  );
}

/** Libellé de champ. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
      {label}
      {children}
    </label>
  );
}

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        padding: '10px 12px',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text)',
        width: '100%',
        ...props.style,
      }}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        padding: '10px 12px',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text)',
        width: '100%',
        resize: 'vertical',
        ...props.style,
      }}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        padding: '10px 12px',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text)',
        width: '100%',
        ...props.style,
      }}
    />
  );
}

/** État chargement. */
export function Loading({ label = 'Chargement…' }: { label?: string }) {
  return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>{label}</div>;
}

/** État vide. */
export function Empty({ label = 'Aucune donnée', action }: { label?: string; action?: ReactNode }) {
  return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-faint)' }}>
      {label}
      {action ? <div style={{ marginTop: '12px' }}>{action}</div> : null}
    </div>
  );
}

/** Erreur. */
export function ErrorBox({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: '12px',
        background: 'rgba(220,38,38,0.08)',
        border: '1px solid rgba(220,38,38,0.25)',
        color: 'var(--danger)',
      }}
    >
      {message ?? 'Une erreur est survenue.'}
      {onRetry ? (
        <Button variant="ghost" onClick={onRetry} style={{ marginLeft: '12px' }}>
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}
