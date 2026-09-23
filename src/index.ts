import express from 'express';
import type { Request, Response } from 'express';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import { rateLimiter } from './middleware/rateLimitMiddleware.js';
import { structuredLogger } from './middleware/loggerMiddleware.js';

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Structured Logging Middleware (should be first to track all requests)
app.use(structuredLogger);

// 2. Middleware to parse incoming JSON payloads
app.use(express.json());

// 3. Apply Redis rate limiter globally
app.use(rateLimiter(100, 60));

// 4. Register your feature routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Health check route
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ message: 'Online Store API is running successfully!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});