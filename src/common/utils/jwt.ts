import jwt from 'jsonwebtoken';

import EnvVars from '@src/common/constants/env';

const ACCESS_OPTS = {
  expiresIn: EnvVars.Jwt.AccessExpiresIn as jwt.SignOptions['expiresIn'],
};

const REFRESH_OPTS = {
  expiresIn: `${EnvVars.Jwt.RefreshExpiresInDays}d` as jwt.SignOptions['expiresIn'],
};

export interface IAccessTokenPayload {
  sub: string;
  role: 'user' | 'admin';
}

export interface IRefreshTokenPayload {
  sub: string;
  jti: string;
}

export function signAccessToken(payload: IAccessTokenPayload): string {
  return jwt.sign(payload, EnvVars.Jwt.AccessSecret, ACCESS_OPTS);
}

export function signRefreshToken(payload: IRefreshTokenPayload): string {
  return jwt.sign(payload, EnvVars.Jwt.RefreshSecret, REFRESH_OPTS);
}

export function verifyAccessToken(token: string): IAccessTokenPayload {
  return jwt.verify(token, EnvVars.Jwt.AccessSecret) as IAccessTokenPayload;
}

export function verifyRefreshToken(token: string): IRefreshTokenPayload {
  return jwt.verify(token, EnvVars.Jwt.RefreshSecret) as IRefreshTokenPayload;
}

export function decodeRefreshToken(token: string): IRefreshTokenPayload | null {
  return (jwt.decode(token) as IRefreshTokenPayload | null) ?? null;
}
