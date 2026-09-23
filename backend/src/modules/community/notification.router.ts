import { Router } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import { sendSuccess } from '../../shared/response';
import { NotFoundError, ValidationError } from '../../shared/errors';
import * as service from './notification.service';

export const notificationRouter = Router();
notificationRouter.get('/', asyncHandler(async (req, res) => {
  const page = Number(req.query.page ?? 1), limit = Number(req.query.limit ?? 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new ValidationError('Geçersiz sayfalama');
  const result = await service.listNotifications(req.user!.id, req.user!.orgId, page, limit);
  sendSuccess(res, {
    notifications: result.items.map(item => ({ ...item, read: item.read ? 1 : 0, created_at: item.createdAt })),
    unreadCount: result.unreadCount,
    pagination: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) },
  });
}));
notificationRouter.put('/read-all', asyncHandler(async (req, res) => {
  await service.markAllNotificationsRead(req.user!.id, req.user!.orgId);
  sendSuccess(res, { message: 'Bildirimler okundu' });
}));
notificationRouter.put('/:id/read', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new ValidationError('Geçersiz bildirim');
  if (!await service.markNotificationRead(id, req.user!.id, req.user!.orgId)) throw new NotFoundError('Bildirim bulunamadı');
  sendSuccess(res, { message: 'Bildirim okundu' });
}));
