import { Response } from 'express';
import { getDashboardRange, getDashboardStats, getDashboardYearBounds } from '../db/dashboardService';
import { OrganizationRequest } from '../middleware/organization';

export async function range(req: OrganizationRequest, res: Response) { const bounds = await getDashboardYearBounds(req.organizationId!); const startYear = Number(req.query.startYear ?? bounds.minYear); const endYear = Number(req.query.endYear ?? bounds.maxYear); if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || startYear < 1900 || endYear > 2100 || startYear > endYear || endYear - startYear > 100) return res.status(400).json({ error: 'Geçerli ve en fazla 100 yıllık bir tarih aralığı girilmelidir' }); return res.json(await getDashboardRange(startYear, endYear, req.organizationId!)); }
export async function stats(req: OrganizationRequest, res: Response) { const year = req.query.year ? Number(req.query.year) : new Date().getFullYear(); if (!Number.isInteger(year) || year < 2000 || year > 2100) return res.status(400).json({ error: 'year 2000 ile 2100 arasında olmalıdır' }); return res.json(await getDashboardStats(year, req.organizationId!)); }
