/**
 * jwt.ts — sign and verify JSON Web Tokens.
 */
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '@config/env';
import { unauthorized } from '@utils/errors';
import type { UserRole } from '@config/constants';

export interface TokenPayload {
  sub: number;
  username: string;
  role: UserRole;
}

export function signToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn']
  };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === 'string' || typeof decoded.sub !== 'number') {
      throw new Error('Malformed token payload');
    }
    return {
      sub: decoded.sub,
      username: String(decoded.username ?? ''),
      role: (decoded.role as UserRole) ?? 'user'
    };
  } catch {
    throw unauthorized('Invalid or expired token');
  }
}
