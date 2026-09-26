import { z } from 'zod';

// A row in the products table.
export interface IProduct {
  id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

// Body for POST /api/product (admin).
export const CreateProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Product name is required')
    .max(200, 'Product name must be at most 200 characters'),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be at most 2000 characters')
    .optional()
    .nullable(),
  price: z
    .number({ message: 'Price must be a number' })
    .positive('Price must be greater than 0')
    .max(99999999, 'Price is too large'),
  stock: z
    .number({ message: 'Stock must be an integer' })
    .int('Stock must be an integer')
    .min(0, 'Stock cannot be negative')
    .max(999999999, 'Stock is too large'),
});

export type ICreateProductInput = z.infer<typeof CreateProductSchema>;

// Body for PATCH /api/product/:id (admin). All fields optional, at least one.
export const UpdateProductSchema = CreateProductSchema.partial().refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'Provide at least one field to update' },
);

export type IUpdateProductInput = z.infer<typeof UpdateProductSchema>;

// Query for GET /api/product (public, paginated).
export const ListProductsQuerySchema = z.object({
  page: z.coerce
    .number({ message: 'Page must be a number' })
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1),
  limit: z.coerce
    .number({ message: 'Limit must be a number' })
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .default(20),
});

export type IListProductsQuery = z.infer<typeof ListProductsQuerySchema>;

// Id param shared by product and user detail routes.
export const IdParamsSchema = z.object({
  id: z.string().uuid('Invalid product id'),
});
