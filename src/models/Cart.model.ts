import { z } from 'zod';

// A row in the cart_items table, joined with product data for display.
export interface ICartItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  // Current catalog price (NOT fixed — only orders snapshot prices).
  price: string;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

// Body for POST /api/cart (add item or merge quantity).
export const AddCartItemSchema = z.object({
  productId: z.string().uuid('Invalid product id'),
  quantity: z
    .number({ message: 'Quantity must be a number' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(999, 'Quantity must be at most 999'),
});

export type IAddCartItemInput = z.infer<typeof AddCartItemSchema>;

// Body for PATCH /api/cart/:itemId.
export const UpdateCartItemSchema = z.object({
  quantity: z
    .number({ message: 'Quantity must be a number' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(999, 'Quantity must be at most 999'),
});

export type IUpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;
