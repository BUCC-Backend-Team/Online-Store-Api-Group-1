import { Request, Response } from 'express';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import logger from '@src/common/utils/logger';
import {
  ICreateProductInput,
  IUpdateProductInput,
  IListProductsQuery,
} from '@src/models/Product.model';
import ProductRepo from '@src/repos/ProductRepo';
import productCache from '@src/repos/productCache';
import ApiError from '@src/common/utils/errors';

// GET /api/product — public, paginated, Redis-cached.
export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = req.validatedQuery as unknown as IListProductsQuery;
  const result = await productCache.list(page, limit);
  res.status(HttpStatusCodes.OK).json({ status: 'success', ...result });
}

// GET /api/product/:id — public, Redis-cached.
export async function getById(req: Request, res: Response): Promise<void> {
  const product = await productCache.getById(String(req.params.id));
  if (!product) {
    throw new ApiError(HttpStatusCodes.NOT_FOUND, 'Product not found');
  }
  res.status(HttpStatusCodes.OK).json({ status: 'success', product });
}

// POST /api/product — admin.
export async function create(req: Request, res: Response): Promise<void> {
  const { name, description, price, stock } = req.body as ICreateProductInput;
  const product = await ProductRepo.create(
    name,
    description ?? null,
    price,
    stock,
  );
  await productCache.invalidateAll();
  logger.info({
    type: 'security',
    event: 'product_created',
    productId: product.id,
    by: req.user!.id,
  });
  res.status(HttpStatusCodes.CREATED).json({ status: 'success', product });
}

// PATCH /api/product/:id — admin.
export async function update(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const fields = req.body as IUpdateProductInput;
  const product = await ProductRepo.update(id, fields);
  if (!product) {
    throw new ApiError(HttpStatusCodes.NOT_FOUND, 'Product not found');
  }
  await productCache.invalidateAll();
  logger.info({
    type: 'security',
    event: 'product_updated',
    productId: id,
    by: req.user!.id,
    fields: Object.keys(fields),
  });
  res.status(HttpStatusCodes.OK).json({ status: 'success', product });
}

// DELETE /api/product/:id — admin.
export async function remove(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const deleted = await ProductRepo.remove(id);
  if (!deleted) {
    throw new ApiError(HttpStatusCodes.NOT_FOUND, 'Product not found');
  }
  await productCache.invalidateAll();
  logger.info({
    type: 'security',
    event: 'product_deleted',
    productId: id,
    by: req.user!.id,
  });
  res.status(HttpStatusCodes.OK).json({ status: 'success' });
}
