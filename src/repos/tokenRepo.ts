import { randomUUID } from 'crypto';

import redis from '@src/config/redis';
import EnvVars from '@src/common/constants/env';

const key = (jti: string) => `auth:refresh:${jti}`;

const ttlSeconds = () => EnvVars.Jwt.RefreshExpiresInDays * 24 * 60 * 60;

// Store a refresh token jti -> userId. Called at login/refresh.
export async function store(jti: string, userId: string): Promise<void> {
  await redis.client.set(key(jti), userId, { EX: ttlSeconds() });
}

// Check a refresh token jti exists (i.e. was not revoked).
export async function exists(jti: string): Promise<boolean> {
  return (await redis.client.get(key(jti))) !== null;
}

// Revoke a refresh token jti. Used on logout and token rotation.
export async function revoke(jti: string): Promise<void> {
  await redis.client.del(key(jti));
}

// Revoke every refresh token of a user. Used on delete-account flows.
export async function revokeAllForUser(userId: string): Promise<void> {
  const keys = await redis.client.keys('auth:refresh:*');
  for (const k of keys) {
    if ((await redis.client.get(k)) === userId) {
      await redis.client.del(k);
    }
  }
}

// New refresh token id.
export function newJti(): string {
  return randomUUID();
}

export default { store, exists, revoke, revokeAllForUser, newJti } as const;
