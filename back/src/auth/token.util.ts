import { createHash, randomBytes } from 'node:crypto';

/** Génère un jeton de rafraîchissement opaque (192 bits d'entropie). */
export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

/** Hash sha256 d'un jeton — c'est ce hash qui est stocké en base. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
