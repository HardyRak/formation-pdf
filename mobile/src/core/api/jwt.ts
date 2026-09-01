/**
 * Décodeur JWT portable (base64url) — compatible Hermes et Web.
 * Le backend NestJS signe des JWT standard : la claim `exp` est en SECONDES
 * (RFC 7519), contrairement au mock historique qui utilisait des millisecondes.
 */

export interface JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
  typ?: string;
  iat?: number;
  exp: number;
  [key: string]: unknown;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64Url(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);

  let output = '';
  for (let i = 0; i < padded.length; i += 4) {
    const e1 = B64.indexOf(padded[i]);
    const e2 = B64.indexOf(padded[i + 1]);
    const e3 = B64.indexOf(padded[i + 2]);
    const e4 = B64.indexOf(padded[i + 3]);
    output += String.fromCharCode((e1 << 2) | (e2 >> 4));
    if (e3 !== -1 && padded[i + 2] !== '=') output += String.fromCharCode(((e2 & 15) << 4) | (e3 >> 2));
    if (e4 !== -1 && padded[i + 3] !== '=') output += String.fromCharCode(((e3 & 3) << 6) | e4);
  }

  try {
    return decodeURIComponent(escape(output));
  } catch {
    return output;
  }
}

/** Décode le payload d'un JWT (2ᵉ segment, base64url). Retourne `null` si invalide. */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    return JSON.parse(decodeBase64Url(parts[1])) as JwtPayload;
  } catch {
    return null;
  }
}
