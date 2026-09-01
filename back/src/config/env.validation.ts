import * as Joi from 'joi';

/**
 * Validation du fichier `.env` au démarrage.
 * L'application refuse de démarrer si la configuration est invalide
 * ou incomplète (fail-fast).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.number().min(60).default(900),
  JWT_REFRESH_TTL: Joi.number().min(3600).default(604800),
  CORS_ORIGINS: Joi.string().default('http://localhost:8081,http://localhost:19006'),
});
