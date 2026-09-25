export interface Product {
    id?: number;
    name: string;
    sku?: string;
    price: number;
    stock: number;
    created_at?: Date;
}
export declare const createProduct: (name: string, sku: string, price: number, stock: number) => Promise<Product>;
export declare const getAllProducts: () => Promise<Product[]>;
export declare const getFilteredProducts: (search?: string, minPrice?: number, maxPrice?: number, limit?: number, offset?: number) => Promise<{
    products: Product[];
    total: number;
}>;
//# sourceMappingURL=productModel.d.ts.map