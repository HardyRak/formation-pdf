/**
 * Masque les informations confidentielles dans les logs API.
 * Attention à la vulgarisation : ne jamais exposer tokens, clés, mots de passe.
 */

const SENSITIVE_KEYS = [
  'authorization',
  'cookie',
  'x-api-key',
  'api-key',
  'token',
  'jwt',
  'secret',
  'password',
  'pwd',
  'pass',
  'credential',
  'refreshtoken',
  'accesstoken',
];

const SENSITIVE_BODY_KEYS = [
  'password',
  'pwd',
  'oldpassword',
  'newpassword',
  'token',
  'refreshtoken',
  'accesstoken',
  'jwt',
  'secret',
  'credential',
  'apikey',
  'api-key',
  'authorization',
  'cookie',
];

export function maskHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
      masked[key] = '[MASQUÉ - CONFIDENTIEL]';
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

export function maskBody(body: unknown): unknown {
  if (body === null || body === undefined) return body;
  if (typeof body === 'string') {
    // Masquer tout contenu qui ressemble à un token JWT ou clé
    return body.replace(/([a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,})/g, '[MASQUÉ - TOKEN]');
  }
  if (Array.isArray(body)) {
    return body.map(maskBody);
  }
  if (typeof body === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_BODY_KEYS.some((s) => lower.includes(s))) {
        masked[key] = '[MASQUÉ - CONFIDENTIEL]';
      } else {
        masked[key] = maskBody(value);
      }
    }
    return masked;
  }
  return body;
}

export function maskUrl(url: string): string {
  try {
    const u = new URL(url, 'http://localhost');
    // Masquer d'éventuelles clés dans la query
    const params = new URLSearchParams(u.search);
    for (const [key, value] of params.entries()) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
        params.set(key, '[MASQUÉ]');
      }
    }
    u.search = params.toString();
    return u.pathname + (u.search ? '?' + u.search : '');
  } catch {
    return url;
  }
}
