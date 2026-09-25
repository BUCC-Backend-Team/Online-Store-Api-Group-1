import { type Request, type Response } from 'express';
import { getFilteredProducts, createProduct, getProductById } from '../models/productModel.js';
import { redisClient } from '../config/redis.js';

const CACHE_TTL_SECONDS = 60;
const PRODUCTS_CACHE_KEY = 'cache:products:list';

// Build a stable cache key from the querystring
const buildCacheKey = (query: Record<string, unknown>): string => {
  const sorted = Object.keys(query)
    .sort()
    .filter((k) => query[k] !== undefined && query[k] !== '')
    .map((k) => `${k}=${query[k]}`)
    .join('&');
  return `${PRODUCTS_CACHE_KEY}:${sorted || 'all'}`;
};

export const invalidateProductCache = async (): Promise<void> => {
  try {
    // SCAN instead of KEYS: non-blocking, safe for production Redis
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', `${PRODUCTS_CACHE_KEY}:*`, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.error('Cache invalidation error:', err);
  }
};

const serializeProduct = (p: any) => ({ ...p, price: Number(p.price) });

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { search, minPrice, maxPrice, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const parsedMinPrice = minPrice !== undefined ? Number(minPrice) : undefined;
    const parsedMaxPrice = maxPrice !== undefined ? Number(maxPrice) : undefined;

    if (minPrice !== undefined && (isNaN(parsedMinPrice!) || parsedMinPrice! < 0)) {
      return res.status(400).json({ success: false, message: 'minPrice must be a non-negative number.' });
    }
    if (maxPrice !== undefined && (isNaN(parsedMaxPrice!) || parsedMaxPrice! < 0)) {
      return res.status(400).json({ success: false, message: 'maxPrice must be a non-negative number.' });
    }

    const cacheKey = buildCacheKey({ search, minPrice, maxPrice, page: pageNum, limit: limitNum });

    // Cache-aside: serve from Redis when possible
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.status(200).json(JSON.parse(cached));
        return;
      }
    } catch (err) {
      console.error('Cache read error:', err);
    }

    const { products, total } = await getFilteredProducts({
      search: search as string | undefined,
      minPrice: parsedMinPrice,
      maxPrice: parsedMaxPrice,
      limit: limitNum,
      offset
    });

    const payload = {
      success: true,
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      totalProducts: total,
      products: products.map(serializeProduct)
    };

    res.setHeader('X-Cache', 'MISS');
    try {
      await redisClient.set(cacheKey, JSON.stringify(payload), 'EX', CACHE_TTL_SECONDS);
    } catch (err) {
      console.error('Cache write error:', err);
    }

    res.status(200).json(payload);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid product id.' });
    }

    const product = await getProductById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.status(200).json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

export const addProduct = async (req: Request, res: Response) => {
  try {
    const { name, sku, price, stock } = req.body;

    const newProduct = await createProduct(name.trim(), sku.trim(), price, stock);
    await invalidateProductCache();

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product: serializeProduct(newProduct)
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ success: false, message: 'A product with this SKU already exists.' });
    }
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
