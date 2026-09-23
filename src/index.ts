import express from 'express';
import type { Request, Response } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { rateLimiter } from './middleware/rateLimitMiddleware.js';
import { structuredLogger } from './middleware/loggerMiddleware.js';

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Secure HTTP headers with Helmet (must be first)
app.use(helmet());

// 2. Structured Logging Middleware (for correlation IDs & request tracing)
app.use(structuredLogger);

// 3. Parse incoming JSON request bodies & cookies
app.use(express.json());
app.use(cookieParser());

// 4. Apply Redis rate limiter globally (e.g., 100 requests per 60 seconds)
app.use(rateLimiter(100, 60));

// 5. Register Feature Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Health check endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ message: 'Online Store API is running successfully!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});