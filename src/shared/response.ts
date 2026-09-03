import { Response } from 'express';

export function sendError(res: Response, status: number, message: string, code: string) {
  return res.status(status).json({ error: message, code });
}
