/** Utilisateur authentifié injecté dans la requête par le JwtAuthGuard. */
export interface AuthUser {
  id: string;
  email: string;
  role: 'LEARNER' | 'MANAGER';
}
