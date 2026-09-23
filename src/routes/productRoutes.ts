import { Router } from 'express';
import type { Response } from 'express';
import pool from '../config/db.js';
import { verifyToken, requireRole, type AuthRequest } from '../middleware/authMiddleware.js';
import { validateProduct } from '../middleware/validationMiddleware.js';

const router = Router();

// GET all products (Public route)
router.get('/', async (_req, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM products');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST a new product (Protected: ADMIN ONLY + Input Validation)
router.post(
  '/', 
  verifyToken, 
  requireRole('admin'), 
  validateProduct, 
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, sku, price, stock } = req.body;

      const result = await pool.query(
        'INSERT INTO products (name, sku, price, stock) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, sku, price, stock]
      );

      res.status(201).json({
        message: 'Product created successfully',
        product: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

export default router;