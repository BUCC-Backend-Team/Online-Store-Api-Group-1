import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import { structuredLogger } from './middleware/loggerMiddleware.js';
import { authRateLimiter, generalRateLimiter } from './middleware/rateLimitMiddleware.js';
import { TRUST_PROXY, CORS_ORIGIN } from './config/env.js';

const app = express();

// Behind a reverse proxy (nginx, Render, Railway, Fly.io...), so req.ip is the real client IP
if (TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// 1. Secure HTTP headers with Helmet (must be first)
app.use(helmet());

// 2. CORS (allowlist via CORS_ORIGIN, comma-separated)
const allowedOrigins = CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
app.use(
  cors(
    allowedOrigins && allowedOrigins.length > 0
      ? {
          origin: allowedOrigins,
          credentials: true
        }
      : { credentials: true }
  )
);

// 3. Structured Logging Middleware (for correlation IDs & request tracing)
app.use(structuredLogger);

// 4. Parse incoming JSON request bodies & cookies
app.use(express.json());
app.use(cookieParser());

// 5. Strict rate limiting on authentication routes (brute-forceable)
app.use('/api/auth', authRateLimiter, authRoutes);

// 6. Register Feature Routes (general rate limiting applied)
app.use('/api/products', generalRateLimiter, productRoutes);
app.use('/api/orders', generalRateLimiter, orderRoutes);
app.use('/api/cart', generalRateLimiter, cartRoutes);

// Health check endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ message: 'Online Store API is running successfully!' });
});

// JSON 404 for unknown routes (instead of Express default HTML)
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler: catches JSON parse errors, thrown errors, etc.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // body-parser marks parse failures with type = 'entity.parse.failed'
  const isBodyParseError =
    (typeof err === 'object' && err !== null && (err as any).type === 'entity.parse.failed') ||
    err instanceof SyntaxError;
  if (!isBodyParseError) {
    console.error('Unhandled error:', err);
  }
  if (!res.headersSent) {
    res.status(isBodyParseError ? 400 : 500).json({
      success: false,
      message: isBodyParseError ? 'Invalid JSON body.' : 'Internal server error.'
    });
  }
});

export default app;
