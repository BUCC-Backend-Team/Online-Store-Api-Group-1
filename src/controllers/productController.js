import {} from 'express';
import { getFilteredProducts, createProduct } from '../models/productModel.js';
export const getProducts = async (req, res) => {
    try {
        const { search, minPrice, maxPrice, page = '1', limit = '10' } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        const offset = (pageNum - 1) * limitNum;
        const parsedMinPrice = minPrice ? parseFloat(minPrice) : undefined;
        const parsedMaxPrice = maxPrice ? parseFloat(maxPrice) : undefined;
        const searchStr = search ? search : undefined;
        const { products, total } = await getFilteredProducts(searchStr, parsedMinPrice, parsedMaxPrice, limitNum, offset);
        res.status(200).json({
            success: true,
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum) || 1,
            totalProducts: total,
            products,
        });
    }
    catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
export const addProduct = async (req, res) => {
    try {
        const { name, sku, price, stock } = req.body;
        if (!name || price === undefined || stock === undefined) {
            return res.status(400).json({ success: false, message: 'Missing required fields (name, price, stock)' });
        }
        const newProduct = await createProduct(name, sku, Number(price), Number(stock));
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product: newProduct,
        });
    }
    catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
//# sourceMappingURL=productController.js.map