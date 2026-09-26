import redis from '@src/config/redis';
import logger from '@src/common/utils/logger';
import { IProduct } from '@src/models/Product.model';
import * as ProductRepo from './ProductRepo';

const LIST_TTL_SECONDS = 300; // staleness safety net
const ITEM_TTL_SECONDS = 300;

const listKey = (page: number, limit: number) => `product:list:${page}:${limit}`;
const itemKey = (id: string) => `product:${id}`;

// Cache-aside wrapper for the paginated product list.
export async function list(
  page: number,
  limit: number,
): Promise<{ products: IProduct[]; total: number; page: number; pages: number }> {
  const key = listKey(page, limit);
  try {
    const cached = await redis.client.get(key);
    if (cached) {
      logger.info({ type: 'cache', key, result: 'hit' });
      return JSON.parse(cached) as Awaited<
        ReturnType<typeof ProductRepo.list>
      >;
    }
  } catch {
    logger.warn({ type: 'cache', key, result: 'read_failed' });
  }

  const result = await ProductRepo.list(page, limit);
  logger.info({ type: 'cache', key, result: 'miss' });
  try {
    await redis.client.set(key, JSON.stringify(result), {
      EX: LIST_TTL_SECONDS,
    });
  } catch {
    logger.warn({ type: 'cache', key, result: 'write_failed' });
  }
  return result;
}

// Cache-aside wrapper for a single product.
export async function getById(id: string): Promise<IProduct | null> {
  const key = itemKey(id);
  try {
    const cached = await redis.client.get(key);
    if (cached) {
      logger.info({ type: 'cache', key, result: 'hit' });
      return JSON.parse(cached) as IProduct;
    }
  } catch {
    logger.warn({ type: 'cache', key, result: 'read_failed' });
  }

  const product = await ProductRepo.getById(id);
  logger.info({
    type: 'cache',
    key,
    result: product ? 'miss' : 'miss_null',
  });
  if (product) {
    try {
      await redis.client.set(key, JSON.stringify(product), {
        EX: ITEM_TTL_SECONDS,
      });
    } catch {
      logger.warn({ type: 'cache', key, result: 'write_failed' });
    }
  }
  return product;
}

// Invalidate every cached product list and item. Called on any product write.
// SCAN is used instead of KEYS so it does not block Redis.
export async function invalidateAll(): Promise<void> {
  const patterns = ['product:list:*', 'product:*'];
  let deleted = 0;
  try {
    for (const pattern of patterns) {
      for await (const key of redis.client.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      })) {
        await redis.client.del(key);
        deleted++;
      }
    }
    logger.info({
      type: 'cache',
      event: 'invalidated',
      keys: deleted,
    });
  } catch {
    logger.warn({ type: 'cache', event: 'invalidate_failed', keys: deleted });
  }
}

export default { list, getById, invalidateAll };
