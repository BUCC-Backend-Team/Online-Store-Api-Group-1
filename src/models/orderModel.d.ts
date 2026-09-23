export interface CartItem {
    productId: number;
    quantity: number;
}
export declare const createOrder: (userId: number, items: CartItem[]) => Promise<any>;
export declare const getOrdersByUserId: (userId: number) => Promise<any[]>;
//# sourceMappingURL=orderModel.d.ts.map