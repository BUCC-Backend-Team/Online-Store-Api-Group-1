import bcrypt from 'bcryptjs';

import EnvVars from '@src/common/constants/env';
import logger from '@src/common/utils/logger';
import db from '@src/config/db';
import UserRepo from './UserRepo';

// Create or refresh the env-configured admin account. Admins never sign up their credentials come from the environment.
export async function ensureAdminUser(): Promise<void> {
  const { Name, Email, Password } = EnvVars.Admin;
  const passwordHash = await bcrypt.hash(Password, 10);
  const existing = await UserRepo.getByEmail(Email);

  if (!existing) {
    await UserRepo.create(Name, Email, passwordHash, 'admin');
    logger.imp(`Admin account created: ${Email}`);
  } else if (existing.role !== 'admin') {
    // Promote + reset password if someone signed up with the admin email.
    await db.pool.query(
      "UPDATE users SET role = 'admin', password_hash = $2 WHERE id = $1",
      [existing.id, passwordHash],
    );
    logger.imp(`Admin account promoted: ${Email}`);
  }
}

export default { ensureAdminUser } as const;
