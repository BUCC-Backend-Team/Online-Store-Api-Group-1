import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    if (fallback !== undefined) {
      console.warn(`[env] ${name} not set — using insecure default (dev only!)`);
      return fallback;
    }
    console.error(`[env] Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === '' ? undefined : value;
}

export const isProd = process.env.NODE_ENV === 'production';

// ---- Server ----
export const PORT = parseInt(process.env.PORT || '3000', 10);
export const TRUST_PROXY = process.env.TRUST_PROXY === 'true';

// ---- JWT ----
// Fail fast in production; allow insecure defaults only in development.
export const JWT_ACCESS_SECRET = isProd
  ? required('JWT_ACCESS_SECRET')
  : required('JWT_ACCESS_SECRET', 'dev-only-access-secret');
export const JWT_REFRESH_SECRET = isProd
  ? required('JWT_REFRESH_SECRET')
  : required('JWT_REFRESH_SECRET', 'dev-only-refresh-secret');

// ---- Database ----
export const DB_HOST = optional('DB_HOST');
export const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
export const DB_USER = optional('DB_USER');
export const DB_PASSWORD = optional('DB_PASSWORD');
export const DB_NAME = optional('DB_NAME');
export const DATABASE_URL = optional('DATABASE_URL');

// ---- Redis ----
export const REDIS_URL = optional('REDIS_URL');

// ---- Rate limiting ----
export const AUTH_RATE_LIMIT_WINDOW_MS = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10);
export const AUTH_RATE_LIMIT_MAX = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10);
export const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
export const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

// ---- Account lockout ----
export const LOCKOUT_MAX_ATTEMPTS = parseInt(process.env.LOCKOUT_MAX_ATTEMPTS || '5', 10);
export const LOCKOUT_WINDOW_SECONDS = parseInt(process.env.LOCKOUT_WINDOW_SECONDS || '900', 10);

// ---- CORS ----
export const CORS_ORIGIN = optional('CORS_ORIGIN'); // comma-separated allowlist
