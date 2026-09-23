// Validate Product Creation payload
const validateProduct = (req, res, next) => {
    const { name, sku, price, stock } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ error: 'Validation Error: Product name is required and must be a string.' });
        return;
    }
    if (!sku || typeof sku !== 'string' || sku.trim() === '') {
        res.status(400).json({ error: 'Validation Error: SKU is required and must be a string.' });
        return;
    }
    if (price === undefined || typeof price !== 'number' || price < 0) {
        res.status(400).json({ error: 'Validation Error: Price is required and must be a positive number.' });
        return;
    }
    if (stock === undefined || typeof stock !== 'number' || stock < 0) {
        res.status(400).json({ error: 'Validation Error: Stock is required and must be a non-negative number.' });
        return;
    }
    next();
};
export { validateProduct };
//# sourceMappingURL=validationMiddleware.js.map