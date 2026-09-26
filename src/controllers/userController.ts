import { Request, Response } from 'express';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import logger from '@src/common/utils/logger';
import { IUpdateMeInput, toPublicUser } from '@src/models/User.model';
import UserRepo from '@src/repos/UserRepo';
import tokenRepo from '@src/repos/tokenRepo';
import ApiError from '@src/common/utils/errors';

// GET /api/users/me
export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await UserRepo.getById(req.user!.id);
  if (!user) {
    throw new ApiError(HttpStatusCodes.NOT_FOUND, 'User not found');
  }
  res.status(HttpStatusCodes.OK).json({ user: toPublicUser(user) });
}

// PATCH /api/users/me — body already validated by middleware.
export async function updateMe(req: Request, res: Response): Promise<void> {
  const fields = req.body as IUpdateMeInput;
  if (fields.email && (await UserRepo.getByEmail(fields.email))) {
    logger.warn({
      type: 'security',
      event: 'update_email_conflict',
      userId: req.user!.id,
    });
    throw new ApiError(HttpStatusCodes.CONFLICT, 'Email already in use');
  }
  const user = await UserRepo.updateProfile(req.user!.id, fields);
  if (!user) {
    throw new ApiError(HttpStatusCodes.NOT_FOUND, 'User not found');
  }
  res.status(HttpStatusCodes.OK).json({ user: toPublicUser(user) });
}

// GET /api/users (admin)
export async function getAll(_: Request, res: Response): Promise<void> {
  const users = (await UserRepo.getAll()).map(toPublicUser);
  res.status(HttpStatusCodes.OK).json({ users });
}

// GET /api/users/:id (admin)
export async function getById(req: Request, res: Response): Promise<void> {
  const user = await UserRepo.getById(String(req.params.id));
  if (!user) {
    throw new ApiError(HttpStatusCodes.NOT_FOUND, 'User not found');
  }
  res.status(HttpStatusCodes.OK).json({ user: toPublicUser(user) });
}

// DELETE /api/users/:id (admin)
export async function remove(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  if (id === req.user!.id) {
    logger.warn({
      type: 'security',
      event: 'admin_self_delete_blocked',
      userId: id,
    });
    throw new ApiError(
      HttpStatusCodes.BAD_REQUEST,
      'Admins cannot delete themselves',
    );
  }
  const deleted = await UserRepo.remove(id);
  if (!deleted) {
    throw new ApiError(HttpStatusCodes.NOT_FOUND, 'User not found');
  }
  await tokenRepo.revokeAllForUser(id);
  logger.warn({
    type: 'security',
    event: 'user_deleted',
    userId: id,
    deletedBy: req.user!.id,
  });
  res.status(HttpStatusCodes.OK).json({ status: 'success' });
}
