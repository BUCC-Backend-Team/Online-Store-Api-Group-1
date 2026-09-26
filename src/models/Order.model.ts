import { z } from 'zod';

export const OrderStatuses = {
  PENDING: 'pending',
  PAID: 'paid',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = (typeof OrderStatuses)[keyof typeof OrderStatuses];

// An order row.
export interface IOrder {
  id: string;
  userId: string;
  status: OrderStatus;
  total: string;
  createdAt: Date;
  updatedAt: Date;
}

// A line item; unitPrice is the snapshot from placement time.
export interface IOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  unitPrice: string;
  quantity: number;
}

// Order with its items (what the API returns).
export interface IOrderWithItems extends IOrder {
  items: IOrderItem[];
}

// Body for POST /api/orders/:id/status (admin).
export const UpdateOrderStatusSchema = z.object({
  status: z.literal(OrderStatuses.PAID, {
    message: "Status must be 'paid' (use /cancel for cancellations)",
  }),
});

export type IUpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;

// Query for GET /api/orders (paginated like products).
export const ListOrdersQuerySchema = z.object({
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

export type IListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;

// Legal transitions: pending -> paid | cancelled, paid -> cancelled.
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: [OrderStatuses.PAID, OrderStatuses.CANCELLED],
  paid: [OrderStatuses.CANCELLED],
  cancelled: [],
};

// Whether an order may move from `from` to `to`.
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
