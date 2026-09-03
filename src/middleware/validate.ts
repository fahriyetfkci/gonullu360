import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

type RequestShape = { body?: unknown; query?: unknown; params?: unknown };

export function validate<TSchema extends z.ZodType<RequestShape>>(schema: TSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!result.success) return next(result.error);
    if (result.data.body !== undefined) req.body = result.data.body;
    if (result.data.query !== undefined) req.query = result.data.query as Request['query'];
    if (result.data.params !== undefined) req.params = result.data.params as Request['params'];
    next();
  };
}
