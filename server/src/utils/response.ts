/**
 * response.ts — uniform success envelopes for API responses.
 */
import type { Response } from 'express';

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: ApiMeta;
}

export function ok<T>(res: Response, data: T, meta?: ApiMeta): Response {
  const body: ApiEnvelope<T> = meta ? { data, meta } : { data };
  return res.status(200).json(body);
}

export function created<T>(res: Response, data: T, meta?: ApiMeta): Response {
  const body: ApiEnvelope<T> = meta ? { data, meta } : { data };
  return res.status(201).json(body);
}

export function noContent(res: Response): Response {
  return res.status(204).end();
}

/** Build pagination meta from a total row count. */
export function pagination(page: number, pageSize: number, total: number): ApiMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0
  };
}
