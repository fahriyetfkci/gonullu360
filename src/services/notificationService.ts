import prisma from '../db/prisma';

const ownerWhere = (userId: string, organizationId: string) => ({ userId, organizationId });

export async function listNotifications(userId: string, organizationId: string, page: number, limit: number) {
  const where = ownerWhere(userId, organizationId);
  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.notification.count({ where }), prisma.notification.count({ where: { ...where, read: false } }),
  ]);
  return { items, total, unreadCount };
}
export async function createNotification(userId: string, organizationId: string, message: string) { return prisma.notification.create({ data: { userId, organizationId, message } }); }
export async function markAllNotificationsRead(userId: string, organizationId: string) { return prisma.notification.updateMany({ where: ownerWhere(userId, organizationId), data: { read: true } }); }
export async function markNotificationRead(id: number, userId: string, organizationId: string) { const item = await prisma.notification.findFirst({ where: { id, ...ownerWhere(userId, organizationId) } }); if (!item) return null; return prisma.notification.update({ where: { id }, data: { read: true } }); }
export async function deleteNotification(id: number, userId: string, organizationId: string) { const item = await prisma.notification.findFirst({ where: { id, ...ownerWhere(userId, organizationId) } }); if (!item) return false; await prisma.notification.delete({ where: { id } }); return true; }
