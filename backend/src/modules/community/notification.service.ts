import type { ListNotificationsResult, CreateNotificationResult, MarkAllNotificationsReadResult, MarkNotificationReadResult, DeleteNotificationResult } from './community.types';
import { prisma } from '../../database/prisma';

const ownerWhere = (userId: string, organizationId: string): { userId: string; organizationId: string } => ({ userId, organizationId });

export async function listNotifications(userId: string, organizationId: string, page: number, limit: number): ListNotificationsResult {
  const where = ownerWhere(userId, organizationId);
  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.notification.count({ where }), prisma.notification.count({ where: { ...where, read: false } }),
  ]);
  return { items, total, unreadCount };
}
export async function createNotification(userId: string, organizationId: string, message: string): CreateNotificationResult { return prisma.notification.create({ data: { userId, organizationId, message } }); }
export async function markAllNotificationsRead(userId: string, organizationId: string): MarkAllNotificationsReadResult { return prisma.notification.updateMany({ where: ownerWhere(userId, organizationId), data: { read: true } }); }
export async function markNotificationRead(id: number, userId: string, organizationId: string): MarkNotificationReadResult { const item = await prisma.notification.findFirst({ where: { id, ...ownerWhere(userId, organizationId) } }); if (!item) return null; return prisma.notification.update({ where: { id }, data: { read: true } }); }
export async function deleteNotification(id: number, userId: string, organizationId: string): DeleteNotificationResult { const item = await prisma.notification.findFirst({ where: { id, ...ownerWhere(userId, organizationId) } }); if (!item) return false; await prisma.notification.delete({ where: { id } }); return true; }
