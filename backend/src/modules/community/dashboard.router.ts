import { Router } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import { sendSuccess } from '../../shared/response';
import { ValidationError } from '../../shared/errors';
import { getDashboardRange, getDashboardStats, getDashboardYearBounds } from './dashboard.service';

export const dashboardRouter = Router();
dashboardRouter.get('/stats', asyncHandler(async (req, res) => {
  const year = Number(req.query.year ?? new Date().getFullYear());
  if (!Number.isInteger(year) || year < 1900 || year > 2100) throw new ValidationError('Geçersiz yıl');
  sendSuccess(res, await getDashboardStats(year, req.user!.orgId));
}));
dashboardRouter.get('/range', asyncHandler(async (req, res) => {
  const bounds = await getDashboardYearBounds(req.user!.orgId);
  const start = Number(req.query.startYear ?? bounds.minYear);
  const end = Number(req.query.endYear ?? Math.max(bounds.maxYear, new Date().getFullYear()));
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1900 || end > 2100 || end < start || end - start > 100) {
    throw new ValidationError('Geçersiz yıl aralığı');
  }
  sendSuccess(res, await getDashboardRange(start, end, req.user!.orgId));
}));
