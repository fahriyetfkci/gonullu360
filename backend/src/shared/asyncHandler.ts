import { NextFunction, Request, RequestHandler, Response } from 'express';

// Express 4 does not forward rejected promises automatically.
export function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => { void Promise.resolve(handler(req, res, next)).catch(next); };
}
