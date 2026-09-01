/**
 * Configuration centralisée de l'application.
 * Toutes les valeurs proviennent de l'environnement (fichier `.env`),
 * jamais de valeurs codées en dur dans le code métier.
 */
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/pdf-formation',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    /** Durée de vie du jeton d'accès (secondes). */
    accessTtlSeconds: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10),
    /** Durée de vie du jeton de rafraîchissement (secondes). */
    refreshTtlSeconds: parseInt(process.env.JWT_REFRESH_TTL ?? '604800', 10),
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:8081,http://localhost:19006')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
});
