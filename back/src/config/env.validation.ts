import * as Joi from 'joi';

/**
 * Validation du fichier `.env` au démarrage.
 * L'application refuse de démarrer si la configuration est invalide
 * ou incomplète (fail-fast).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  // ---- MongoDB (variables séparées, assemblées en URI) ----------
  MONGO_HOST: Joi.string().default('localhost'),
  MONGO_PORT: Joi.number().default(27017),
  MONGO_DB: Joi.string().required(),
  MONGO_USER: Joi.string().allow('').default(''),
  MONGO_PASSWORD: Joi.string().allow('').default(''),
  MONGO_AUTH_SOURCE: Joi.string().default('admin'),

  // ---- Authentification -----------------------------------------
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.number().min(60).default(900),
  JWT_REFRESH_TTL: Joi.number().min(3600).default(604800),
  CORS_ORIGINS: Joi.string().default('http://localhost:8081,http://localhost:19006'),

  // ---- Stockage des fichiers PDF (volume) ---------------------------
  UPLOAD_DIR: Joi.string().default('uploads'),
  MAX_UPLOAD_MB: Joi.number().min(1).max(500).default(50),
});
