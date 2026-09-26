import redis from '@src/config/redis';
import logger from '@src/common/utils/logger';
import { IProduct } from '@src/models/Product.model';
import * as ProductRepo from './ProductRepo';

const LIST_TTL_SECONDS = 300; // staleness safety net
const ITEM_TTL_SECONDS = 300;

const listKey = (page: number, limit: number) => `product:list:${page}:${limit}`;
const itemKey = (id: string) => `product:${id}`;

type ListResult = {
  products: IProduct[];
  total: number;
  page: number;
  pages: number;
};

// GET a cached value; null on miss OR any Redis failure (falls back to DB).
async function cacheGet(key: string): Promise<string | null> {
  try {
    await redis.ensureConnected();
    return await redis.client.get(key);
  } catch {
    logger.warn({ type: 'cache', key, result: 'read_failed' });
    return null;
  }
}

// SET a cached value; failures are logged and ignored.
async function cacheSet(
  key: string,
  value: string,
  ttl: number,
): Promise<void> {
  try {
    await redis.ensureConnected();
    await redis.client.set(key, value, { EX: ttl });
  } catch {
    logger.warn({ type: 'cache', key, result: 'write_failed' });
  }
}

// Cache-aside wrapper for the paginated product list. Always falls back to
// the DB when Redis is unavailable.
export async function list(
  page: number,
  limit: number,
): Promise<ListResult> {
  const key = listKey(page, limit);

  const cached = await cacheGet(key);
  if (cached) {
    logger.info({ type: 'cache', key, result: 'hit' });
    return JSON.parse(cached) as ListResult;
  }

  const result = await ProductRepo.list(page, limit);
  logger.info({ type: 'cache', key, result: 'miss' });
  await cacheSet(key, JSON.stringify(result), LIST_TTL_SECONDS);
  return result;
}

// Cache-aside wrapper for a single product.
export async function getById(id: string): Promise<IProduct | null> {
  const key = itemKey(id);

  const cached = await cacheGet(key);
  if (cached) {
    logger.info({ type: 'cache', key, result: 'hit' });
    return JSON.parse(cached) as IProduct;
  }

  const product = await ProductRepo.getById(id);
  logger.info({
    type: 'cache',
    key,
    result: product ? 'miss' : 'miss_null',
  });
  if (product) {
    await cacheSet(key, JSON.stringify(product), ITEM_TTL_SECONDS);
  }
  return product;
}

// Invalidate every cached product list and item. Called on any product write.
// SCAN is used instead of KEYS so it does not block Redis. Failures leave the
// 5-minute TTL as the fallback staleness bound.
export async function invalidateAll(): Promise<void> {
  const patterns = ['product:list:*', 'product:*'];
  let deleted = 0;
  try {
    await redis.ensureConnected();
    for (const pattern of patterns) {
      for await (const key of redis.client.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      })) {
        await redis.client.del(key);
        deleted++;
      }
    }
    logger.info({ type: 'cache', event: 'invalidated', keys: deleted });
  } catch {
    logger.warn({ type: 'cache', event: 'invalidate_failed', keys: deleted });
  }
}

export default { list, getById, invalidateAll };
