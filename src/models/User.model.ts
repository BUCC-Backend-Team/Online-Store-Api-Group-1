import { z } from 'zod';

// User roles.
export const UserRoles = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

// A row in the users table.
export interface IUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

// Public shape returned by the API.
export type IPublicUser = Omit<IUser, 'passwordHash'>;

export function toPublicUser(user: IUser): IPublicUser {
  const { passwordHash: _ph, ...publicUser } = user;
  return publicUser;
}

// ---- Validation ----

export const SignupSchema = z
  .object({
    name: z.string().min(1).max(100),
    email: z.string().email().max(255),
    password: z.string().min(8).max(72),
    passwordConfirm: z.string().min(8).max(72),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  });

export type ISignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(72),
});

export type ILoginInput = z.infer<typeof LoginSchema>;

export const UpdateMeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
});

export type IUpdateMeInput = z.infer<typeof UpdateMeSchema>;
