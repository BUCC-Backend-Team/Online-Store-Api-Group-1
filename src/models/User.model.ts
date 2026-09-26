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

// ---- Field rules ----

// Email: standard format, stored lowercase.
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Please provide a valid email address')
  .max(255);

// Password: 8-72 chars with at least one uppercase, one lowercase and one
// digit. 72 is bcrypt's input limit.
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a digit');

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name must be at most 100 characters');

// ---- Validation ----

export const SignupSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  });

export type ISignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(72),
});

export type ILoginInput = z.infer<typeof LoginSchema>;

export const UpdateMeSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: 'Provide at least one field to update (name or email)',
  });

export type IUpdateMeInput = z.infer<typeof UpdateMeSchema>;
