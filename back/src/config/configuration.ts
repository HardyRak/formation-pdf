/**
 * Configuration centralisée de l'application.
 * Toutes les valeurs proviennent de l'environnement (fichier `.env`),
 * jamais de valeurs codées en dur dans le code métier.
 *
 * La connexion MongoDB est décrite par des variables distinctes
 * (hôte, port, base, identifiants) et assemblée ici en une URI.
 */
export default () => {
  const mongoUri = buildMongoUri();

  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    mongoUri,
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
    /** Dossier de stockage des fichiers PDF (volume). */
    uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
    /** Taille maximale acceptée pour un upload de PDF (Mo). */
    maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB ?? '50', 10),
    /** Faire confiance aux en-têtes X-Forwarded-* (derrière un reverse proxy). */
    trustProxy: parseBool(process.env.TRUST_PROXY, false),
    /** Nombre de requêtes conservées dans le tampon des logs (`/logs`). */
    logBufferSize: parseInt(process.env.LOG_BUFFER_SIZE ?? '1000', 10),
  };
};

/**
 * Convertit une variable d'environnement en booléen.
 * Gère aussi bien une chaîne ('true', '1', 'yes', 'on') qu'un booléen
 * (Joi réécrit les valeurs validées dans `process.env` avant l'exécution
 * de cette fonction de configuration).
 */
function parseBool(value: string | boolean | undefined, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === undefined) return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
}

/**
 * Construit l'URI de connexion MongoDB à partir des variables dédiées :
 *   mongodb://[user:password@]host:port/db[?authSource=…]
 * Sans identifiants → connexion locale sans authentification.
 */
function buildMongoUri(): string {
  const host = process.env.MONGO_HOST ?? 'localhost';
  const port = process.env.MONGO_PORT ?? '27017';
  const database = process.env.MONGO_DB ?? 'pdf-formation';
  const user = process.env.MONGO_USER ?? '';
  const password = process.env.MONGO_PASSWORD ?? '';
  const authSource = process.env.MONGO_AUTH_SOURCE ?? 'admin';

  const credentials = user ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@` : '';
  const params = user ? `?authSource=${encodeURIComponent(authSource)}` : '';

  return `mongodb://${credentials}${host}:${port}/${database}${params}`;
}
