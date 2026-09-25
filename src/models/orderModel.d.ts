export interface CartItemForCheckout {
    productId: number;
    quantity: number;
    price: number;
}
export declare const createOrderInTransaction: (userId: number, items: CartItemForCheckout[], totalAmount: number) => Promise<any>;
export declare const getOrdersByUserId: (userId: number) => Promise<any[]>;
export declare const getOrderDetailsById: (orderId: number, userId: number, isAdmin: boolean) => Promise<any>;
//# sourceMappingURL=orderModel.d.ts.map