import express from 'express';
import type { Request, Response } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import { structuredLogger } from './middleware/loggerMiddleware.js';
import { lockoutMiddleware } from './middleware/lockoutMiddleware.js';
import { authRateLimiter, generalRateLimiter } from './middleware/rateLimitMiddleware.js';

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Secure HTTP headers with Helmet (must be first)
app.use(helmet());

// 2. Structured Logging Middleware (for correlation IDs & request tracing)
app.use(structuredLogger);

// 3. Parse incoming JSON request bodies & cookies
app.use(express.json());
app.use(cookieParser());

// 4. Apply Mock Redis-backed lockout + strict rate limiting to authentication routes
app.use('/api/auth', lockoutMiddleware, authRateLimiter, authRoutes);

// 5. Register Feature Routes (general rate limiting applied)
app.use('/api/products', generalRateLimiter, productRoutes);
app.use('/api/orders', generalRateLimiter, orderRoutes);
app.use('/api/cart', generalRateLimiter, cartRoutes);

// Health check endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ message: 'Online Store API is running successfully!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});