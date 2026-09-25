import type { Request, Response, NextFunction } from 'express';

// Validates the product creation payload (admin)
export const validateProduct = (req: Request, res: Response, next: NextFunction): void => {
  const { name, sku, price, stock } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '' || name.length > 200) {
    res.status(400).json({ success: false, message: 'name is required (string, max 200 chars).' });
    return;
  }

  if (!sku || typeof sku !== 'string' || sku.trim() === '' || sku.length > 100) {
    res.status(400).json({ success: false, message: 'sku is required (string, max 100 chars).' });
    return;
  }

  if (typeof price !== 'number' || price <= 0) {
    res.status(400).json({ success: false, message: 'price is required and must be a positive number.' });
    return;
  }

  if (!Number.isInteger(stock) || stock < 0) {
    res.status(400).json({ success: false, message: 'stock is required and must be a non-negative integer.' });
    return;
  }

  next();
};
