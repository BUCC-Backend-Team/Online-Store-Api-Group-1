import jetEnv, { bool, num, str } from 'jet-env';
import tspo from 'tspo';

// Must match the names of the ".env" files.
export const NodeEnvs = {
  DEV: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

// Optional string (missing/empty allowed, e.g. no Redis password).
const optStr =
  (v: unknown): v is string | undefined =>
  v === undefined || typeof v === 'string';

const EnvVars = jetEnv({
  NodeEnv: (v) => tspo.isValue(NodeEnvs, v),
  Port: num,
  Db: {
    Host: str,
    Port: num,
    User: str,
    Password: str,
    Name: str,
    Ssl: bool,
  },
  Redis: {
    Host: str,
    Port: num,
    Username: optStr,
    Password: optStr,
    Db: num,
  },
  Jwt: {
    AccessSecret: str,
    RefreshSecret: str,
    AccessExpiresIn: str,
    RefreshExpiresInDays: num,
  },
  Admin: {
    Name: str,
    Email: str,
    Password: str,
  },
});

export default EnvVars;
